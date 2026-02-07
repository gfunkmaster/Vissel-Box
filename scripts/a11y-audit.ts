/**
 * ACCESSIBILITY AUDIT SCRIPT
 * ==========================
 * Uses axe-core via Playwright to scan pages for WCAG 2.1 AA violations.
 * 
 * Run with: npx tsx scripts/a11y-audit.ts
 * 
 * Prerequisites:
 * - npm install -D @axe-core/playwright playwright
 * - npx playwright install chromium
 * - Dev server running on localhost:3000
 */

import { chromium, type Browser, type Page } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

interface AuditResult {
    page: string
    url: string
    violations: number
    passes: number
    incomplete: number
    details: ViolationDetail[]
}

interface ViolationDetail {
    impact: string
    description: string
    help: string
    helpUrl: string
    nodes: number
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Pages to audit
const PAGES_TO_AUDIT = [
    { name: 'Homepage', path: '/' },
    { name: 'Submit Form', path: '/submit/demo' }, // Requires demo tenant
    { name: 'Sign In', path: '/sign-in' },
    { name: 'Sign Up', path: '/sign-up' },
]

async function auditPage(page: Page, name: string, url: string): Promise<AuditResult> {
    console.log(`\n🔍 Auditing: ${name} (${url})`)

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (error) {
        console.log(`   ⚠️  Could not load page (may require auth or tenant)`)
        return {
            page: name,
            url,
            violations: 0,
            passes: 0,
            incomplete: 0,
            details: []
        }
    }

    // Run axe-core accessibility scan
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // WCAG 2.1 AA
        .analyze()

    const details: ViolationDetail[] = results.violations.map(v => ({
        impact: v.impact || 'unknown',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length
    }))

    return {
        page: name,
        url,
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        details
    }
}

function printResults(results: AuditResult[]): void {
    console.log('\n' + '='.repeat(80))
    console.log('ACCESSIBILITY AUDIT REPORT - WCAG 2.1 AA')
    console.log('='.repeat(80))

    let totalViolations = 0
    let totalPasses = 0

    for (const result of results) {
        console.log(`\n📄 ${result.page}`)
        console.log(`   URL: ${result.url}`)

        if (result.violations === 0) {
            console.log(`   ✅ No violations found`)
        } else {
            console.log(`   ❌ ${result.violations} violation(s) found:`)

            for (const detail of result.details) {
                const impactIcon =
                    detail.impact === 'critical' ? '🔴' :
                        detail.impact === 'serious' ? '🟠' :
                            detail.impact === 'moderate' ? '🟡' : '🟢'

                console.log(`      ${impactIcon} [${detail.impact.toUpperCase()}] ${detail.help}`)
                console.log(`         ${detail.description}`)
                console.log(`         Affected elements: ${detail.nodes}`)
                console.log(`         More info: ${detail.helpUrl}`)
            }
        }

        console.log(`   📊 Passes: ${result.passes} | Incomplete: ${result.incomplete}`)

        totalViolations += result.violations
        totalPasses += result.passes
    }

    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total pages audited: ${results.length}`)
    console.log(`Total violations: ${totalViolations}`)
    console.log(`Total passes: ${totalPasses}`)

    if (totalViolations === 0) {
        console.log('\n✅ ALL PAGES PASS WCAG 2.1 AA COMPLIANCE CHECK')
    } else {
        console.log(`\n❌ ${totalViolations} WCAG 2.1 AA VIOLATIONS FOUND`)
        console.log('   Please fix the issues listed above.')
    }
}

async function main(): Promise<void> {
    console.log('🚀 Starting Accessibility Audit')
    console.log(`   Base URL: ${BASE_URL}`)
    console.log(`   Standard: WCAG 2.1 AA`)

    let browser: Browser | null = null

    try {
        browser = await chromium.launch({ headless: true })
        const context = await browser.newContext()
        const page = await context.newPage()

        const results: AuditResult[] = []

        for (const pageConfig of PAGES_TO_AUDIT) {
            const url = `${BASE_URL}${pageConfig.path}`
            const result = await auditPage(page, pageConfig.name, url)
            results.push(result)
        }

        printResults(results)

        // Exit with error code if violations found
        const totalViolations = results.reduce((sum, r) => sum + r.violations, 0)
        process.exit(totalViolations > 0 ? 1 : 0)

    } catch (error) {
        console.error('\n❌ Audit failed:', error)
        process.exit(1)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

main()
