# Premium gating - status report (read-only, nothing to build)

Approving or skipping this changes nothing. It is the report requested.

## (a) Files
Preview frontend changed:
- src/components/dashboard/ChatTab.tsx (upload button, AI prompt starters, Rewrite calmly gated)
- src/components/dashboard/DocumentsTab.tsx (upload gated)
- src/components/dashboard/DecisionThreads.tsx (photo/document upload gated)
- src/components/dashboard/RewriteComposer.tsx (rewrite gated, handles 402)
- src/components/dashboard/PremiumGate.tsx (new: usePremiumGate + PremiumPaywall, reuses ConversationToolModal)
- src/lib/premium.ts (new: isPremiumRequired parser)
- tests/premium.test.ts (new), AGENTS.md, roadmap.md

New in .lovable/pending/:
- _shared.premium-access.ts -> supabase/functions/_shared/premium-access.ts
- chat-rewrite.index.ts -> supabase/functions/chat-rewrite/index.ts
- premium-chat-storage.sql (migration, not applied)
- premium-gates.DEPLOY.md

## (b) Git output
`git status --porcelain supabase/functions supabase/migrations`: empty.

`git diff HEAD~3 --stat -- supabase/` lists 13 files (config.toml, conversation-tool-access-rule.ts, founder-signature/founder-welcome/premium-renewal-reminder/product-update/registry/user-welcome templates, conversation-tool-access, founder-welcome-email, stripe-webhooks), 506 insertions, 44 deletions. These are NOT from this task: `git log -- supabase/` shows the last commits touching supabase/ at 14:29 and 14:29:55 UTC, which is the earlier approved publish step (copy pending files + deploy). The premium gating commits are 15:42-15:45 UTC and touch only .lovable/pending/, src/, tests/, AGENTS.md, roadmap.md. No migration files changed. No SQL was run on the live database in this task (only a read of pg_policies).

## (c) Entitlement check
Endpoint: edge function `conversation-tool-access` (authenticated, user's bearer token).
Request: `{ "action": "status" }`
Allowed: `{ "hasAccess": true, "access": { ...access row } }`
Locked or expired: `{ "hasAccess": false, "expiredAt": "<ISO date or null>" }`

## (d) Blocked responses
- AI rewrite (pending chat-rewrite): HTTP 402 `{ "error": "premium_required", "feature": "rewrite" }`. Not live yet; live chat-rewrite still runs for everyone server-side.
- AI prompts: no server call exists. They are fixed starter prompts in ChatTab, so they are gated in the UI only. No 402 applies.
- Uploads: go straight to storage (bucket chat-attachments), so gated by the pending SQL file premium-chat-storage.sql: SECURITY DEFINER `public.has_premium_access(uid)` plus a RESTRICTIVE INSERT policy "Chat attachments require premium insert". When applied, a denied upload returns storage's HTTP 403 (not the 402 JSON); the UI rechecks access and opens the paywall. Reads, deletes and receipts unchanged. Until applied, uploads are only blocked in the UI.

## (e) Paywall wording (existing pop-up, reused)
- Heading: "Start the financial conversation."
- Price line: "£4.99 a month, billed as £59.88 a year. Renews automatically each year. Cancel anytime. Only one parent pays. Your co-parent joins for free."
- Pay button: "Subscribe for £59.88 a year"
- Expired: "Your access ended on {date}. Subscribe for £59.88 a year to unlock again."
- Promo entry button: "Unlock for £4.99 a month, paid yearly"

## (f) Product tracker
No product tracker found (no file, table or page; search for "tracker" only hit analytics, FAQ and tool pages). roadmap.md is a task list without numbered item #16. Item #16 and Rafa's approval cannot be verified.

## (g) Not done / caveats
- Server enforcement is pending only: chat-rewrite gate and storage policy are not deployed or applied.
- Access is per paying parent (caller's own row); the linked co-parent does not inherit Premium, which conflicts with "Your co-parent joins for free". Needs a decision before deploy.
- Real signed-in linked-parent flow not tested end to end (paywall checked with sample data only).
- Webhook still missing customer.subscription.created, invoice.paid, invoice.upcoming in Stripe (from earlier).
