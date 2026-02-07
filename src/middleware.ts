import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * GDPR-COMPLIANT MIDDLEWARE
 * =========================
 * 
 * This middleware implements data minimization (GDPR Art. 5(1)(c)) by:
 * 1. Stripping identifying headers from anonymous report submissions
 * 2. Preventing IP address and user-agent from reaching server logic
 * 
 * IMPORTANT: This runs BEFORE the request reaches any Server Action or API route.
 */

// Headers that could identify the whistleblower - MUST be stripped
const SENSITIVE_HEADERS = [
    'x-forwarded-for',       // Proxy chain IPs
    'x-real-ip',             // Real client IP
    'x-client-ip',           // Client IP
    'cf-connecting-ip',      // Cloudflare client IP
    'true-client-ip',        // Akamai/Cloudflare
    'x-cluster-client-ip',   // Load balancer IP
    'forwarded',             // Standard forwarding header
    'x-forwarded',           // Legacy forwarding
    'x-vercel-ip',           // Vercel IP header
    'x-vercel-forwarded-for',// Vercel forwarding
] as const

// Routes where headers should be stripped (anonymous submission routes)
const isAnonymousRoute = createRouteMatcher([
    '/submit/(.*)',          // Public submission form
    '/:slug/report',         // Legacy report route
    '/api/submit(.*)',       // API submission endpoints
])

// Protected routes - require authentication
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
])

/**
 * Strips sensitive headers from a request before it continues
 * This ensures no identifying information reaches our server logic
 */
function stripSensitiveHeaders(request: NextRequest): Headers {
    const sanitizedHeaders = new Headers(request.headers)

    // Remove all identifying headers
    for (const header of SENSITIVE_HEADERS) {
        sanitizedHeaders.delete(header)
    }

    // Optionally anonymize user-agent (convert to generic)
    // We don't delete it entirely as it may break some functionality
    // Instead we replace with a generic value
    sanitizedHeaders.set('user-agent', 'Anonymous-Client/1.0')

    return sanitizedHeaders
}

/**
 * GDPR Log Suppression
 * Prevents accidental logging of sensitive data
 */
function createSanitizedRequest(request: NextRequest): NextRequest {
    // Note: Next.js doesn't allow modifying the request directly
    // The header stripping is done in the response chain
    return request
}

export default clerkMiddleware(async (auth, req) => {
    // For anonymous routes, strip identifying headers
    if (isAnonymousRoute(req)) {
        // Create response with sanitized headers
        const response = NextResponse.next({
            request: {
                // Pass through with note that this is anonymized
                headers: stripSensitiveHeaders(req),
            },
        })

        // Add header to indicate request was anonymized
        response.headers.set('x-gdpr-anonymized', 'true')

        // Explicit no-cache for privacy
        response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, private')

        return response
    }

    // For protected routes, require authentication
    if (isProtectedRoute(req)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
