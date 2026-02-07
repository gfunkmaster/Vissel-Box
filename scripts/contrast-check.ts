/**
 * Quick color contrast checker - shows which elements fail
 */

import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

async function main() {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 })

    const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze()

    console.log('\n=== COLOR CONTRAST VIOLATIONS ===\n')

    const contrastViolation = results.violations.find(v => v.id === 'color-contrast')

    if (!contrastViolation) {
        console.log('✅ No color contrast violations found!')
    } else {
        console.log(`Found ${contrastViolation.nodes.length} elements with contrast issues:\n`)

        for (const node of contrastViolation.nodes) {
            console.log('Element:', node.html.substring(0, 150))
            console.log('Target:', node.target)
            console.log('Message:', node.failureSummary)
            console.log('---')
        }
    }

    await browser.close()
}

main()
