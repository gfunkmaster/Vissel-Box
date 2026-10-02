/**
 * TESTER: GDPR-anonymisering av headers
 * =====================================
 *
 * De här testerna bevakar den mest känsliga egenskapen i applikationen: att en
 * visselblåsares IP-adress och user-agent aldrig förs vidare till
 * server-logiken, samtidigt som rate limitern ändå får en användbar
 * (pseudonym) nyckel.
 *
 * Kör med: npm test
 */

import { describe, it, expect } from 'vitest'
import {
    ANONYMIZED_USER_AGENT,
    CLIENT_HASH_HEADER,
    SENSITIVE_HEADERS,
    anonymizeHeaders,
    getForwardedIp,
    getRateLimitIdentifier,
    hashIp,
} from '@/lib/security/anonymize'

const SECRET_SALT = 'test-salt-32-bytes-minst-for-hmac'
const OTHER_SALT = 'ett-helt-annat-salt'
const IP = '203.0.113.42'

/** Hjälpare: bygger Headers med samtliga känsliga headers satta till samma IP. */
function allSensitiveHeaders(): Headers {
    const headers = new Headers()
    for (const header of SENSITIVE_HEADERS) {
        headers.set(header, IP)
    }
    return headers
}

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

describe('GDPR-anonymisering av headers', () => {

    // ========================================================================
    // anonymizeHeaders - kärnan i dataminimeringen
    // ========================================================================
    describe('anonymizeHeaders', () => {
        it('tar bort samtliga IP-headers', async () => {
            const sanitized = await anonymizeHeaders(allSensitiveHeaders(), SECRET_SALT)

            for (const header of SENSITIVE_HEADERS) {
                expect(sanitized.get(header)).toBeNull()
            }
        })

        it('ersätter user-agenten med ett generiskt värde', async () => {
            const headers = new Headers({ 'user-agent': 'Mozilla/5.0 (Macintosh; ...)' })

            const sanitized = await anonymizeHeaders(headers, SECRET_SALT)

            expect(sanitized.get('user-agent')).toBe(ANONYMIZED_USER_AGENT)
        })

        it('sätter en saltad IP-hash när salt finns', async () => {
            const sanitized = await anonymizeHeaders(new Headers({ 'x-real-ip': IP }), SECRET_SALT)

            expect(sanitized.get(CLIENT_HASH_HEADER)).toBe(await hashIp(IP, SECRET_SALT))
        })

        it('läcker varken IP eller hash när salt saknas', async () => {
            const headers = new Headers({ 'x-forwarded-for': IP, 'user-agent': 'curl/8.0' })

            const sanitized = await anonymizeHeaders(headers)

            expect(sanitized.get(CLIENT_HASH_HEADER)).toBeNull()
            expect(sanitized.get('x-forwarded-for')).toBeNull()
            expect(sanitized.get('x-real-ip')).toBeNull()
            expect(JSON.stringify([...sanitized.entries()])).not.toContain(IP)
        })

        it('KASTAR en klient-skickad x-client-hash och sätter sin egen', async () => {
            const headers = new Headers({
                'x-real-ip': IP,
                [CLIENT_HASH_HEADER]: 'jag-valjer-min-egen-identitet',
            })

            const sanitized = await anonymizeHeaders(headers, SECRET_SALT)

            expect(sanitized.get(CLIENT_HASH_HEADER)).not.toBe('jag-valjer-min-egen-identitet')
            expect(sanitized.get(CLIENT_HASH_HEADER)).toBe(await hashIp(IP, SECRET_SALT))
        })

        it('tar bort en klient-skickad x-client-hash när ingen IP finns', async () => {
            const headers = new Headers({ [CLIENT_HASH_HEADER]: 'pahittad' })

            const sanitized = await anonymizeHeaders(headers, SECRET_SALT)

            expect(sanitized.get(CLIENT_HASH_HEADER)).toBeNull()
        })

        it('lämnar oskyldiga headers orörda', async () => {
            const headers = new Headers({ 'content-type': 'text/plain', 'x-real-ip': IP })

            const sanitized = await anonymizeHeaders(headers, SECRET_SALT)

            expect(sanitized.get('content-type')).toBe('text/plain')
        })
    })

    // ========================================================================
    // hashIp - pseudonymiseringen
    // ========================================================================
    describe('hashIp', () => {
        it('ger samma hash för samma IP och salt', async () => {
            expect(await hashIp(IP, SECRET_SALT)).toBe(await hashIp(IP, SECRET_SALT))
        })

        it('är 32 hextecken', async () => {
            expect(await hashIp(IP, SECRET_SALT)).toMatch(/^[0-9a-f]{32}$/)
        })

        it('ger olika hash för olika salt', async () => {
            expect(await hashIp(IP, SECRET_SALT)).not.toBe(await hashIp(IP, OTHER_SALT))
        })

        it('ger olika hash för olika IP', async () => {
            expect(await hashIp(IP, SECRET_SALT)).not.toBe(await hashIp('198.51.100.7', SECRET_SALT))
        })

        it('är inte en osaltad SHA-256 - saltet används faktiskt', async () => {
            const unsalted = (await sha256Hex(IP)).slice(0, 32)

            expect(await hashIp(IP, SECRET_SALT)).not.toBe(unsalted)
        })

        it('innehåller inte IP-adressen i klartext', async () => {
            expect(await hashIp(IP, SECRET_SALT)).not.toContain(IP)
        })
    })

    // ========================================================================
    // getForwardedIp - uppslag innan strippning
    // ========================================================================
    describe('getForwardedIp', () => {
        it('prioriterar x-real-ip', () => {
            const headers = new Headers({
                'x-real-ip': IP,
                'x-forwarded-for': '198.51.100.7',
            })

            expect(getForwardedIp(headers)).toBe(IP)
        })

        it('tar första posten i en x-forwarded-for-kedja', () => {
            const headers = new Headers({ 'x-forwarded-for': `${IP}, 70.41.3.18, 150.172.238.178` })

            expect(getForwardedIp(headers)).toBe(IP)
        })

        it('returnerar null när ingen IP-header finns', () => {
            expect(getForwardedIp(new Headers({ accept: '*/*' }))).toBeNull()
        })
    })

    // ========================================================================
    // getRateLimitIdentifier - nyckeln till rate limitern
    // ========================================================================
    describe('getRateLimitIdentifier', () => {
        it('använder den saltade hashen', async () => {
            const sanitized = await anonymizeHeaders(new Headers({ 'x-real-ip': IP }), SECRET_SALT)

            expect(getRateLimitIdentifier(sanitized)).toBe(await hashIp(IP, SECRET_SALT))
        })

        it('faller tillbaka på "unknown" utan hash', () => {
            expect(getRateLimitIdentifier(new Headers({ 'x-real-ip': IP }))).toBe('unknown')
        })

        it('returnerar aldrig en rå IP-adress', () => {
            const headers = new Headers({
                'x-real-ip': IP,
                'x-forwarded-for': IP,
                'cf-connecting-ip': IP,
            })

            expect(getRateLimitIdentifier(headers)).not.toBe(IP)
        })

        it('ger olika kvoter för olika klienter', async () => {
            const a = await anonymizeHeaders(new Headers({ 'x-real-ip': '203.0.113.1' }), SECRET_SALT)
            const b = await anonymizeHeaders(new Headers({ 'x-real-ip': '203.0.113.2' }), SECRET_SALT)

            expect(getRateLimitIdentifier(a)).not.toBe(getRateLimitIdentifier(b))
        })
    })
})
