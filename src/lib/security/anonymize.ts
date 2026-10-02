/**
 * GDPR DATAMINIMERING - anonymisering av headers
 * ==============================================
 *
 * Middleware använder den här modulen för att ta bort allt som kan identifiera
 * en visselblåsare innan requesten når server-logiken.
 *
 * AVVÄGNINGEN
 * Rate limitern behöver kunna skilja klienter åt, annars kan en enskild
 * användare spamma sönder kvoten för alla andra. Därför skickas en pseudonym
 * vidare: en saltad HMAC-SHA256-hash av IP-adressen.
 *
 * - Den råa IP-adressen lämnar aldrig middleware och loggas aldrig.
 * - Saltet (`IP_HASH_SALT`) är hemligt och gör hashen omöjlig att brute-forcea.
 *   Utan salt sätts ingen hash alls: IPv4-rymden är bara 2^32, så en osaltad
 *   hash kan knäckas på sekunder.
 * - Hashen är pseudonym data, inte anonym data (GDPR art. 4(5)). Rotera saltet
 *   med jämna mellanrum - det invaliderar alla gamla hashar.
 *
 * Modulen har medvetet inga beroenden till Redis eller Next.js, så att den kan
 * enhetstestas rakt av och importeras från middleware (Edge runtime).
 */

/**
 * Headers som kan identifiera en visselblåsare.
 *
 * Ordningen är prioritetsordning vid uppslag av klientens IP. Samma lista
 * används för att strippa, vilket garanterar att allt vi läser också tas bort.
 */
export const SENSITIVE_HEADERS = [
    'x-real-ip',              // klientens IP (sätts av bl.a. Vercel)
    'x-forwarded-for',        // proxy-kedjans IP:n - kan vara en lista
    'cf-connecting-ip',       // Cloudflares klient-IP
    'true-client-ip',         // Akamai/Cloudflare
    'x-vercel-forwarded-for', // Vercel
    'x-client-ip',            // klientens IP
    'x-cluster-client-ip',    // lastbalanserarens klient-IP
    'forwarded',              // RFC 7239
    'x-forwarded',            // äldre forwarding-header
    'x-vercel-ip',            // Vercel
] as const

/** Intern header med den saltade IP-hashen. Sätts bara av middleware. */
export const CLIENT_HASH_HEADER = 'x-client-hash'

/** Ersätter den riktiga user-agenten så att den inte kan användas för fingerprinting. */
export const ANONYMIZED_USER_AGENT = 'Anonymous-Client/1.0'

/** Trunkerad hash: 32 hextecken = 128 bitar, gott och väl för en bucket-nyckel. */
const HASH_LENGTH = 32

/**
 * Plockar ut klientens IP ur headers enligt prioritetsordningen ovan.
 *
 * Värdet behöver inte vara en giltig IP-adress - det används bara som en stabil
 * nyckel för rate limiting. Returnerar null när ingen header finns.
 */
export function getForwardedIp(headers: Headers): string | null {
    for (const header of SENSITIVE_HEADERS) {
        const value = headers.get(header)
        if (value) {
            // x-forwarded-for kan innehålla en kedja - första posten är klienten
            return value.split(',')[0].trim()
        }
    }
    return null
}

/**
 * Saltad HMAC-SHA256 av en IP-adress. Kan inte vändas tillbaka utan saltet.
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
    const encoder = new TextEncoder()

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(salt),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ip))

    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, HASH_LENGTH)
}

/**
 * Tar bort allt identifierande ur headers och lägger till den pseudonyma
 * IP-hashen.
 *
 * En klient får ALDRIG kunna bestämma sin egen identitet: en inkommande
 * `x-client-hash` kastas alltid först och sätts bara av den här funktionen.
 */
export async function anonymizeHeaders(headers: Headers, salt?: string): Promise<Headers> {
    const sanitized = new Headers(headers)
    const ip = getForwardedIp(headers)

    for (const header of SENSITIVE_HEADERS) {
        sanitized.delete(header)
    }

    sanitized.delete(CLIENT_HASH_HEADER)
    sanitized.set('user-agent', ANONYMIZED_USER_AGENT)

    if (ip && salt) {
        sanitized.set(CLIENT_HASH_HEADER, await hashIp(ip, salt))
    }

    return sanitized
}

/**
 * Identifierare för rate limiting.
 *
 * Läser den saltade hash som middleware lägger till. Returnerar ALDRIG en rå
 * IP-adress: ser den ingen hash blir svaret `'unknown'`, vilket innebär en
 * gemensam kvot för alla utan hash. Det är medvetet - hellre en trubbigare
 * gräns än att IP-adresser börjar läcka in i Redis-nycklar.
 */
export function getRateLimitIdentifier(headers: Headers): string {
    return headers.get(CLIENT_HASH_HEADER) ?? 'unknown'
}
