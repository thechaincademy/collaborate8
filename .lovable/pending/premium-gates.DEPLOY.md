# Premium AI and upload gates - deployed 23 October 2026

Approved function copies and storage enforcement were deployed on 23 October 2026. Frontend publishing remains the user's action.

Copy only when explicitly approved:
- `_shared.premium-access.ts` -> `supabase/functions/_shared/premium-access.ts`
- `chat-rewrite.index.ts` -> `supabase/functions/chat-rewrite/index.ts`

Deploy `chat-rewrite` with the existing shared conversation-tool access rule.
Apply `premium-chat-storage.sql` as a migration only when explicitly approved.
Publish the frontend gates together with server/storage enforcement.

AI prompts are static `CONVERSATION_STARTERS` in ChatTab, not an edge function.
They are gated in the UI, including selecting an already-visible starter.
Chat, Documents, and decision-thread uploads all write directly to chat-attachments.
Receipts and existing attachment reads/deletes are unchanged.

Authenticated clients check `conversation-tool-access` with `{ "action": "status" }`.
Allowed: `{ "hasAccess": true, "access": { ... } }`.
Locked: `{ "hasAccess": false, "expiredAt": "ISO timestamp or null" }`.
Protected rewrite denial: HTTP 402 `{ "error": "premium_required", "feature": "rewrite" }`.
Storage RLS denial is HTTP 403, not this JSON contract; UI rechecks entitlement and opens the paywall.

This deliberately matches caller-owned entitlement from the existing status endpoint.
It does not create shared premium access for the linked co-parent.
No emails, payment sessions, Stripe changes, or database writes are part of staging or tests.