import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { anonymizeHeaders } from '@/lib/security/anonymize'

/**
 * GDPR-COMPLIANT MIDDLEWARE
 * =========================
 *
 * This middleware implements data minimization (GDPR Art. 5(1)(c)) by:
 * 1. Stripping identifying headers from anonymous report submissions
 * 2. Preventing IP address and user-agent from reaching server logic
 * 3. Forwarding a salted IP hash so the rate limiter still works per client
 *
 * IMPORTANT: This runs BEFORE the request reaches any Server Action or API route.
 * The header logic lives in src/lib/security/anonymize.ts so it can be unit tested.
 */

// Routes where identifying headers are stripped (anonymous submission routes)
const isAnonymousRoute = createRouteMatcher([
    '/submit/(.*)',          // Public submission form
    '/:slug/report',         // Legacy report route
    '/api/submit(.*)',       // API submission endpoints
])

// Protected routes - require authentication
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
])

export default clerkMiddleware(async (auth, req) => {
    // For anonymous routes, strip identifying headers
    if (isAnonymousRoute(req)) {
        // anonymizeHeaders() removes every IP header, replaces the user-agent and
        // sets x-client-hash (HMAC-SHA256 of the IP + IP_HASH_SALT). A client
        // supplied x-client-hash is always discarded.
        const headers = await anonymizeHeaders(req.headers, process.env.IP_HASH_SALT)

        const response = NextResponse.next({
            request: {
                headers,
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
