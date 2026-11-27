# Admin magic-link email (needs Rafa's yes)

The web app can send people to the admin confirm page, but the email itself is built
by the `auth-email-hook` edge function. That function is not deployed in this change.

When Rafa says yes, deploy only this function (not other functions, not auth config
unless the allow list has drifted):

```bash
# from the collaborate8 repo, branch cursor/access-request-email-1127
supabase functions deploy auth-email-hook --project-ref byrwtxdalhsmvktuzoya --no-verify-jwt
```

What the new hook does:

- If the sign-in was requested from an admin page, the email subject is
  "Your Collabor8 admin sign-in link", the button says "Sign in to admin",
  and the link is `{same origin}/admin/confirm?token_hash=...&type=magiclink&next=/admin/...`
- Parent app sign-in emails are unchanged (`/auth/confirm`, existing copy).

## Auth config (read-only check; only change if it has drifted)

Last known `uri_allow_list` already includes:

- `https://collaborate8.com/**`
- `https://www.collaborate8.com/**`
- `https://collabor8-uk-test.rafa-f1b.workers.dev/**`

On 27 Nov 2026 at 11:04 UK, a live admin magic-link request with
`redirect_to=https://collaborate8.com/admin/access-requests` was accepted (HTTP 200),
so prod `/admin/**` is already allowed. Do not PATCH auth config unless a new
read of `GET /v1/projects/byrwtxdalhsmvktuzoya/config/auth` shows the test
Worker origin missing. If it is missing, the only change to apply after Rafa's yes
is to add `https://collabor8-uk-test.rafa-f1b.workers.dev/**` back to `uri_allow_list`.
Leave `site_url` as `https://collaborate8.com`.
