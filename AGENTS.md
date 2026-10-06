# Project Architecture Rules

- Documents live as a Chat/Documents switch inside Financial Chat, not as a dashboard bottom-navigation destination, because document sharing belongs to the communication flow.
- Do not show an onboarding tutorial or tutorial progress prompts, because onboarding must not interrupt access to the app.
- Reuse InstallAppButtons for browser access and home-screen instructions, and FooterContact for public footer contact details, to keep accuracy updates consistent.
- Public-page calls to action resolve their destination through useAppCtaHref, because a signed-in parent must go into the app rather than back to the sign-in page.
