# Project Architecture Rules
- Financial history uses the shared profile display helper and Chat's shared DeletedUserLabel for missing profile links; never derive initials or avatars from deleted identities.
- Device push tokens reference public.profiles with cascading deletion and use owner-only RLS, because application tables must not reference the managed auth schema directly.
- AI writing aids and chat/document uploads share the caller-owned conversation-tool entitlement and existing paywall; enforce rewrite access in the shared premium-access function and uploads with a restrictive storage policy, because UI gating alone is not a security boundary.

- Documents live as a Chat/Documents switch inside Financial Chat, not as a dashboard bottom-navigation destination, because document sharing belongs to the communication flow.
- Do not show an onboarding tutorial or tutorial progress prompts, because onboarding must not interrupt access to the app.
- Reuse InstallAppButtons for browser access and home-screen instructions, and FooterContact for public footer contact details, to keep accuracy updates consistent.
- Public-page calls to action resolve their destination through useAppCtaHref, because a signed-in parent must go into the app rather than back to the sign-in page.
- Public SEO resource pages under /resources/* are built with ResourceArticle (FAQ and breadcrumb JSON-LD from the same props as the visible content), and every indexable route sets its own canonical via Helmet, because index.html must not carry a site-wide canonical.
- Keep the payer's sequential setup in PayingParentSetup, use hosted Stripe actions and verified subscription status for completion, and keep drafts session-scoped; this isolates the receiver journey and prevents local state from implying live payments.
- Generate public-route HTML heads from the route metadata list via the Vite build plugin, leaving the SPA body and runtime Helmet intact, because link-preview crawlers do not execute JavaScript.
- Schedule GA4 page views through the shared title-aware tracker with cancellable navigation waits, because Helmet updates titles after route effects and consent acceptance must use the same timing rules.
- Reuse the checkout modal's premium-only variant for feature gates and keep its questionnaire variant for the Chat tool; merge chat fetch/realtime rows by ID and preserve pending-message timestamps to avoid stale empty lists and changed chronology.
- Post-signup payment-direction routing uses the shared maintenance onboarding helpers; automatically assigned viewing roles require local confirmation before Connect, because invite signup does not establish actual maintenance direction.
- Account deletion runs through one shared server-side routine used by both the signed-in and email-link flows, so every path cancels Stripe, keeps shared co-parent records with null links and removes personal rows the same way.
