// Supabase Send Email Hook -> Resend. Supabase Auth calls this for sign-up, invite, magic link,
// password reset, email change, reauthentication and security notices once hook_send_email is
// enabled on the project (see supabase/manual/AUTH_EMAIL_RESEND_RUNBOOK.md).
//
// Contract: POST with a Standard Webhooks signature (secret SEND_EMAIL_HOOK_SECRET, env only,
// never an admin override). 200 {} = sent; any other status makes Auth report the email as failed.
// Logs carry only the action type and a short reason: never addresses, OTPs, token hashes or links.
// Test and QA addresses (agentmail.to, +uk aliases) get the same real emails with no [TEST] prefix,
// because QA signs up and resets passwords with them.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { SecurityNoticeEmail } from '../_shared/email-templates/security-notice.tsx'
import {
  AUTH_FROM_DEFAULT,
  hookError,
  HookPayloadError,
  planAuthEmails,
  type HookPayload,
  type PlannedEmail,
  type TemplateKind,
  verifyHookSignature,
} from '../_shared/auth-email-rules.ts'
import type { SendResendEmailInput, SendResendResult } from '../_shared/resend.ts'

// deno-lint-ignore no-explicit-any
const TEMPLATES: Record<TemplateKind, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
  security_notice: SecurityNoticeEmail,
}

export interface AuthEmailDeps {
  /** Sends one email (sendResendEmail in production). */
  send: (input: SendResendEmailInput) => Promise<SendResendResult>
  /** Reads a setting: SEND_EMAIL_HOOK_SECRET and SUPABASE_URL from env only; senders may use cfg. */
  env: (name: string) => string | undefined
  /** Sender lookup (AUTH_EMAIL_FROM, then EMAIL_FROM). */
  from: () => string | undefined
  log?: (msg: string, extra?: Record<string, unknown>) => void
  now?: () => number
}

export async function renderPlanned(email: PlannedEmail): Promise<{ html: string; text: string }> {
  const element = React.createElement(TEMPLATES[email.template], email.props)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  return { html, text }
}

const json = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json' } })

export function createAuthEmailHandler(deps: AuthEmailDeps) {
  const log = deps.log ?? ((msg, extra) => console.log(`[auth-email-hook] ${msg}`, extra ?? {}))

  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      const e = hookError(405, 'Method not allowed')
      return json(e.status, e.body)
    }

    const body = await req.text()
    const nowSec = Math.floor((deps.now ? deps.now() : Date.now()) / 1000)
    const check = await verifyHookSignature(deps.env('SEND_EMAIL_HOOK_SECRET'), req.headers, body, nowSec)
    if (!check.ok) {
      // Read via a cast: the edge functions type-check with strict off, where the union does not narrow.
      const reason = (check as { reason?: string }).reason ?? 'bad_signature'
      log('refused', { reason })
      const e = reason === 'missing_secret'
        ? hookError(500, 'Auth email hook is not configured')
        : hookError(401, 'Invalid hook signature')
      return json(e.status, e.body)
    }

    let planned: PlannedEmail[]
    let actionType = 'unknown'
    try {
      const payload = JSON.parse(body) as HookPayload
      actionType = String(payload?.email_data?.email_action_type ?? 'unknown').slice(0, 40)
      planned = planAuthEmails(payload, deps.env('SUPABASE_URL') ?? '')
    } catch (err) {
      const reason = err instanceof HookPayloadError ? err.message : 'invalid payload'
      log('rejected request', { type: actionType, reason })
      const e = hookError(400, `Could not build the email: ${reason}`)
      return json(e.status, e.body)
    }

    const from = deps.from() || AUTH_FROM_DEFAULT
    const hookId = (req.headers.get('webhook-id') ?? crypto.randomUUID()).slice(0, 80)

    for (const email of planned) {
      try {
        const { html, text } = await renderPlanned(email)
        const result = await deps.send({
          to: email.to,
          from,
          subject: email.subject,
          html,
          text,
          // Supabase retries a failed hook with the same webhook-id: dedupe at Resend.
          idempotencyKey: `auth-${hookId}-${email.label}`,
        })
        if (!result.sent) log('not delivered', { type: email.label, reason: (result as { reason?: string }).reason ?? 'not_sent' })
        else log('sent', { type: email.label })
      } catch (err) {
        // sendResendEmail already strips addresses and numbers from its error text.
        const reason = err instanceof Error ? err.message : 'send failed'
        log('send failed', { type: email.label, reason })
        const e = hookError(500, 'Could not send the email. Please try again in a few minutes.')
        return json(e.status, e.body)
      }
    }

    return json(200, '{}')
  }
}
