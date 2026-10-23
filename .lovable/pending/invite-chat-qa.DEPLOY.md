# Invite chat QA - pending backend changes

## Deploy target

`.lovable/pending/invite-first-message-delivery.sql` -> a new application migration after explicit approval.
No function file changes or function redeploys are required for this SQL fix.
No SQL has been executed. No emails were sent during this task.

## Changes

- Add a nullable pending-message identifier and unique index to messages.
- Atomically deliver undelivered first messages when the two profile links become reciprocal.
- Preserve the authoritative pending row's created_at as the message timestamp.
- Lock pending rows and claim them in the insertion transaction to prevent duplicate delivery.
- Keep existing participant-only SELECT and linked-parent INSERT policies unchanged.
- Preview client preserves original created_at; its fallback insert is recognized by the claim trigger.
- Publish the timestamp-preserving frontend alongside this migration. Older clients that insert without the original created_at cannot be recognized by that timestamp-based fallback claim.
- No historical timestamp backfill: matching old delivered rows by body alone is ambiguous.

## Validation after separate approval

Use isolated linked-parent test data and suppress email dispatch before write tests. Test sender offline at invite acceptance, subscriber reconnection, concurrent fallback delivery, original timestamp and duplicate prevention. Applying the SQL does not itself backfill/deliver messages, but future linking/insertion can fire the existing new-message notification/email triggers. Do not invoke email senders as a smoke test.

## Other pending wording

The earlier first-message-notice template correction has its own `first-message-notice.DEPLOY.md`. It is not copied or deployed by this QA task.