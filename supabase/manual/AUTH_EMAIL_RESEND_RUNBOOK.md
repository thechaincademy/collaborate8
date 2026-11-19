# Auth emails through Resend (London project byrwtxdalhsmvktuzoya)

Sign-up, password reset, magic link, invite, email change, reauthentication and security notice
emails go out through the `auth-email-hook` edge function (Supabase Send Email Hook) and Resend,
not Lovable and not Supabase's default mailer.

Status when this was written: **nothing deployed, hook disabled, no SMTP.** London currently uses
Supabase's default mailer. `RESEND_API_KEY` and `EMAIL_FROM` are already set as London secrets.

> **Order matters. Enable the hook only AFTER Resend shows notify.collaborate8.com as Verified.**
> While the hook is on, Supabase Auth hands every auth email to the function. If Resend refuses the
> send (domain not verified, wrong sender), the function returns 500 and Supabase reports the email
> as failed: nobody can confirm a sign-up or reset a password until the hook is turned off again.

Rules for whoever runs this: never echo, paste or commit a secret value. Keep secrets in a
`chmod 600` file and pass them with `--env-file` or `$(cat file)` inside the command only.

---

## 0. One-off shell setup

```bash
export PROJECT_REF=byrwtxdalhsmvktuzoya
export API=https://api.supabase.com/v1/projects/$PROJECT_REF
# A personal access token with access to the London project, kept out of shell history:
read -rs SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN
umask 077 && mkdir -p ~/.c8-secrets
```

All Management API calls send `User-Agent: curl/8.5.0` (the API's edge rejects some default agents).

## 1. Deploy the function (safe at any time: it is not called until the hook is enabled)

```bash
cd <repo root>   # branch with commit containing auth-email-hook/handler.ts
supabase functions deploy auth-email-hook --project-ref $PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` is required: Supabase Auth does not send a user JWT; the function checks the
Standard Webhooks signature instead (also set in `supabase/config.toml`, `verify_jwt = false`).

Also deploy the two functions that no longer use the Lovable key (they now accept the service key
or a signed-in admin):

```bash
supabase functions deploy send-product-update preview-transactional-email --project-ref $PROJECT_REF
```

## 2. Generate the hook secret and store it as a function secret

The same value goes in two places: the function secret `SEND_EMAIL_HOOK_SECRET` and the auth
hook config (step 5). Format: `v1,whsec_<base64 of 32 random bytes>`.

```bash
printf 'SEND_EMAIL_HOOK_SECRET=v1,whsec_%s\n' "$(openssl rand -base64 32)" > ~/.c8-secrets/send_email_hook.env
supabase secrets set --project-ref $PROJECT_REF --env-file ~/.c8-secrets/send_email_hook.env
supabase secrets list --project-ref $PROJECT_REF | grep -E 'SEND_EMAIL_HOOK_SECRET|RESEND_API_KEY|EMAIL_FROM'   # names and digests only
```

Optional: set `AUTH_EMAIL_FROM` (for example `Collabor8 <noreply@notify.collaborate8.com>`) as a
secret or on /admin/setup. If it is not set, auth emails use `EMAIL_FROM`; if neither is set,
`Collabor8 <noreply@notify.collaborate8.com>`. Whatever is used **must be an address on
notify.collaborate8.com**, or Resend refuses it. Check `EMAIL_FROM` in /admin/setup before step 5.

## 3. Wait for Resend: notify.collaborate8.com must be Verified

Needs Rafa's okay for the DNS records (not part of this runbook; collaborate8.com DNS is not
changed here). In the Resend dashboard (EU region, Collabor8 account) -> Domains ->
notify.collaborate8.com, every record listed there (SPF/MX and DKIM) must show **Verified** and
the domain status must be **Verified**. Do not continue before this.

## 4. Pre-flight while the hook is still OFF

a. Read the current auth config (read-only) and keep a copy for rollback:

```bash
curl -sS "$API/config/auth" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "User-Agent: curl/8.5.0" \
  | jq '{site_url, uri_allow_list, hook_send_email_enabled, hook_send_email_uri, smtp_host, rate_limit_email_sent, mailer_secure_email_change_enabled}' \
  | tee ~/.c8-secrets/auth_config_before.json
```

Expect `site_url` = `https://collaborate8.com` (or the London test site until the switch) and
`uri_allow_list` to include `https://collaborate8.com/**` and the London test site. The function
builds links as
`https://byrwtxdalhsmvktuzoya.supabase.co/auth/v1/verify?token=<token_hash>&type=<type>&redirect_to=<redirect>`,
where `redirect` is the `redirect_to` Supabase already checked against that allow list. A bare site
root becomes `/reset-password` for resets and `/dashboard` otherwise; Lovable hosts are never used.

b. Signed smoke call straight to the deployed function, to a QA inbox. This sends one real email
with a dummy link (the link itself will not work, that is expected):

```bash
set -a; . ~/.c8-secrets/send_email_hook.env; set +a
deno run --allow-env --allow-net - <<'TS'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')!.replace('v1,whsec_', '')
const body = JSON.stringify({
  user: { id: '00000000-0000-0000-0000-000000000000', email: 'collaborate8-qa+uk1@agentmail.to' },
  email_data: { token: '000000', token_hash: 'smoke-test-not-a-real-token', redirect_to: 'https://collaborate8.com/reset-password',
    email_action_type: 'recovery', site_url: 'https://collaborate8.com', token_new: '', token_hash_new: '' },
})
const id = `msg_smoke_${Date.now()}`, now = new Date()
const res = await fetch('https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/auth-email-hook', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'webhook-id': id,
    'webhook-timestamp': String(Math.floor(now.getTime() / 1000)), 'webhook-signature': new Webhook(secret).sign(id, now, body) },
  body,
})
console.log(res.status, await res.text())   // expect: 200 {}
TS
```

- `200 {}` and the "Reset your Collabor8 password" email arrives in the QA inbox: go on.
- `500 ... Could not send the email`: Resend refused it. Check the function logs (they show only
  the action type and Resend's reason, never addresses) and fix the domain or sender first.
- `401`: the secret in the env file and the deployed secret differ. Redo step 2.

## 5. Enable the hook (only after 3 and 4b pass)

```bash
jq -n --arg secret "$(sed -n 's/^SEND_EMAIL_HOOK_SECRET=//p' ~/.c8-secrets/send_email_hook.env)" '{
  hook_send_email_enabled: true,
  hook_send_email_uri: "https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/auth-email-hook",
  hook_send_email_secrets: $secret
}' > ~/.c8-secrets/hook_on.json

curl -sS -X PATCH "$API/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "User-Agent: curl/8.5.0" \
  -H "Content-Type: application/json" --data "@$HOME/.c8-secrets/hook_on.json" \
  | jq '{hook_send_email_enabled, hook_send_email_uri}'
rm -f ~/.c8-secrets/hook_on.json
```

Optional, same PATCH style: the default mailer's low email rate limit no longer applies to the
hook, but `rate_limit_email_sent` still caps sends per hour. Before the 29 parents all reset at the
switch, raise it (for example `{"rate_limit_email_sent": 100}`).

## 6. Check it end to end

With a London QA login (uk1/uk2, agentmail.to inboxes), on the London test site:

1. Forgot password -> email "Reset your Collabor8 password" arrives -> the button opens
   `byrwtxdalhsmvktuzoya.supabase.co/auth/v1/verify...` -> lands on `/reset-password` signed in ->
   new password works.
2. New sign-up -> "Confirm your email for Collabor8" -> lands on `/dashboard`.
3. Change email in settings -> both addresses get "Confirm your new email for Collabor8" (secure
   email change) and the change completes after confirming.
4. Admin magic link on /admin -> "Your Collabor8 sign-in link".
5. Function logs: one `sent {"type":"..."}` line per email, no addresses or tokens anywhere.

QA addresses get the same real emails as parents, with no `[TEST]` prefix.

## Rollback (any time)

Turn the hook off. Auth goes straight back to the previous mailer; nothing else changes.

```bash
curl -sS -X PATCH "$API/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "User-Agent: curl/8.5.0" \
  -H "Content-Type: application/json" --data '{"hook_send_email_enabled": false}' \
  | jq '{hook_send_email_enabled}'
```

Know what "previous mailer" means: with no SMTP set, it is Supabase's default mailer, which is
heavily rate limited and only delivers to addresses of members of the Supabase organisation. That
is fine for team QA but **parents will not get emails** on it. If the hook has to stay off for long
after the switch, set Resend SMTP instead (`smtp_host` `smtp.resend.com`, port 465, user `resend`,
password = the Resend API key, sender on notify.collaborate8.com); that also needs the verified
domain and is a separate auth config change for Rafa to approve.

To remove everything: disable the hook (above), then
`supabase secrets unset SEND_EMAIL_HOOK_SECRET --project-ref $PROJECT_REF` and optionally
`supabase functions delete auth-email-hook --project-ref $PROJECT_REF`.

## What the function does (for reviewers)

- `supabase/functions/auth-email-hook/index.ts`: wires the handler to `sendResendEmail`.
- `supabase/functions/auth-email-hook/handler.ts`: checks the signature, plans, renders the branded
  React Email templates in `_shared/email-templates`, sends, returns `200 {}` or
  `{"error":{"http_code":..,"message":..}}`. Resend idempotency key = `auth-<webhook-id>-<label>`,
  so Supabase's retries do not send duplicates.
- `supabase/functions/_shared/auth-email-rules.ts`: signature check, link building, which emails go
  to which address (including Supabase's reversed `token_hash` / `token_hash_new` names for secure
  email change), subjects.
- Tests: `tests/authEmailHook.test.ts` (bun) and
  `supabase/functions/auth-email-hook/handler.denotest.ts`
  (`deno test --allow-env --allow-net=127.0.0.1 handler.denotest.ts`, signed with the official
  standardwebhooks library).
