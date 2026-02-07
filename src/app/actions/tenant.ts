'use server'

import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import type { Tenant } from '@/lib/supabase/types'

/**
 * Get a tenant by their public slug (for anonymous users)
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error || !data) {
        return null
    }

    return data as Tenant
}

/**
 * Get the current user's tenant
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
    const { userId } = await auth()

    if (!userId) {
        return null
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', userId)
        .single()

    if (error || !data) {
        return null
    }

    return data as Tenant
}

/**
 * Create a new tenant during onboarding
 */
export async function createTenant(data: {
    name: string
    slug: string
    contactEmail: string
    publicKey: string
}): Promise<{ success: boolean; error?: string; tenant?: Tenant }> {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: 'Not authenticated' }
    }

    // Check if user already has a tenant
    const existingTenant = await getCurrentTenant()
    if (existingTenant) {
        return { success: false, error: 'You already have a tenant registered' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(data.slug)) {
        return { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
    }

    const supabase = await createClient()

    const { data: tenant, error } = await supabase
        .from('tenants')
        .insert({
            name: data.name,
            slug: data.slug,
            contact_email: data.contactEmail,
            public_key: data.publicKey,
            owner_id: userId,
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'This slug is already taken' }
        }
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true, tenant: tenant as Tenant }
}

/**
 * Update tenant settings
 */
export async function updateTenant(data: {
    name?: string
    contactEmail?: string
}): Promise<{ success: boolean; error?: string }> {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('tenants')
        .update({
            name: data.name,
            contact_email: data.contactEmail,
        })
        .eq('owner_id', userId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Activate a tenant by uploading only the public key
 * Called from /dashboard/setup after private key has been downloaded
 */
export async function activateTenantWithPublicKey(
    publicKey: string
): Promise<{ success: boolean; error?: string }> {
    const { userId } = await auth()

    if (!userId) {
        return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check if tenant exists for this user
    const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', userId)
        .single()

    if (existingTenant) {
        // Update existing tenant with public key and mark as active
        const { error } = await supabase
            .from('tenants')
            .update({
                public_key: publicKey,
                status: 'active',
            })
            .eq('owner_id', userId)

        if (error) {
            return { success: false, error: error.message }
        }
    } else {
        return { success: false, error: 'No tenant found. Please complete onboarding first.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/setup')
    return { success: true }
}
