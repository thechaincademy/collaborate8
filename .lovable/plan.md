# Plan: Keep the drizzle migration tooling (no changes)

## Question answered
The user asked whether drizzle-kit, drizzle-orm, drizzle.config.ts and the drizzle/ folder can be removed. Verified answer: no — they are required by the migration tooling.

## Findings (verified by reading the files)
- `drizzle-kit` and `drizzle-orm` are devDependencies only; nothing in `src/`, `vite.config.ts` or `scripts/` imports them, so they never ship in the app bundle.
- The migration tool creates and applies migrations with drizzle-kit and owns `drizzle/migrations/meta/_journal.json` and the snapshots. Removing them corrupts migration history tracking and breaks future migrations.
- `drizzle/schema.ts` is a required blank placeholder; `drizzle.config.ts` holds no credentials (the connection is supplied at apply time).
- `supabase/migrations/` (older migrations) and `drizzle/migrations/` (the two new ones) coexist intentionally; merging or moving them would break the journal.

## Action
No file changes. Recommend keeping all drizzle files and packages as-is.
