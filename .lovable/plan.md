
## Goal

Replace the "Coming Soon" Expenses tab with the visual layout from the mockup, restyled to the project's black/white/grey design system. No backend wiring this round.

## Scope

Frontend-only. `src/components/dashboard/ExpensesTab.tsx` is the only file edited. No Supabase, Stripe, or storage changes.

## What the new tab looks like

Header (using existing `DashboardHeader` for the in-app top bar):
- Title: **The Tab.**
- Subtitle: **Log it. Split it. Done.**
- One-line intro under the subtitle: "Log expenses and stay on the same page."

Two summary stat cards side-by-side:
- **This month** - £ total (placeholder).
- **Still to settle** - £ total (placeholder, slightly emphasised but still in the mono palette - no green/orange).

Section: **Waiting to settle** (small uppercase label)
- Two static example expense cards, each with:
  - A neutral mono icon tile (no coloured backgrounds - use `bg-muted` with `text-foreground`).
  - Title, date · "Your share: £X".
  - Total amount on the right.
  - Footer bar with "Logged by ..." on the left, and on the right either:
    - A **Settle £X** button (primary B&W button, non-functional - shows a toast "Coming soon") when the other parent logged it.
    - A **Waiting on ...** pill when you logged it.

Section: **Settled** (small uppercase label)
- One faded example row (mono icon, title, date · Split 50/50, amount, "Settled" sublabel).

Bottom CTA inside the card:
- **+ Add to the tab** button (primary B&W, full width). On click → shows toast "Coming soon". A small caption underneath: "You'll be able to attach a receipt when logging an expense."

No new bottom nav - the existing `MobileLayout` bottom tabs stay as they are.

## Design rules applied

- Strip all greens (`#1D9E75`, `#0F6E56`) and coloured icon tiles from the mockup; replace with `bg-muted`, `text-foreground`, `text-muted-foreground`, and existing primary tokens.
- Use existing card shapes (`rounded-2xl bg-card`) and border style already used in `MaintenanceTab`.
- Mobile-first within the existing `max-w-md` shell.
- `motion.div` fade-in transitions consistent with other tabs.

## Out of scope (deferred, per your answers)

- Real Settle charge (will reuse the maintenance Stripe card later - no chooser UI, no multi-card support for now).
- Real expense logging form, receipt upload to the `receipts` bucket, and reading from `expense_requests`. The structure is ready (`expense_requests` table + bucket already exist) - we'll wire it in a follow-up.
- Bottom nav changes.

## Verification

- Open `/dashboard` and switch to Expenses tab.
- Confirm: new header, intro line, two stat cards, two "Waiting to settle" rows (one with Settle button, one Waiting), one Settled row, and "Add to the tab" button.
- Confirm: no green, orange, or coloured tile backgrounds anywhere - everything reads in the existing B&W palette.
- Confirm: Settle and Add buttons show a "Coming soon" toast and don't navigate.
