
## Goal

Rework signup, the post-signup "account created" screen and the password reset screen with new copy, role selection up front, updated pricing, inline validation, and a subtle warm-clay accent introduced into the design system.

## Scope

Frontend + a small auth tweak. No new tables, no migrations. The clay accent is added as a design token so it can be rolled into other pages over time.

---

## 1. Design system - add the warm-clay accent

`src/index.css` + `tailwind.config.ts`:

- New HSL token `--accent-clay` set to `#b8624a` (≈ `hsl(13 47% 51%)`), plus a `--accent-clay-soft` tint (`hsl(13 47% 95%)`) for surfaces.
- Wire `accent` and `accent-foreground` in Tailwind so existing components can use `bg-accent-clay`, `text-accent-clay`, `bg-accent-clay-soft`.
- Don't repaint the whole app - reserve clay for: signup CTAs, progress bar, selected plan/role cards, success check icons, and small highlights. B&W stays the base.

## 2. Sign-up flow (`src/pages/SignUp.tsx`)

New step order, role moved to step 1:

```
role → name → email → password → coparent → subscription → verify
```

Progress bar updated to 7 steps. Back nav updated.

### Step 1 - Role (NEW)

Title: **Which parent are you?**
Subtitle: "Please choose the correct option - it controls which dashboard you see."

Two large radio cards:
- **The parent making payments** - "You'll set up and manage the arrangement."  → `role: "managing"`
- **The parent receiving payments** - "You'll see the arrangement once it's set up."  → `role: "viewing"`

Selected card uses clay border + clay-soft background.

Continue is disabled until a role is chosen.

### Inline validation (replaces the at-the-end errors)

- **Email step**: on blur (debounced), call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` against the API only as a feature-flag-friendly client-side check is unreliable. Instead use a lightweight call to our own edge function or just rely on the existing pattern: validate format inline, and attempt account creation early by calling `supabase.auth.signUp` after the password step's "Continue" but before the coparent step, surfacing **"This email already has an account"** immediately if `error.message` indicates so. If the signUp succeeds we keep the session and the later steps just update profile/invitation (already the pattern in `handleSignUp`'s second half, so the second submit becomes profile-update + invitation-create only). This removes the "fail at the end" problem cleanly.
- **Password step**: live strength check while typing - min 8 chars, mixed case, a number. Show inline red helper text the moment a rule fails and a green check when it passes; Continue stays disabled until all rules pass. Update copy: "Use 8+ characters with a number and mixed case."
- **Name step**: trim + length check inline (already partly there).

### Coparent step copy (replace)

> "After you sign up, your co-parent will receive a unique invite code so they can create their account. You'll also receive a copy of this code."

(Keep the optional email input + Skip.)

### Subscription step copy (replace)

Title: **Choose your plan**
Subtitle: "Pick the option that works best for you."

Plans:
- **Monthly - £7.99/month**
- **Annual - £84.99/year** with auto-calculated **"Save 11%"** badge (`1 - 84.99 / (7.99*12)`).

Remove the role-question wording from this step (role is already step 1).

### Verify / "Account created" step

Replace body copy with:

> "An invite code has been shared with your co-parent. This is the code they'll use to create their account. You may want to send a copy to them."

Remove the "You can now set up your maintenance arrangement." line entirely.

Only one button: **Go to Dashboard** → `/dashboard`. Remove "Complete Onboarding" (and the link to `/post-signup`).

The success check icon uses clay.

## 3. Forgot Password (`src/pages/ForgotPassword.tsx`)

Replace the success block:

- Title stays **Check your inbox**
- Body replaced with the exact line requested:
  > **Click here to reset your password.**
  
  (the line is itself a link/button that re-opens the user's mail client via `mailto:` is overkill - instead it routes to `/login` and we keep a secondary "Resend email" link beneath that re-triggers `resetPasswordForEmail`).

Also fix the broken UI on this page:
- Replace the Search icon with `Mail`, change placeholder from "Search" to "Email address", and remove the `fixed` button positioning (use the same in-flow pattern as the rest of the app).

### Password reset email not arriving - investigation note

The verified Lovable email domain is `notify.jobs.thechaincademy.com` (a leftover from another project) - not collaborate8.com. Out of scope for this turn, but I'll flag it in the closing message so the user can decide whether to set up a dedicated sending domain. No code change required here.

## 4. Routing

`src/App.tsx`: remove the `/post-signup` route (or leave the route file but unlink it). Sign-up's final CTA now goes straight to `/dashboard`.

## 5. Profile / invitation save (`handleSignUp` refactor)

Because we move account creation earlier (for inline "email exists" feedback), the final step becomes:

1. Generate invite code.
2. Update `profiles` with `first_name`, `last_name`, `role` (from step 1), `invite_code`.
3. Insert into `invitations`.
4. Optionally invoke `send-invite-email`.
5. Set `generatedCode` and move to `verify`.

No DB changes - `profiles.role` already accepts `'managing' | 'viewing'`.

## 6. Out of scope

- Real Stripe checkout / payment for the new £7.99 / £84.99 plans (just the selection UI for now).
- Sending-domain swap for password reset emails (will surface as a follow-up question).
- Repainting the rest of the app with clay - tokens added now, broader rollout later.

## 7. Files touched

- `src/index.css`, `tailwind.config.ts` - add clay tokens.
- `src/pages/SignUp.tsx` - new role step, reordered steps, inline validation, copy updates, single Dashboard CTA.
- `src/pages/ForgotPassword.tsx` - copy + UI fix.
- `src/App.tsx` - drop `/post-signup` link (route can stay).

## 8. Verification

- Walk through the 7-step signup at mobile width; confirm role drives `profile.role`, email-in-use error appears immediately, password helper updates live, plans show £7.99 / £84.99 with "Save 11%" badge, final screen has only "Go to Dashboard".
- Open Forgot Password → submit → see new "Check your inbox" copy with the new line, no broken fixed button.
- Confirm clay accent appears only in the planned spots; the rest of the app is unchanged.
