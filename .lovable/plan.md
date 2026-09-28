# Inline login on the second screen

## What will change
- Keep the `/splash` screen as the single choice screen with its existing Create account and Log in options.
- When Log in is selected, keep the user on that screen and reveal email and password fields plus a Log in submit button directly beneath it.
- Keep Log in visibly selected while the form is open and de-emphasise, but do not hide or change the behaviour of, Create account.
- After valid credentials are accepted, take the user directly to the dashboard.

## Scope
- Change only the second screen (`/splash`).
- Reuse the existing email/password authentication and error messages.
- Keep Create account navigating to the current account creation flow.
- Do not add Apple or Google sign-in and do not alter the separate login page or any other flow.

## Verification
- Check the default and expanded states on mobile and desktop.
- Confirm Create account still behaves exactly as before.
- Confirm inline login succeeds to the dashboard and invalid details show an error without leaving the screen.
