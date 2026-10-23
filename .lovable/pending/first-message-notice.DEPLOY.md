# First-message notice wording - pending deployment

Not deployed. Do not send emails or invoke a sender during verification.

## Copy target after approval

- `.lovable/pending/_shared.transactional-email-templates.first-message-notice.tsx` -> `supabase/functions/_shared/transactional-email-templates/first-message-notice.tsx`

## Functions to redeploy after approval

- `send-first-message-notice`: the only sender calling `sendTemplateEmail("first_message_notice", ...)`.
- `preview-transactional-email`: refresh the shared registry bundle so the preview shows the corrected template. This is not a sender.

No other sender calls this template. No registry change, SQL, Stripe change, frontend publish or test email is required.

## Exact wording change

- Old: Your co-parent has joined Collabor8 and has written you a message in the financial chat.
- New: Your co-parent has sent you a message on Collabor8. Join to read it and reply.

Subject, heading and preview remain "Your co-parent has reached out on Collabor8". They do not imply either parent has just joined. The remaining invitation text correctly asks the recipient to join, so it is unchanged. Styling, links and the automated-email disclaimer are unchanged.
