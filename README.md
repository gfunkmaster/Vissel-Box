# Vissel-Box

![CI](https://github.com/gfunkmaster/Vissel-Box/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)

**Anonym, end-to-end-krypterad visselblåsarkanal för svenska organisationer.**
Rapporten krypteras i visselblåsarens webbläsare med organisationens publika PGP-nyckel. Servern lagrar bara chiffer – den kan aldrig läsa innehållet.

> **English TL;DR** — Vissel-Box is a zero-knowledge whistleblowing channel built for the Swedish Whistleblowing Act (2021:890). Reports are PGP-encrypted *in the whistleblower's browser* using the organisation's public key; the backend only ever stores ciphertext. Private keys are generated client-side and never uploaded. Includes strict upload validation, rate limiting, Postgres Row Level Security and a 24-month automated retention policy. Stack: Next.js 16, React 19, TypeScript, Clerk, Supabase, Upstash Redis, openpgp.js. The UI is in Swedish.

---

## Problemet

Lagen om skydd för personer som rapporterar om missförhållanden (2021:890) kräver en konfidentiell rapporteringskanal. Den svåra delen är inte formuläret – det är att kanalens operatör inte får kunna läsa rapporterna. En vanlig "krypterad databas" hjälper inte: den som har databasåtkomst har också nyckeln.

Vissel-Box flyttar krypteringen till den enda plats där den kan vara hemlig: visselblåsarens egen webbläsare.

## Hur det fungerar

```
Organisation (engångs):
  /dashboard/setup
    1. generateKeyPair()  ->  RSA-4096-nyckelpar genereras I WEBLÄSAREN
    2. private-key.pem    ->  laddas ner till organisationens dator (lamnar aldrig klienten)
    3. public_key         ->  det ENDA som sparas i tenants.public_key, status -> 'active'

Visselblasare (varje rapport):
  /submit/<slug>
    4. hamtar organisationens publika nyckel
    5. encryptReport()    ->  PGP-krypterar texten lokalt i webblasaren
    6. submitReport()     ->  skickar ENDAST chiffer till servern:
                              rate limit -> Zod-validering -> tenant-kontroll -> INSERT

Organisation (lasa):
  /dashboard/reports/<id>
    7. hamtar chiffret (RLS: endast agaren)
    8. decryptReport()    ->  dekrypterar lokalt med private-key.pem
```

Klartexten finns bara på två ställen: i visselblåsarens webbläsare och i läsarens webbläsare. Servern ser den aldrig.

## Struktur

```
src/app/
  submit/[slug]/       publik rapporteringssida (anonym, ingen inloggning)
  dashboard/           kraver Clerk-inloggning
    onboarding/        skapa tenant (foretag + slug)
    setup/             nyckelgenerering - sker i webblasaren
    reports/           inkorg + detaljvy + dekryptering
    settings/          tenant-installningar
  actions/
    report.ts          submitReport, updateReportStatus, getReportCounts (server actions)
    tenant.ts          getTenantBySlug, getCurrentTenant, createTenant,
                       activateTenantWithPublicKey, updateTenant
src/lib/
  crypto/              generateKeyPair, downloadPrivateKey, encryptReport/File/Attachments,
                       decryptReport/File/Attachments
  security/            anonymize.ts (GDPR-headers + saltad IP-hash),
                       ratelimit.ts (Upstash), validation.ts (Zod)
  supabase/            klient, server-klient, typer
src/middleware.ts      GDPR-dataminimering + Clerk-skydd
supabase/
  schema.sql           tabeller, RLS-policies, index
  gdpr_retention.sql   24-manaders retention via pg_cron
scripts/
  a11y-audit.ts        axe-core WCAG 2.1 A/AA-scan
  contrast-check.ts    filtrerar ut kontrastfel
.github/workflows/
  ci.yml               typkontroll, lint och tester pa varje push
```

## Datamodell

**`tenants`** – organisationen som tar emot rapporter.
`id`, `name`, `slug` (unik, URL-segment), `contact_email`, `created_at`, `public_key` (nullable till dess att setup är klar), `owner_id` (Clerk-ID), `status` (`setup` | `active`).

**`reports`** – själva rapporten.
`id`, `tenant_id`, `encrypted_content` (PGP-armored chiffer), `encrypted_attachments` (JSON med krypterade filer), `status` (`new` | `read` | `archived` | `closed`), `created_at`, `closed_at`.

**`gdpr_deletion_log`** – revisionsspår för retentionen: `deleted_at`, `report_count`, `retention_months`, `notes`.

Det finns **ingen kolumn för privat nyckel** i schemat – den existerar bara som en nedladdad fil hos organisationen.

### Row Level Security

| Tabell | Operation | Policy |
|---|---|---|
| `tenants` | SELECT | `true` – publik, eftersom den publika nyckeln måste kunna hämtas av en anonym besökare |
| `tenants` | INSERT / UPDATE | `auth.uid()::text = owner_id` |
| `reports` | INSERT | `true` – anonym inlämning är hela poängen |
| `reports` | SELECT / UPDATE | endast tenantens `owner_id` |

Den publika läsrätten på `tenants` är avsiktlig och ofarlig: den avslöjar namn, slug och publik nyckel – aldrig någon rapport och aldrig en privat nyckel.

## Hotmodell och försvar

Målet är inte "krypterad i vila" utan två saker: servern kan inte läsa rapporterna, och den som kommer över databasen kan inte läsa dem.

| Hot | Försvar | Kod |
|---|---|---|
| Servern läser rapporten | Klientkryptering – endast chiffer lagras | `src/lib/crypto/encrypt.ts` |
| Läckt databas | Endast chiffer + publik nyckel finns där | `supabase/schema.sql` |
| Läckt privat nyckel | Nyckeln finns aldrig på servern | `src/lib/crypto/keys.ts` |
| Manipulerat chiffer (bit-flip, trunkering) | PGPs integritetsskydd – dekryptering misslyckas | `security.test.ts` |
| Skräp eller klartext skickas in | Zod kräver `-----BEGIN PGP MESSAGE-----`, 100 B–5 MB | `validation.ts` |
| Skadlig filuppladdning | MIME- och ändelse-allowlist, max 10 MB, dubbel ändelse | `validation.ts` |
| Spam/DoS mot öppen endpoint | Upstash sliding window per pseudonym klient | `ratelimit.ts` |
| SQL-injektion | Supabase parametriserade queries + Zod | `report.ts` |
| Personuppgifter i metadata | Middleware strippar IP- och UA-headers på anonyma routes | `middleware.ts` |
| Klienten fejkar sin egen identitet | Inkommande `x-client-hash` kastas och sätts bara av middleware | `anonymize.ts` |
| IP-adress läcker via Redis-nycklar | Nyckeln är en saltad HMAC-SHA256, aldrig en rå IP | `anonymize.ts` |
| Kartläggning av organisationer via publik slug | Rate limit på tenant-uppslaget, 30/minut | `tenant.ts` |
| Rapport hamnar hos fel tenant | Tenant måste finnas och ha `status = 'active'` | `report.ts` |
| Känsliga data i cache/proxy | `cache-control: no-store, no-cache, must-revalidate, private` | `middleware.ts` |

**Headers som strippas på anonyma routes** (`/submit/*`, `/:slug/report`, `/api/submit*`): `x-forwarded-for`, `x-real-ip`, `x-client-ip`, `cf-connecting-ip`, `true-client-ip`, `x-cluster-client-ip`, `forwarded`, `x-forwarded`, `x-vercel-ip`, `x-vercel-forwarded-for`. `user-agent` ersätts med `Anonymous-Client/1.0` och svaret märks med `x-gdpr-anonymized: true`.

**Rate limiting utan IP-adresser.** Att bara kasta IP-headersen gjorde tidigare att rate limitern tappade sin nyckel och alla klienter delade en gemensam kvot. Nu räknar middleware fram en pseudonym i stället:

```
x-client-hash = HMAC-SHA256(ip, IP_HASH_SALT)   # trunkerad till 32 hextecken
```

- Den råa IP-adressen lämnar aldrig middleware och loggas aldrig.
- En klient-skickad `x-client-hash` kastas alltid först - klienten får inte bestämma sin egen identitet.
- **Utan `IP_HASH_SALT` sätts ingen hash alls.** En osaltad hash av en IPv4-adress kan brute-forceas på sekunder (2^32 försök), så saltet är inte valfritt. Saknas det faller limitern tillbaka på en gemensam `'unknown'`-kvot.
- Hashen är *pseudonym* data, inte anonym (GDPR art. 4(5)), och lagras som Redis-nyckel med TTL. Rotera saltet då och då - det invaliderar alla gamla hashar.
- Allt det här ligger i `src/lib/security/anonymize.ts`, utan beroenden till Redis eller Next.js, så det kan enhetstestas rakt av.

**Filuppladdning** tillåter bara `application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `image/webp` med ändelserna `.pdf .jpg .jpeg .png .gif .webp`. Filnamn får inte innehålla `< > : " / \ | ? *` eller kontrolltecken, och dubbeländelser som `fil.pdf.exe` avvisas. Filen krypteras **innan** den lämnar webbläsaren.

## GDPR och retention

- **Dataminimering (art. 5(1)(c))** – `reports` saknar kolumner för IP, user-agent, enhet och e-post. Verifieras automatiskt av `src/__tests__/gdpr-audit.test.ts`.
- **Lagringsbegränsning (art. 5(1)(e))** – rapporten avslutas med status `closed` + `closed_at`. Ett pg_cron-jobb kör `gdpr_delete_expired_reports()` dagligen 03:00 UTC och hårdraderar allt som varit stängt i mer än 24 månader. Körningen loggas i `gdpr_deletion_log` utan personuppgifter.
- **Ingen cache** på anonyma routes, och ingen kaka krävs för att skicka en rapport.
- **Pseudonym, inte identifierbar.** Den enda identitet rate limitern ser är en saltad HMAC-SHA256 av IP-adressen (`x-client-hash`). Rå IP-adress, user-agent och enhetsfingeravtryck når aldrig server-logiken.
- **Medveten avvägning** – rate limitern är *fail-open*: är Redis nere släpps rapporten igenom och felet loggas. Hellre en legitim rapport än att blockera alla.
- `contact_email` i `tenants` tillhör organisationens administratör, aldrig visselblåsaren.

## Kom igång

Krav: Node 20 eller senare (utvecklat mot Node 24) samt konton hos Supabase, Clerk och Upstash (Upstash har gratisnivå).

```bash
git clone https://github.com/gfunkmaster/Vissel-Box.git
cd Vissel-Box
npm install
cp .env.example .env.local
```

Fyll i `.env.local`:

| Variabel | Källa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk → API Keys |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash → Redis-databas → REST |
| `IP_HASH_SALT` | Eget hemligt värde: `openssl rand -base64 32`. Krävs för att rate limitern ska gälla per klient i stället för globalt |

**Databas – kör i denna ordning i Supabase SQL Editor:**

1. `supabase/schema.sql` – tabeller, RLS-policies, index
2. `supabase/gdpr_retention.sql` – lägger till status `closed`, `closed_at` och cron-jobbet

> Aktivera `pg_cron` först: Database → Extensions → `pg_cron`.
>
> `schema.sql` innehåller hela schemat, inklusive status `closed` och `closed_at`. `gdpr_retention.sql` är guardad (`DROP CONSTRAINT IF EXISTS` + `information_schema`-koll) och kan därför köras före eller efter - den fungerar även mot en databas skapad med det äldre schema som bara tillät `new/read/archived`.

```bash
npm run dev     # http://localhost:3000
npm run build   # produktionsbygge
npm run lint    # eslint
```

**Onboarding (engångs per organisation):**

1. `/sign-up` – skapa konto (Clerk)
2. `/dashboard/onboarding` – företagsnamn, slug, kontaktmejl
3. `/dashboard/setup` – generera nyckelpar. Den privata nyckeln laddas ner som `private-key.pem`, den publika sparas i databasen och tenanten sätts till `active`
4. Rapporteringslänken blir `/submit/<slug>`

> `private-key.pem` går inte att återskapa. Utan den kan ingen – inte heller du – läsa inkomna rapporter.

## Test och kvalitetskontroll

```bash
npm test                # vitest: 41 tester i 3 filer (verifierat 2026-10-02)
npx next typegen        # krävs i en färsk klon: next-env.d.ts är gitignorerad
npx tsc --noEmit        # typkontroll (inget npm-skript finns för detta)
npm run lint            # eslint
```

Exakt samma kedja körs i CI på varje push: `.github/workflows/ci.yml`.

- `src/__tests__/anonymize.test.ts` (20 tester) bevakar dataminimeringen: att varje IP-header strippas, att user-agenten byts ut, att en klient-skickad `x-client-hash` kastas, att saltet faktiskt används (hashen är inte en osaltad SHA-256) och att rate limitern aldrig får en rå IP-adress som nyckel.
- `src/__tests__/security.test.ts` (10 tester) bevisar zero-knowledge-arkitekturen: att serverpayloaden aldrig innehåller klartext, att fel nyckel inte kan dekryptera, att manipulerat eller trunkerat chiffer upptäcks, och hela kedjan kryptera → lagra → hämta → dekryptera.
- `src/__tests__/gdpr-audit.test.ts` (11 tester) dokumenterar och verifierar dataminimeringen: att `reports` saknar kolumner för IP, user-agent, enhet och e-post, och att `submitReport` bara tar emot `tenantId`, `encryptedContent` och `encryptedAttachments`.

Tillgänglighet (kräver att dev-servern kör och att en tenant med slug `demo` finns):

```bash
npx playwright install chromium
npx --yes tsx scripts/a11y-audit.ts       # axe-core, WCAG 2.1 A/AA
npx --yes tsx scripts/contrast-check.ts   # listar kontrastfel
```

Skripten avslutar med exit-kod 1 när brott hittas och kan därför användas som CI-grind. `tsx` är inte en devDependency, därav `npx --yes` – lägg till `tsx` under `devDependencies` om du vill ha det reproducerbart.

## Kända begränsningar

Ärligt nuläge – detta återstår:

1. **Saltet är obligatoriskt.** Utan `IP_HASH_SALT` sätts ingen hash, och alla anonyma inlämningar hamnar i samma `'unknown'`-kvot på 5/minut. Det är säkrare än att lagra råa IP-adresser i Redis, men grövre än en kvot per klient.
2. **Tenant-uppslaget kan ge 404 vid ivrig omladdning.** `getTenantBySlug` anropas två gånger per sidvisning (metadata + sida), så 30/minut per klient motsvarar ungefär 15 omladdningar i minuten. Därefter visas "hittades inte" tills fönstret glider vidare.
3. **Fail-open vid Redis-avbrott.** Är Upstash otillgängligt försvinner spamskyddet helt. Avsiktligt val, men bör övervakas.
4. **Ingen nyckelrotation eller återställning.** Tappas `private-key.pem` är gamla rapporter oläsbara för alltid. Nyckeln laddas ner okrypterad, det finns ingen backup-väg och inget sätt att återkalla en nyckel.
5. **Legacy-routes kvar.** `src/app/[slug]/page.tsx` och `src/app/[slug]/report/page.tsx` gör i stort sett samma sak som `/submit/[slug]` och bör konsolideras. Dashboarden länkar nu till `/submit/<slug>`.
6. **Bilagor lagras som base64-text i rapportraden** (upp till 50 MB per rapport). Objektlagring vore rimligare – nu växer tabellen och backupen snabbt.
7. **WCAG är "byggt för", inte "granskat".** Formuläret har korrekt label-koppling, `aria-live` för statusmeddelanden, fokusflytt vid fel och `sr-only`-texter, och det finns ett axe-skript – men ingen dokumenterad granskningskörning. CI kör ännu inte a11y-skriptet, eftersom det kräver dev-server, en demo-tenant och Playwright.
8. **Nio eslint-varningar kvarstår** (obegagnade importer och en `exhaustive-deps` i `report-viewer.tsx`). CI failar på fel, inte på varningar.
9. **Ingen e-postnotifiering** när en rapport kommer in – organisationen måste själv titta i dashboarden. Det finns inga mailberoenden i `package.json`.
10. **Rate limiting är per klient, inte per tenant.** Alla som delar en IP (t.ex. ett kontorsnät) delar också kvot.

## Teknikstack

| Lager | Val |
|---|---|
| Ramverk | Next.js 16.1.6 (App Router, Server Actions), React 19.2.3 |
| Språk | TypeScript 5 |
| UI | Tailwind CSS 4, Radix UI / shadcn-komponenter, lucide-react |
| Autentisering | Clerk 6.37 (`clerkMiddleware`, `auth.protect()`) |
| Databas | Supabase Postgres med Row Level Security, `@supabase/ssr` |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` (sliding window) |
| Kryptografi | openpgp.js 6.3 (RSA-4096, armored PGP) |
| Validering | Zod 4.3 |
| Test | Vitest 4.0.18; Playwright 1.58 + `@axe-core/playwright` för a11y |

## Licens

MIT – se [LICENSE](LICENSE).
