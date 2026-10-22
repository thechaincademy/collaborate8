# Chat conversation tool: £59.88 one-off for 12 months access

## Correction on the current state
The live edge function does **not** charge `price_1UTKaICN8qgG26mrbAmb9VzQ` (£4.99 one-off). It was reverted and redeployed in the previous turn and now charges `price_1UF8lmCN8qgG26mrxyfT0C5u` (£29.99 one-off). The £4.99 one-off price exists in Stripe but nothing uses it. The live site's button text is an older build. In preview it says "£4.99 - one-off payment". So right now live charges £29.99.

## 1) New Stripe price
- Create one live price on `prod_VFe3hx29MYgCMR`: 5988 pence, GBP, one-time (no `recurring`), nickname "12 months access".
- Leave `price_1UF8lmCN8qgG26mrxyfT0C5u` (£29.99) and `price_1UTKaICN8qgG26mrbAmb9VzQ` (£4.99) as they are, active but unused.
- Check the new price by reading it back from Stripe (amount, currency, type, product).

## 2) How access works now, and the minimal change
Now:
- Table `conversation_tool_access`, one row per user (`user_id` is unique). Columns: `source` ('payment' or 'promo'), `promo_code`, `provider_session_id`, `amount`, `currency`, `granted_at`, `created_at`. There is no expiry.
- Access is granted only by the `conversation-tool-access` edge function: `verify-session` reads the Checkout session back from Stripe after the redirect (`payment_status = 'paid'`, metadata user matches) and upserts the row. `redeem-promo` (code "4321") upserts a row with source 'promo'. No webhook is involved: `stripe-webhooks` doesn't handle this product.
- `status` and `create-checkout` treat "a row exists" as access, forever.

Change:
- Add a nullable `expires_at timestamptz` column.
- `verify-session`: set `granted_at = now()` and `expires_at = now() + 12 months`. Paying again after expiry overwrites the same row (the upsert is already keyed on user_id), so a renewal starts a new 12 months.
- Access check (one helper used by `status` and `create-checkout`): access counts only if a row exists and `expires_at` is null or in the future. When it has expired, `status` returns `hasAccess: false` with `expiredAt`, and `create-checkout` lets them pay again.
- Use the new price ID. Change the code comment to £59.88.
- Assumption to confirm: promo-code access also lasts 12 months from redemption. The alternative is that promo access never expires (expires_at null).

## 3) Existing users who already unlocked
- The table has **0 rows**: no one has paid and no one has redeemed a promo. Nobody needs migrating or protecting.
- To be safe, the migration still fills `expires_at = granted_at + 12 months` for any existing row.

## 4) Wording (ConversationToolPromo.tsx)
- `CONVERSATION_TOOL_PRICE` becomes "£59.88".
- Button (line 495): "Unlock for £59.88 a year".
- Promo line (427): "£59.88 one-off payment for 12 months access. It doesn't renew automatically. Only one parent pays. Your co-parent participates for free."
- Pay button (449): "Pay £59.88 and start".
- If access has expired: "Your 12 months access ended on {date}. Pay £59.88 to unlock for another 12 months."
- These avoid the words "monthly", "yearly" and "subscription" and don't mention £4.99, following the pricing copy rule. Note: the "£4.99 Premium subscription" claim on the marketing pages, FAQ and About no longer matches this model. I'll list those lines for a separate copy fix and won't change them in this task.

## 5) What goes live when, and the order of steps
- Migration (adds `expires_at` and fills existing rows): applies to the live database straight away. It's harmless because nothing reads it yet.
- Stripe price: goes live as soon as it's created, but stays unused until the function points at it.
- Edge function: goes live as soon as it's deployed, before publishing.
- Button and promo wording: only goes live when you publish, and publishing is still on hold because of the other held-back changes.

Order:
1. Create the £59.88 price and read it back.
2. Apply the migration.
3. Update the wording and the expired-access state in preview, and run `npx vite build`.
4. Deploy the edge function, then publish straight away so the live price and button text change together. Keep the gap to minutes. If you don't want to publish yet, hold step 4: live keeps charging £29.99 with the old live wording. Deploying without publishing would leave live charging £59.88 while showing the old text.
5. Check the function's `status` against a test account, and check that the new price reads back from Stripe.

## Technical details
- Migration: `ALTER TABLE public.conversation_tool_access ADD COLUMN expires_at timestamptz; UPDATE ... SET expires_at = granted_at + interval '12 months' WHERE expires_at IS NULL;` The existing grants and RLS stay as they are, and types.ts gets regenerated.
- Add a small test of the expiry rule: active the day before expiry, locked once it's passed.
