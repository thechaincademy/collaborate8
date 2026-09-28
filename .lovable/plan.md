# Add Apple and Google sign-in

## What will change
- Add reusable, officially styled Apple and Google sign-in controls to the Login page beneath the email and password fields, before Log In.
- Add the same controls to the Create Account password step beneath the existing password field, before Continue.
- Enable both managed sign-in providers and connect both controls through the existing authentication service.
- Send successful email, Apple, and Google sign-ins directly to `/dashboard`, removing the obsolete post-signup route from the app.

## Technical details
- Keep the current email/password fields, validation, copy, and account setup steps unchanged.
- Use semantic Apple/Google button tokens so official brand colours are isolated to these two controls.
- Use a same-origin public OAuth return and immediately resolve authenticated users to the dashboard after session restoration.
- Preserve the current profile records and automatic profile creation already used by the app.

## Verification
- Confirm both pages show the divider and two full-width controls in the requested order.
- Confirm the app builds cleanly and successful authentication targets the dashboard without the old intermediate route.
