// Deno tests for the auth email hook handler: run with
//   cd supabase/functions/auth-email-hook && deno test --allow-env --allow-net=127.0.0.1 handler.denotest.ts
// (Not named *_test.ts so the repo bun test run skips it; bun cannot load jsr:/npm: imports.)
// Signs requests with the official standardwebhooks library (what Supabase Auth uses) and renders
// the real templates. Nothing is sent: the Resend sender is replaced by a recorder.
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createAuthEmailHandler } from './handler.ts'
import type { SendResendEmailInput } from '../_shared/resend.ts'

const SECRET_B64 = btoa('0123456789abcdef0123456789abcdef')
const SECRET = `v1,whsec_${SECRET_B64}`
const PROJECT = 'https://byrwtxdalhsmvktuzoya.supabase.co'

function setup(opts: { secret?: string; fail?: boolean; suppressed?: boolean } = {}) {
  const sent: SendResendEmailInput[] = []
  const logs: string[] = []
  const handler = createAuthEmailHandler({
    send: (input) => {
      sent.push(input)
      if (opts.fail) return Promise.reject(new Error('Resend request failed (403 validation_error): The notify.collaborate8.com domain is not verified'))
      return Promise.resolve(opts.suppressed ? { sent: false, reason: 'recipient_suppressed' } : { sent: true })
    },
    env: (n) => ({ SEND_EMAIL_HOOK_SECRET: opts.secret ?? SECRET, SUPABASE_URL: PROJECT } as Record<string, string>)[n],
    from: () => undefined,
    log: (msg, extra) => logs.push(`${msg} ${JSON.stringify(extra ?? {})}`),
  })
  return { handler, sent, logs }
}

function signedRequest(payload: unknown, secretB64 = SECRET_B64, id = 'msg_test_1') {
  const body = JSON.stringify(payload)
  const wh = new Webhook(secretB64)
  const now = new Date()
  const signature = wh.sign(id, now, body)
  return new Request('http://127.0.0.1/auth-email-hook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(now.getTime() / 1000)),
      'webhook-signature': signature,
    },
    body,
  })
}

const recovery = {
  user: { id: 'u1', email: 'collaborate8-qa+uk1@agentmail.to' },
  email_data: {
    token: '305805',
    token_hash: 'th_secret_hash_value',
    redirect_to: 'https://collaborate8.com/reset-password',
    email_action_type: 'recovery',
    site_url: 'https://collaborate8.com',
    token_new: '',
    token_hash_new: '',
  },
}

const leaks = (logs: string[]) =>
  logs.filter((l) => /@|305805|th_secret_hash_value|token=|token_hash=|verify\?|auth\/confirm/.test(l))

Deno.test('recovery: verified with standardwebhooks, rendered, sent once to the QA address', async () => {
  const { handler, sent, logs } = setup()
  const res = await handler(signedRequest(recovery))
  assertEquals(res.status, 200)
  assertEquals(await res.json(), {})
  assertEquals(sent.length, 1)
  const m = sent[0]
  assertEquals(m.to, 'collaborate8-qa+uk1@agentmail.to')
  assertEquals(m.subject, 'Reset your Collabor8 password')
  assert(!m.subject.includes('[TEST]'))
  assertEquals(m.from, 'Collabor8 <noreply@notify.collaborate8.com>')
  assertEquals(m.idempotencyKey, 'auth-msg_test_1-recovery')
  const link = `https://collaborate8.com/auth/confirm?token_hash=th_secret_hash_value&amp;type=recovery&amp;next=%2Freset-password`
  assertStringIncludes(m.html ?? '', link)
  assert(!(m.html ?? '').includes('/auth/v1/verify'), 'no Supabase verify link')
  assert(!(m.text ?? '').includes('/auth/v1/verify'), 'no Supabase verify link in text')
  assertStringIncludes(m.text ?? '', 'reset your password for Collabor8')
  for (const part of [m.html ?? '', m.text ?? '', m.subject]) {
    assert(!/lovable/i.test(part), 'no Lovable links')
    assert(!part.includes('\u2014'), 'no em dash')
    assert(!/\bpolice\b|\bvictims?\b/i.test(part))
  }
  assertEquals(leaks(logs), [])
})

Deno.test('every action type renders and sends', async () => {
  const cases: Array<[string, Record<string, unknown>, Record<string, unknown>, number]> = [
    ['signup', {}, {}, 1],
    ['invite', {}, {}, 1],
    ['magiclink', {}, {}, 1],
    ['email', {}, {}, 1],
    ['reauthentication', {}, {}, 1],
    ['email_change', { token_hash_new: 'th_current' }, { new_email: 'new@example.com' }, 2],
    ['password_changed_notification', { token_hash: '' }, {}, 1],
  ]
  for (const [type, extra, userExtra, count] of cases) {
    const { handler, sent, logs } = setup()
    const p = { user: { ...recovery.user, ...userExtra }, email_data: { ...recovery.email_data, redirect_to: '', email_action_type: type, ...extra } }
    const res = await handler(signedRequest(p, SECRET_B64, `msg_${type}`))
    assertEquals(res.status, 200, type)
    assertEquals(sent.length, count, type)
    for (const m of sent) {
      assert((m.html ?? '').length > 200, `${type} html`)
      assert(!/lovable/i.test(m.html ?? ''), `${type} no lovable`)
      assert(!(m.html ?? '').includes('\u2014'), `${type} no em dash`)
    }
    assertEquals(leaks(logs), [], type)
  }
})

Deno.test('a bad signature is refused with 401 and nothing is sent', async () => {
  const { handler, sent, logs } = setup()
  const res = await handler(signedRequest(recovery, btoa('ffffffffffffffffffffffffffffffff')))
  assertEquals(res.status, 401)
  assertEquals((await res.json()).error.http_code, 401)
  assertEquals(sent.length, 0)
  assertEquals(leaks(logs), [])
})

Deno.test('no hook secret configured: 500, nothing sent', async () => {
  const { handler, sent } = setup({ secret: '' })
  const res = await handler(signedRequest(recovery))
  assertEquals(res.status, 500)
  assertEquals(sent.length, 0)
})

Deno.test('Resend failure (domain not verified): 500 so Auth reports the failure, and no leak in logs or body', async () => {
  const { handler, logs } = setup({ fail: true })
  const res = await handler(signedRequest(recovery))
  assertEquals(res.status, 500)
  const body = await res.text()
  assert(!/@|305805|th_secret/.test(body))
  assertEquals(leaks(logs), [])
  assert(logs.some((l) => l.includes('send failed')))
})

Deno.test('suppressed recipient: 200, logged without the address', async () => {
  const { handler, logs } = setup({ suppressed: true })
  const res = await handler(signedRequest(recovery))
  assertEquals(res.status, 200)
  assert(logs.some((l) => l.includes('recipient_suppressed')))
  assertEquals(leaks(logs), [])
})

Deno.test('GET is refused', async () => {
  const { handler } = setup()
  const res = await handler(new Request('http://127.0.0.1/auth-email-hook'))
  assertEquals(res.status, 405)
})
