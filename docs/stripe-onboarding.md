# Stripe payout onboarding contract

Collabor8 does not store sort codes or account numbers. Stripe collects payout details on a hosted page.

The website and the Flutter app use the same edge function. The function does not trust a missing `Origin` header: the Flutter app sends none, and the return URLs then use `https://collaborate8.com`. An `Origin` is used only when it is `https://collaborate8.com`, `https://www.collaborate8.com`, or localhost / `127.0.0.1` (any port) for development.

## Open onboarding or update payout details

Call, with the user's JWT:

```http
POST /functions/v1/stripe-connect
Authorization: Bearer <user access token>
Content-Type: application/json

{ "action": "create-account" }
```

Response:

```json
{ "url": "https://connect.stripe.com/...", "accountId": "acct_..." }
```

`create-account` creates a Connect account when the parent does not have one, and always returns a fresh hosted link. Use the same call to add or update payout details. Open `url` in the secure browser (custom tab or SFSafariViewController). Do not open it in a web view that can see the page.

## When the browser closes

```http
POST /functions/v1/stripe-connect
Authorization: Bearer <user access token>
Content-Type: application/json

{ "action": "check-status" }
```

Response:

```json
{
  "status": "not_created | pending | pending_capabilities | complete",
  "payoutsEnabled": true,
  "chargesEnabled": true,
  "accountId": "acct_...",
  "detailsSubmitted": true
}
```

`not_created` has no `accountId`. Read payout status from this response. Do not read `coparent_bank_accounts.sort_code`, `account_number`, or `bank_connections.sort_code`.

Existing stored bank rows are left in place until Rafa applies `supabase/manual/NEEDS_RAFA_APPROVAL_remove_stored_bank_details.sql` by hand. `supabase db push` does not run files in `supabase/manual`.
