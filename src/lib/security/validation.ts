/**
 * INPUT VALIDATION - Zod Schemas
 * ==============================
 * Validates and sanitizes all user input before processing
 * 
 * VULNERABILITIES FIXED:
 * - SQL Injection (Supabase parameterized queries + Zod validation)
 * - Malicious file uploads (strict MIME type validation)
 * - XSS via malformed input
 * - Data corruption via invalid UUIDs
 */

import { z } from 'zod'

// ==========================================
// REPORT SUBMISSION VALIDATION
// ==========================================

/**
 * Allowed file types for attachments
 * 
 * SECURITY: Only allow safe document/image formats
 * BLOCKED: .exe, .js, .html, .php, .sh, etc.
 */
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
] as const

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'] as const

/**
 * Maximum file size: 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Attachment validation schema
 */
export const AttachmentSchema = z.object({
    filename: z
        .string()
        .min(1, 'Filename is required')
        .max(255, 'Filename too long')
        .refine(
            (name) => {
                const ext = name.toLowerCase().substring(name.lastIndexOf('.'))
                return ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])
            },
            {
                message: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
            }
        )
        .refine(
            (name) => !/[<>:"/\\|?*\x00-\x1f]/g.test(name),
            { message: 'Filename contains invalid characters' }
        ),
    mimeType: z.enum(ALLOWED_MIME_TYPES, {
        message: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
    }),
    size: z
        .number()
        .positive('File size must be positive')
        .max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
    /**
     * The encrypted content of the file (base64 PGP encrypted)
     * We only validate it's a non-empty string; content is already encrypted
     */
    encryptedContent: z
        .string()
        .min(1, 'File content is required'),
})

export type ValidatedAttachment = z.infer<typeof AttachmentSchema>

/**
 * Report submission validation schema
 */
export const ReportSubmissionSchema = z.object({
    /**
     * Tenant UUID - must be valid format
     */
    tenantId: z
        .string()
        .uuid('Invalid tenant ID format')
        .min(1, 'Tenant ID is required'),

    /**
     * Encrypted content (PGP armored text)
     * We validate it starts with PGP header to ensure it's actually encrypted
     */
    encryptedContent: z
        .string()
        .min(100, 'Encrypted content too short')
        .max(5 * 1024 * 1024, 'Encrypted content too large (max 5MB)')
        .refine(
            (content) => content.startsWith('-----BEGIN PGP MESSAGE-----'),
            { message: 'Content must be PGP encrypted' }
        ),

    /**
     * Optional encrypted attachments (JSON array of encrypted files)
     */
    encryptedAttachments: z
        .string()
        .max(50 * 1024 * 1024, 'Attachments too large (max 50MB)')
        .optional()
        .nullable(),
})

export type ValidatedReportSubmission = z.infer<typeof ReportSubmissionSchema>

// ==========================================
// TENANT VALIDATION
// ==========================================

/**
 * Slug validation - used in URLs, must be URL-safe
 */
export const SlugSchema = z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must contain only lowercase letters, numbers, and hyphens'
    )

/**
 * Tenant creation schema
 */
export const TenantCreationSchema = z.object({
    name: z
        .string()
        .min(2, 'Company name must be at least 2 characters')
        .max(100, 'Company name must be at most 100 characters')
        .refine(
            (name) => !/[<>]/g.test(name),
            { message: 'Company name contains invalid characters' }
        ),
    slug: SlugSchema,
    contactEmail: z
        .string()
        .email('Invalid email format')
        .max(255, 'Email too long'),
})

export type ValidatedTenantCreation = z.infer<typeof TenantCreationSchema>

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Validate and parse input with error handling
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data)

    if (result.success) {
        return { success: true, data: result.data }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = result.error.issues.map((err: any) =>
        `${String(err.path?.join('.') ?? '')}: ${err.message}`
    )

    return { success: false, errors }
}

/**
 * Validate file before encryption (client-side check)
 */
export function validateFileBeforeUpload(file: File): {
    valid: boolean
    error?: string
} {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
        return {
            valid: false,
            error: `File type not allowed. Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted.`,
        }
    }

    // Check extension
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
        return {
            valid: false,
            error: `File extension not allowed. Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted.`,
        }
    }

    // Check for double extensions (e.g., "file.pdf.exe")
    const parts = file.name.split('.')
    if (parts.length > 2) {
        const suspiciousExt = parts.slice(-2).join('.')
        if (suspiciousExt.includes('exe') || suspiciousExt.includes('js') || suspiciousExt.includes('html')) {
            return {
                valid: false,
                error: 'Suspicious file extension detected',
            }
        }
    }

    return { valid: true }
}
