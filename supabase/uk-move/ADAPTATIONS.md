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
5. **SUPERSEDED (see 16).** **Schema Lovable never committed as migrations.** The live database has objects that appear in `src/integrations/supabase/types.ts` but in no migration. Reconstructed from the generated types in `uk_05b_reconstruct.sql` (copy in repo: `supabase/uk-move/reconstructed_untracked_lovable_objects.sql`, deliberately NOT in supabase/migrations because it would overwrite live function bodies):
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

## Update 18 Nov 2026: exact live schema, DSL-only access, Vertex
16. **Exact baseline replaces the reconstruction.** The live schema was read read-only (pg_catalog / information_schema / pg_policies only, no rows). `supabase/migrations/20261118110000_baseline_missing_live_objects.sql` adds every object that exists on live but in no migration: the 11 untracked tables (CREATE TABLE IF NOT EXISTS), the columns added outside migrations (ADD COLUMN IF NOT EXISTS), the live function bodies, policies, triggers (including `zz_messages_move_tone_private`) and the view. It is ordered before `20261118120000_safeguarding.sql`, so the PR #2 delta can rely on `message_tone_private`. `reconstructed_untracked_lovable_objects.sql` is kept for history only; do not apply it. Left out on purpose: `dispatch_notification_email` (hardcoded project URL, see 2) and the `pg_net` schema placement (live uses a different schema).
17. **Cron jobs.** `supabase/uk-move/cron_jobs.template.sql` holds all 6 live jobs with `<PROJECT_REF>`. The Bearer comes from vault `email_queue_service_role_key`, the apikey from vault `project_anon_key`. On UK, payment-due-reminders, founder-welcome-email-hourly and purge-deleted-account-data are not created yet (they need `project_anon_key` in vault and would send email or purge data).
18. **weekly-admin-report** now has `verify_jwt = false` and checks the Bearer itself against `SUPABASE_SERVICE_ROLE_KEY` (constant-time). The new key format is not a JWT, so the gateway JWT check refused the cron. Anything else gets 401.
19. **DSL-only lead data** (PR #2 migration `20261118121000_safeguarding_dsl_only_access.sql`). Safety flags, concerns, suitability answers, family pause state and the safeguarding audit log are readable only by the `dsl` role (`sg_is_dsl`). Pause and `sg_dsl_overview` need `dsl`. Admin keeps only `admin_monitoring_summary`, which is now system health only (`20261118140000_admin_monitoring_health_only.sql`, no concerns or paused_families). The /dsl page checks the role before loading. On live, Rafa and Jade each need a `user_roles` row with role `dsl` (a data change that needs Rafa's yes).
20. **sg_global_enabled** is revoked from parents. The two RLS policies that called it now use caller-scoped definer helpers. Clients get the global state from `sg_family_status.safeguarding_enabled`.
21. **Messages cutover.** `supabase/manual/APPLY_AFTER_APP_BUILD_messages_realtime_cutover.sql` was applied on the UK test project only. It revokes table SELECT on `public.messages` and grants back the shared columns (a column-only REVOKE has no effect while the table grant exists). On live it stays a manual step, in this order: 1 `NEEDS_RAFA_APPROVAL_live_chat_privacy_step1.sql` (additive), 2 a store build that reads `messages_caller` reaches parents, 3 the cutover file.
22. **chat-rewrite on Vertex AI London** (`_shared/vertex.ts`). europe-west2, project collaborate8-c9e7f, model `VERTEX_MODEL` (default gemini-3.5-flash). The OAuth token is minted from `GCP_VERTEX_SA_JSON` (RS256 JWT, WebCrypto) and cached until expiry. Structured output uses `responseJsonSchema` (the older `responseSchema` field returned 429 for the send schema). Send mode makes 1 model call by default (`CHAT_REWRITE_SEND_PARALLEL`, max 3) because the new project's quota refuses parallel calls. No message text is logged.
