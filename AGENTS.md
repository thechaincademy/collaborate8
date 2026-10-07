# Project Architecture Rules

- Documents live as a Chat/Documents switch inside Financial Chat, not as a dashboard bottom-navigation destination, because document sharing belongs to the communication flow.
- Do not show an onboarding tutorial or tutorial progress prompts, because onboarding must not interrupt access to the app.
- Reuse InstallAppButtons for browser access and home-screen instructions, and FooterContact for public footer contact details, to keep accuracy updates consistent.
- Public-page calls to action resolve their destination through useAppCtaHref, because a signed-in parent must go into the app rather than back to the sign-in page.
- Public SEO resource pages under /resources/* are built with ResourceArticle (FAQ and breadcrumb JSON-LD from the same props as the visible content), and every indexable route sets its own canonical via Helmet, because index.html must not carry a site-wide canonical.
- Keep the payer's sequential setup in PayingParentSetup, use hosted Stripe actions and verified subscription status for completion, and keep drafts session-scoped; this isolates the receiver journey and prevents local state from implying live payments.
