'use server'

import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import type { Report, ReportStatus } from '@/lib/supabase/types'
import {
    reportSubmitLimiter,
    checkRateLimit,
    getClientIp,
    ReportSubmissionSchema,
    validateInput,
} from '@/lib/security'

/**
 * SECURITY HARDENED: Submit an anonymous encrypted report
 * ========================================================
 * 
 * SECURITY FEATURES:
 * ✓ Rate limiting (5 requests/minute per IP) - prevents DoS
 * ✓ Input validation via Zod - prevents injection attacks
 * ✓ PGP verification - ensures content is actually encrypted
 * ✓ Parameterized queries via Supabase - prevents SQL injection
 * 
 * This is called by whistleblowers - no authentication required
 */
export async function submitReport(data: {
    tenantId: string
    encryptedContent: string
    encryptedAttachments?: string
}): Promise<{ success: boolean; error?: string }> {

    // ============================================
    // 1. RATE LIMITING - Prevent spam attacks
    // ============================================
    const headersList = await headers()
    const clientIp = getClientIp(headersList)

    try {
        const rateLimit = await checkRateLimit(reportSubmitLimiter, clientIp)

        if (!rateLimit.success) {
            console.warn(`Rate limit exceeded for IP: ${clientIp}`)
            return {
                success: false,
                error: `För många försök. Vänta ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)} sekunder.`,
            }
        }
    } catch (error) {
        // If rate limiter fails (Redis down), log but continue
        // This is a "fail open" approach - we don't want to block legitimate reports
        console.error('Rate limiter error (continuing):', error)
    }

    // ============================================
    // 2. INPUT VALIDATION - Prevent injection
    // ============================================
    const validation = validateInput(ReportSubmissionSchema, data)

    if (!validation.success) {
        console.warn('Input validation failed:', validation.errors)
        return {
            success: false,
            error: 'Ogiltig data. Kontrollera att rapporten är korrekt krypterad.',
        }
    }

    const validatedData = validation.data

    // ============================================
    // 3. VERIFY TENANT EXISTS (Prevent FK errors)
    // ============================================
    const supabase = await createClient()

    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, status')
        .eq('id', validatedData.tenantId)
        .single()

    if (tenantError || !tenant) {
        return { success: false, error: 'Företaget hittades inte.' }
    }

    if (tenant.status !== 'active') {
        return { success: false, error: 'Företaget har inte aktiverat rapportering ännu.' }
    }

    // ============================================
    // 4. INSERT REPORT (Parameterized query)
    // ============================================
    // Supabase uses parameterized queries internally - SQL injection safe
    const { error } = await supabase
        .from('reports')
        .insert({
            tenant_id: validatedData.tenantId,
            encrypted_content: validatedData.encryptedContent,
            encrypted_attachments: validatedData.encryptedAttachments || null,
        })

    if (error) {
        console.error('Failed to submit report:', error)
        return { success: false, error: 'Kunde inte skicka rapporten. Försök igen.' }
    }

    return { success: true }
}

/**
 * Get all reports for the current user's tenant
 */
export async function getReportsForTenant(): Promise<Report[]> {
    const { userId } = await auth()

    if (!userId) {
        return []
    }

    const supabase = await createClient()

    // First get the user's tenant
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', userId)
        .single()

    if (!tenant) {
        return []
    }

    // Then get reports for that tenant
    const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Failed to fetch reports:', error)
        return []
    }

    return reports as Report[]
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
    const { userId } = await auth()

    if (!userId) {
        return null
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

    if (error || !data) {
        return null
    }

    return data as Report
}

/**
 * Update the status of a report
 */
export async function updateReportStatus(
    reportId: string,
    status: ReportStatus
): Promise<{ success: boolean; error?: string }> {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Additional validation: check status is valid
    const validStatuses: ReportStatus[] = ['new', 'read', 'archived', 'closed']
    if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' }
    }

    const updateData: { status: ReportStatus; closed_at?: string } = { status }

    // Set closed_at when marking as closed (GDPR retention)
    if (status === 'closed') {
        updateData.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/reports')
    return { success: true }
}

/**
 * Get report counts by status
 */
export async function getReportCounts(): Promise<{
    new: number
    read: number
    archived: number
    total: number
}> {
    const { userId } = await auth()

    if (!userId) {
        return { new: 0, read: 0, archived: 0, total: 0 }
    }

    const supabase = await createClient()

    // First get the user's tenant
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', userId)
        .single()

    if (!tenant) {
        return { new: 0, read: 0, archived: 0, total: 0 }
    }

    const { data: reports } = await supabase
        .from('reports')
        .select('status')
        .eq('tenant_id', tenant.id)

    if (!reports) {
        return { new: 0, read: 0, archived: 0, total: 0 }
    }

    const counts = {
        new: reports.filter((r: { status: string }) => r.status === 'new').length,
        read: reports.filter((r: { status: string }) => r.status === 'read').length,
        archived: reports.filter((r: { status: string }) => r.status === 'archived').length,
        total: reports.length,
    }

    return counts
}
