# Collabor8 UK move: adaptations made on collabor8-uk (byrwtxdalhsmvktuzoya)

Date: 18 November 2026 (UK time). Test environment only. Each item below must become a repo change before the real move.
Adapted SQL files: /workspace/c8-uk-move/migrations/ (applied in this order: uk_00 .. uk_07b).

## Migrations
1. **Extensions first** (`uk_00_extensions`): `pg_cron`, `pg_net`, `pgcrypto` (schema extensions), `supabase_vault`. Lovable's migrations assume pg_cron already exists.
   Repo change: add an extensions migration at the start.
2. **Hardcoded project URL**: `eycpkzbjylzzynkfggis.supabase.co` replaced with `byrwtxdalhsmvktuzoya.supabase.co` in
   - 20260909142124 (cron `weekly-admin-report`)
   - 20260915130743 (cron `manual-payment-reminders`)
   - 20260923132824 (`dispatch_notification_email` trigger function)
   - 20261118120000_safeguarding.sql (`dispatch_safeguarding_alert`)
   Repo change: read the base URL from config (for example `public.sg_runtime_config.project_url`, which the monitoring migration adds) instead of hardcoding a project ref.
3. **Cron calls still send a `Lovable-Context: cron` header** (weekly report, manual payment reminders). Harmless, but it is a Lovable reference to remove.
4. **pgmq** (20260713232947): `SELECT pgmq.purge_queue('transactional_emails')` fails on a fresh project, because Lovable created that queue outside migrations. Statement skipped. Repo change: guard it or delete it.
5. **Schema Lovable never committed as migrations.** The live database has objects that appear in `src/integrations/supabase/types.ts` but in no migration. Reconstructed from the generated types in `uk_05b_reconstruct.sql` (copy in repo: `supabase/uk-move/reconstructed_untracked_lovable_objects.sql`, deliberately NOT in supabase/migrations because it would overwrite live function bodies):
   - tables: `app_settings`, `admin_signup_exclusions`, `deletion_requests`, `device_push_tokens`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `google_oauth_tokens`, `message_tone_private`, `store_subscriptions`
   - columns: `conversation_tool_access` (cancel_at_period_end, current_period_end, expires_at, stripe_customer_id, stripe_subscription_id, subscription_status), `messages.pending_first_message_id`, `profiles.welcome_email_sent_at`, `profiles.is_test_account`, `usage_events.anonymous_id`
   - view: `usage_events_reportable`
   - functions: `has_premium_access`, `admin_signup_classification`, `admin_real_signups`, `admin_signup_summary`, `purge_deleted_account_data` (stub, live body unknown)
   Column types and nullability follow types.ts. Defaults, indexes, RLS policies and function bodies are best guesses. Before the real move, get the true DDL with a schema-only `pg_dump` of the live project (needs Rafa's database access; the Supabase connector cannot read the live Lovable Cloud project: "You do not have permission").
6. **realtime.messages RLS** (20261118120000_safeguarding.sql): `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` fails with "must be owner" on a standard Supabase project (owner is `supabase_realtime_admin`, and RLS is already on). Wrapped in `IF NOT relrowsecurity`. Repo change needed in PR #2's migration, otherwise it fails on any non-Lovable project.
7. **PR #2 delta 47fdca2** applied separately as `uk_06b_safeguarding_delta_47fdca2` (messages pause trigger covers DELETE; explicit `GRANT SELECT ON realtime.messages TO authenticated`). The GRANT works as `postgres` on this project.
8. **Vault secret `email_queue_service_role_key`**: Lovable set it by hand. Here a one-time function (`uk-bootstrap-vault`) copied the project's own `SUPABASE_SERVICE_ROLE_KEY` env value into vault, server side only; the value was never returned or seen. The function is now a 410 stub and the helper SQL function was dropped. Note the key in this project is the new non-JWT format.
   Repo change: document this as a setup step (or set it from the dashboard SQL editor).
9. **Monitoring** (`uk_07_monitoring`, `uk_07b`): new; also committed as `supabase/migrations/20261118130000_monitoring.sql` on branch `cursor/uk-monitoring`.

## Edge functions
10. **Bundled single-file deploys.** The connector allows at most 4 file references per call, so each function was bundled with esbuild (`/workspace/c8-uk-move/bundle-functions.mjs`, local `../_shared` imports inlined, `npm:`/`https:` imports left external). Source of truth stays in the repo. With the Supabase CLI (`supabase functions deploy`) this is not needed.
11. **`_shared/safeguarding-notify.ts`** (branch `cursor/uk-monitoring`): non-secret alert settings fall back to `public.sg_runtime_config` when the env var is unset (the connector cannot set function secrets); `force_test_alerts=true` sends every alert, including monitoring, to QA with [TEST]; every attempt is logged to `public.sg_alert_deliveries` (kind, test flag, channel, QA/DSL role, recipient domain only, [TEST] prefix yes/no, status). No message text or phone numbers are logged.
12. `verify_jwt` copied from `supabase/config.toml`; functions not listed there were deployed with `verify_jwt = true`.

## Data / config on the test project only
13. `app_settings.safeguarding_enabled = 'true'` (test project only).
14. `sg_runtime_config`: project_url, anon_key (public), environment=test, qa_alert_email=collaborate8-qa@agentmail.to, force_test_alerts=true. No DSL email, no SMS settings.
15. Four test accounts, all `is_test_account = true` (see test-env.md). A fourth account (`+ukadmin`) holds the `admin` role so the monitoring page and pause controls can be tested without a real founder login.
