# Founder welcome email - switch-on steps

1. Copy `founder-welcome-email.index.ts` -> `supabase/functions/founder-welcome-email/index.ts`.
2. Copy `supabase/functions/send-signup-emails/deno.json` -> `supabase/functions/founder-welcome-email/deno.json`.
3. Copy `_shared.transactional-email-templates.founder-welcome.tsx` -> `supabase/functions/_shared/transactional-email-templates/founder-welcome.tsx`.
4. In `registry.ts` (merge with the premium subscription registry change if both go live):
   - `import { template as founderWelcomeTemplate } from './founder-welcome.tsx'`
   - `'founder_welcome': founderWelcomeTemplate,` in TEMPLATES
5. `supabase/config.toml`: add `[functions.founder-welcome-email]` with `verify_jwt = false` (called by cron; safe to re-run, only sends to due users once).
6. Deploy `founder-welcome-email` and `preview-transactional-email`.
7. Run `welcome-email-cron.sql` (sets the go-live cutoff, schedules hourly).
