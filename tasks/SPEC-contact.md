# Spec: صفحة اتصال بنا (Contact Page)

## Objective
صفحة اتصال لاوندايت بالعربية/الفرنسية على المسار `/{locale}/contact`، بنموذج إرسال يُحفظ في Supabase (جدول `contact_messages`) مع أزرار نسخ الإيميل والتواصل، ومربوطة من النافبار والفوتر وزر «تواصل مع المبيعات». الهدف: قناة اتصال مباشرة قبل التسجيل.

## Tech Stack
- **Framework:** Next.js 16 + next-intl (locale: ar/fr)
- **UI:** shadcn/ui (Input, Textarea, Select, Button, Card, Label) — design tokens فقط
- **Backend:** Supabase (anonymous role + RLS INSERT policy), Route Handler `POST /api/contact`
- **Validation:** Zod (server-side), native HTML validity (client-side)

## Capability Map (single module)
| Module | Responsibility | Depends on |
|--------|---------------|------------|
| `contact` | Form + API + DB + footer + nav links | — |

## Commands
- `npm run dev` — dev server (port 3000)
- `npm run build` — production build
- `tsc --noEmit` — type check
- `npm run check:design` — design-system guard (MUST pass before delivery)

## Project Structure (new files)
```
supabase/migrations/20260913120000_create_contact_messages.sql
src/app/api/contact/route.ts
src/components/contact/ContactForm.tsx
src/components/layout/Footer.tsx            ← extracted from landing
src/app/[locale]/contact/page.tsx
```

## Modified files
```
src/components/layout/Navbar.tsx            ← /#contact → /contact
src/app/[locale]/page.tsx                   ← use Footer, CTA → /contact
messages/ar.json                            ← Contact namespace
messages/fr.json                            ← Contact namespace
.env.local                                  ← NEXT_PUBLIC_CONTACT_EMAIL
```

## Code Style (pattern reference)
```tsx
// Follow RegisterForm.tsx pattern exactly:
// - controlled useState + onInvalid setCustomValidity + next-intl useTranslations
// - sonner toast for success/error (NOT window.alert)
// - Loader2 spin icon while submitting
// - pl-10 rtl:pl-3 rtl:pr-10 for input icons
// - color tokens only (no hex, no slate-*)
```

## DB Schema
```sql
contact_messages(
  id uuid PK default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text null,
  subject text not null check (inquiry|demo|partnership),
  message text not null,
  locale text not null default 'ar' check (ar|fr),
  created_at timestamptz default now(),
  read_at timestamptz null
)
RLS: INSERT policy for anon only
```

## Boundaries
- **Always:** Validate all input at API boundary (Zod), use anonymous Supabase client (not service role), design tokens only, design-system guard passes
- **Ask first:** Schema changes, new dependencies, CSP changes
- **Never:** Commit secrets, commit NEXT_PUBLIC_CONTACT_EMAIL value to repo, bypass RLS checks, use `eval`/`innerHTML`

## Security Notes
- Route uses `createClient()` from `server.ts` (anon role, not admin) — no service role exposed
- RLS INSERT policy: `to anon with check (true)` — only anon can insert
- Phone is optional; no honeypot/rate-limiting (deferred to future iteration)
- Form subject enum validated server-side (Zod enum), limiting arbitrary input
- No PII is logged in API route on success

## Open Questions
- NEXT_PUBLIC_CONTACT_EMAIL default: `contact@binaa.dz` (matches existing footer) — user may change
- No admin read UI yet (deferred); messages readable via Supabase dashboard
