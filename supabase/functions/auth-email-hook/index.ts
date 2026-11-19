import { initEdgeSentry } from '../_shared/sentry.ts'
import { cfg } from '../_shared/config.ts'
import { sendResendEmail } from '../_shared/resend.ts'
import { createAuthEmailHandler } from './handler.ts'

initEdgeSentry()

// Deployed with --no-verify-jwt: Supabase Auth signs each call with SEND_EMAIL_HOOK_SECRET instead.
const handler = createAuthEmailHandler({
  send: sendResendEmail,
  // The hook secret and project URL come from Supabase secrets only, never from admin overrides.
  env: (name) => Deno.env.get(name),
  from: () => cfg('AUTH_EMAIL_FROM') || cfg('EMAIL_FROM'),
})

Deno.serve(handler)
