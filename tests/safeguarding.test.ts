import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CMS_COLLECT_AND_PAY_URL,
  CMS_HOW_TO_APPLY_URL,
  SAFEGUARDING_COPY_STATUS,
  SHARED_PAUSE_NOTICE,
  SUITABILITY_QUESTIONS,
  suitabilityCopy,
} from "../src/content/safeguarding";
import {
  answerOutcomes,
  answersAreComplete,
  collectCopyStrings,
  copyNeedsRevision,
  noticeLeaksWhoOrWhy,
  passwordIsStrong,
  sharedPauseNotice,
} from "../src/lib/safeguarding/logic";
import {
  alertSubject,
  alertText,
  isTestLead,
  QA_ALERT_EMAIL_DEFAULT,
  reviewUrl,
  routeAlert,
  SMS_ON_HOLD,
  smsDecision,
} from "../supabase/functions/_shared/safeguarding-rules.ts";

const contentModule = await import("../src/content/safeguarding");

const calm = { q1: "yes", q2: "no", q3: "no", q4: "no", q5: "no" };

describe("suitability rules", () => {
  it("pauses on Q1 no, Q2 yes, or Q3 yes", () => {
    expect(answerOutcomes({ ...calm, q1: "no" }).pause).toBe(true);
    expect(answerOutcomes({ ...calm, q2: "yes" }).pause).toBe(true);
    expect(answerOutcomes({ ...calm, q3: "yes" }).pause).toBe(true);
    expect(answerOutcomes(calm).pause).toBe(false);
    expect(answerOutcomes({ ...calm, q2: "prefer_not" }).pause).toBe(false);
  });

  it("offers a security check only for Q4 yes, and money guidance only for Q5 yes", () => {
    expect(answerOutcomes({ ...calm, q4: "yes" }).securityCheck).toBe(true);
    expect(answerOutcomes({ ...calm, q4: "unsure" }).securityCheck).toBe(false);
    expect(answerOutcomes({ ...calm, q5: "yes" }).moneyGuidance).toBe(true);
    expect(answerOutcomes({ ...calm, q5: "prefer_not" }).moneyGuidance).toBe(false);
    expect(answerOutcomes({ ...calm, q4: "yes" }).pause).toBe(false);
    expect(answerOutcomes({ ...calm, q5: "yes" }).pause).toBe(false);
  });

  it("asks the five agreed questions with the mobile answer keys", () => {
    expect(SUITABILITY_QUESTIONS.map((question) => question.key)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
    expect(answersAreComplete(calm)).toBe(true);
    expect(answersAreComplete({ q1: "sometimes" })).toBe(false);
  });
});

describe("shared pause notice", () => {
  it("is the same sentence and does not say who or why", () => {
    expect(sharedPauseNotice()).toBe(SHARED_PAUSE_NOTICE);
    expect(sharedPauseNotice()).toBe(
      "Shared tools are paused for now while our team reviews your account. You can still view your records and download your PDF. We'll be in touch within one working day.",
    );
    expect(noticeLeaksWhoOrWhy(sharedPauseNotice())).toBe(false);
    expect(sharedPauseNotice.length).toBe(0);
  });
});

describe("draft copy", () => {
  it("is marked DRAFT and avoids forbidden wording", () => {
    expect(SAFEGUARDING_COPY_STATUS).toBe("DRAFT");
    expect(CMS_COLLECT_AND_PAY_URL).toBe("https://www.gov.uk/child-maintenance-service/payments#collect-and-pay");
    expect(CMS_HOW_TO_APPLY_URL).toBe("https://www.gov.uk/child-maintenance-service/how-to-apply");
    for (const text of collectCopyStrings(contentModule)) {
      expect(copyNeedsRevision(text)).toBe(false);
    }
    expect(suitabilityCopy.reportExplainer.length).toBeGreaterThan(20);
  });
});

describe("alert routing", () => {
  const leads = ["jade@collaborate8.com", "Rafa@collaborate8.com", "collaborate8-qa+uk3@agentmail.to"];

  it("sends real alerts to every safeguarding lead and never to the QA test lead", () => {
    const route = routeAlert(false, leads);
    expect(route).toEqual({ to: ["jade@collaborate8.com", "rafa@collaborate8.com"], role: "dsl", dropped: false });
    expect(routeAlert(false, ["jade@collaborate8.com", "JADE@collaborate8.com "]).to).toEqual(["jade@collaborate8.com"]);
  });

  it("drops a real alert when nobody holds the role, and logs why", () => {
    expect(routeAlert(false, [])).toEqual({ to: [], role: "none", dropped: true, reason: "no_lead" });
    expect(routeAlert(false, ["collaborate8-qa+uk3@agentmail.to"]).reason).toBe("no_lead");
  });

  it("sends test alerts only to the QA inbox, and only when a QA test lead holds the role", () => {
    expect(routeAlert(true, leads)).toEqual({ to: [QA_ALERT_EMAIL_DEFAULT], role: "qa", dropped: false });
    expect(QA_ALERT_EMAIL_DEFAULT).toBe("collaborate8-qa@agentmail.to");
    const realOnly = routeAlert(true, ["jade@collaborate8.com", "rafa@collaborate8.com"]);
    expect(realOnly).toEqual({ to: [], role: "none", dropped: true, reason: "no_test_lead" });
    expect(isTestLead("collaborate8-qa+uk3@agentmail.to")).toBe(true);
    expect(isTestLead("rafa@collaborate8.com")).toBe(false);
  });

  it("marks test subjects [TEST] and names concern reports and safety flags", () => {
    expect(alertSubject("safety_flag", true)).toBe("[TEST] A safety flag needs review on Collabor8");
    expect(alertSubject("concern", true)).toBe("[TEST] A concern report needs review on Collabor8");
    expect(alertSubject("concern", false).startsWith("[TEST]")).toBe(false);
  });

  it("alert text is only a pointer to the review page", () => {
    expect(alertText("concern")).toBe(
      "Collabor8: a concern report needs review. Please open the safeguarding review page to see it: https://collaborate8.com/dsl",
    );
    expect(alertText("safety_flag", "https://collabor8-uk-test.rafa-f1b.workers.dev/")).toBe(
      "Collabor8: a safety flag needs review. Please open the safeguarding review page to see it: https://collabor8-uk-test.rafa-f1b.workers.dev/dsl",
    );
    expect(reviewUrl("javascript:alert(1)")).toBe("https://collaborate8.com/dsl");
    for (const kind of ["concern", "safety_flag", "monitoring"] as const) {
      for (const text of [alertText(kind), alertSubject(kind, true)]) {
        expect(/\d{6,}|@|sort code|account number|\u2014/i.test(text)).toBe(false);
        expect(/police|victim/i.test(text)).toBe(false);
        expect(text.includes("Collabor8")).toBe(true);
      }
    }
  });

  it("never texts a test account and skips SMS when it is not configured", () => {
    expect(smsDecision({ kind: "safety_flag", testAccount: true, outOfHours: true, configured: true })).toBe("skip_test");
    expect(smsDecision({ kind: "safety_flag", testAccount: false, outOfHours: false, configured: false })).toBe("skip_config");
    expect(smsDecision({ kind: "safety_flag", testAccount: false, outOfHours: false, configured: true })).toBe("send");
    expect(smsDecision({ kind: "monitoring", testAccount: false, outOfHours: false, configured: true })).toBe("skip_hours");
    expect(smsDecision({ kind: "monitoring", testAccount: false, outOfHours: true, configured: true })).toBe("send");
    const notify = readFileSync(new URL("../supabase/functions/_shared/safeguarding-notify.ts", import.meta.url), "utf8");
    expect(notify.includes("WHATSAPP")).toBe(false);
    expect(notify.includes("SMS_PROVIDER")).toBe(true);
    expect(notify.includes("console.log")).toBe(false);
  });

  it("keeps SMS on hold and sends nothing while the switch is off", () => {
    expect(SMS_ON_HOLD).toBe(true);
    const notify = readFileSync(new URL("../supabase/functions/_shared/safeguarding-notify.ts", import.meta.url), "utf8");
    const main = notify.split("export async function notifySafeguarding")[1] ?? "";
    expect(main.indexOf("safeguardingSwitchOn()")).toBeGreaterThan(-1);
    expect(main.indexOf("safeguardingSwitchOn()")).toBeLessThan(main.indexOf("sendEmailChannel("));
    expect(notify.includes('reason: "switch_off"')).toBe(true);
    const sms = notify.split("async function sendSmsChannel")[1] ?? "";
    expect(sms.indexOf("SMS_ON_HOLD")).toBeLessThan(sms.indexOf("sendSms("));
    const alert = readFileSync(new URL("../supabase/functions/safeguarding-alert/index.ts", import.meta.url), "utf8");
    expect(alert.indexOf("safeguardingSwitchOn()")).toBeLessThan(alert.indexOf("notifySafeguarding({"));
  });

  it("routes by role, with no hardcoded lead addresses or old env lists", () => {
    const files = [
      "../supabase/functions/_shared/safeguarding-notify.ts",
      "../supabase/functions/_shared/safeguarding-rules.ts",
      "../supabase/functions/safeguarding-alert/index.ts",
      "../supabase/functions/safeguarding-health/index.ts",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    for (const source of files) {
      expect(source.includes("@collaborate8.com")).toBe(false);
      expect(source.includes("DSL_ALERT_EMAIL")).toBe(false);
      expect(source.includes("DEFAULT_DSL_EMAILS")).toBe(false);
    }
    expect(files[0].includes('rpc("sg_alert_recipients")')).toBe(true);
    expect(files[0].includes("routeAlert(")).toBe(true);
  });
});

describe("server-side alert migration", () => {
  const path = "../supabase/migrations/20261120120000_safeguarding_server_alerts.sql";
  const sql = readFileSync(new URL(path, import.meta.url), "utf8");
  const dispatch = sql.split("FUNCTION public.dispatch_safeguarding_alert(")[1]?.split("REVOKE ALL ON FUNCTION public.dispatch_safeguarding_alert")[0] ?? "";

  it("creates the switch off and never overwrites an existing value", () => {
    expect(sql.includes("VALUES ('safeguarding_enabled', 'false')\nON CONFLICT (key) DO NOTHING;")).toBe(true);
    expect(/UPDATE\s+public\.app_settings/i.test(sql)).toBe(false);
    expect(/DO UPDATE/i.test(sql)).toBe(false);
  });

  it("is idempotent and grants no roles", () => {
    expect(/CREATE (TABLE|FUNCTION|POLICY|TRIGGER) (?!IF NOT EXISTS)/.test(sql)).toBe(false);
    expect(/INSERT INTO public\.user_roles/i.test(sql)).toBe(false);
    expect(/@[a-z0-9.-]+\.[a-z]+/i.test(sql)).toBe(false);
    expect(/DROP TABLE|TRUNCATE|DELETE FROM/i.test(sql)).toBe(false);
  });

  it("dispatch checks the switch first and has no hardcoded project", () => {
    expect(dispatch.indexOf("NOT public.sg_global_enabled()")).toBeGreaterThan(-1);
    expect(dispatch.indexOf("NOT public.sg_global_enabled()")).toBeLessThan(dispatch.indexOf("net.http_post"));
    expect(dispatch.includes("'switch_off'")).toBe(true);
    expect(/https:\/\/[a-z0-9]+\.supabase\.co/.test(dispatch)).toBe(false);
    expect(dispatch.includes("'project_url'")).toBe(true);
  });

  it("dispatch body carries ids and the kind only", () => {
    const body = dispatch.split("body := jsonb_build_object(")[1]?.split(")\n  );")[0] ?? "";
    const keys = [...body.matchAll(/'([a-z_]+)',/g)].map((match) => match[1]);
    expect(keys).toEqual(["kind", "parent_low", "parent_high", "event_id"]);
    expect(/note|body|text|phone|bank|sort_code|account/i.test(keys.join(" "))).toBe(false);
  });

  it("lets only the server read lead addresses", () => {
    expect(sql.includes("REVOKE ALL ON FUNCTION public.sg_alert_recipients() FROM PUBLIC, anon, authenticated;")).toBe(true);
    expect(sql.includes("GRANT EXECUTE ON FUNCTION public.sg_alert_recipients() TO service_role;")).toBe(true);
    expect(/GRANT EXECUTE ON FUNCTION public\.sg_alert_recipients\(\) TO [^;]*authenticated/.test(sql)).toBe(false);
    expect(sql.includes("WHERE r.role = 'dsl'")).toBe(true);
  });
});

describe("safeguarding lead role script", () => {
  const sql = readFileSync(new URL("../supabase/manual/NEEDS_RAFA_APPROVAL_safeguarding_lead_roles.sql", import.meta.url), "utf8");
  const migrations = readdirSync(fileURLToPath(new URL("../supabase/migrations", import.meta.url)));

  it("is not a migration and keeps three separate, placeholder-guarded blocks", () => {
    expect(migrations.some((name) => name.includes("lead_roles"))).toBe(false);
    expect(sql.includes("NOT A MIGRATION")).toBe(true);
    for (const placeholder of ["<JADE_USER_ID>", "<RAFA_USER_ID>", "<UK3_QA_USER_ID>"]) {
      expect(sql.includes(`:= '${placeholder}'`)).toBe(true);
    }
    expect((sql.match(/^DO \$\$/gm) ?? []).length).toBe(3);
    expect((sql.match(/RAISE EXCEPTION/g) ?? []).length).toBe(3);
    expect((sql.match(/ON CONFLICT \(user_id, role\) DO NOTHING/g) ?? []).length).toBe(3);
    expect(sql.includes("p.is_test_account")).toBe(true);
    expect(/^\s*DELETE/m.test(sql)).toBe(false);
  });
});

describe("password check", () => {
  it("requires length, mixed case and a number", () => {
    expect(passwordIsStrong("Short1Aa")).toBe(true);
    expect(passwordIsStrong("alllowercase1")).toBe(false);
  });
});

describe("database contract", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261118120000_safeguarding.sql", import.meta.url), "utf8");

  it("uses the mobile RPC names and does not let parents read suitability answers", () => {
    expect(sql.includes("FUNCTION public.sg_family_status()")).toBe(true);
    expect(sql.includes("FUNCTION public.sg_submit_suitability(p_answers jsonb)")).toBe(true);
    expect(sql.includes("FUNCTION public.sg_report_concern(p_kind text")).toBe(true);
    expect(sql.includes("FUNCTION public.sg_set_quiet_mode(p_on boolean)")).toBe(true);
    expect(sql.includes("'shared_tools_paused'")).toBe(true);
    expect(sql.includes("'suitability_check_due'")).toBe(true);
    expect(sql.includes("'quiet_mode'")).toBe(true);
    expect(sql.includes("'safeguarding_enabled'")).toBe(true);
    expect(sql.includes("RAISE EXCEPTION 'sg_paused'")).toBe(true);
    const answers = sql.split("TABLE IF NOT EXISTS public.safeguarding_suitability")[1]?.split("TABLE IF NOT EXISTS public.safeguarding_concerns")[0] ?? "";
    expect(answers.includes("FOR SELECT")).toBe(true);
    expect(answers.includes("safeguarding_is_staff")).toBe(true);
    expect(answers.includes("get_coparent_id")).toBe(false);
  });

  it("limits broadcast reads to the caller's current family topic and does not allow client inserts", () => {
    const fn = sql.split("FUNCTION public.sg_caller_family_topic()")[1]?.split("REVOKE ALL ON FUNCTION public.sg_caller_family_topic()")[0] ?? "";
    expect(fn.includes("STABLE")).toBe(true);
    expect(fn.includes("SECURITY DEFINER")).toBe(true);
    expect(fn.includes("SET search_path = public")).toBe(true);
    expect(fn.includes("get_coparent_id(auth.uid())")).toBe(true);
    expect(fn.includes("least(me, other)")).toBe(true);
    expect(sql.includes("GRANT EXECUTE ON FUNCTION public.sg_caller_family_topic() TO authenticated")).toBe(true);
    expect(sql.includes("GRANT EXECUTE ON FUNCTION public.sg_caller_family_topic() TO anon")).toBe(false);
    expect(sql.includes("GRANT EXECUTE ON FUNCTION public.sg_caller_family_topic() TO service_role")).toBe(false);
    expect(sql.includes("REVOKE ALL ON FUNCTION public.sg_caller_family_topic() FROM PUBLIC, anon, service_role")).toBe(true);
    expect(sql.includes("realtime.topic() = public.sg_caller_family_topic()")).toBe(true);
    expect(sql.includes("auth.uid()::text IN (")).toBe(false);

    const policies = policiesOnRealtimeMessages(sql);
    expect(policies).toHaveLength(1);
    expect(policies[0].includes("FOR SELECT")).toBe(true);
    expect(/FOR\s+(INSERT|ALL)/i.test(policies[0])).toBe(false);
    expect(sql.includes("realtime.messages has an INSERT policy; clients must not send broadcasts")).toBe(true);
    expect(sql.includes("GRANT SELECT ON realtime.messages TO authenticated")).toBe(true);

    const supabaseDir = fileURLToPath(new URL("../supabase", import.meta.url));
    for (const file of listSql(supabaseDir)) {
      const source = readFileSync(file, "utf8");
      for (const policy of policiesOnRealtimeMessages(source)) {
        expect(/FOR\s+(INSERT|ALL)/i.test(policy)).toBe(false);
      }
    }
  });

  it("blocks message deletes while paused and still allows a read_at-only update", () => {
    const fn = sql.split("FUNCTION public.sg_refuse_paused_message()")[1]?.split("DROP TRIGGER IF EXISTS sg_a_pause_messages")[0] ?? "";
    expect(fn.includes("IF TG_OP = 'DELETE' THEN RETURN OLD; END IF")).toBe(true);
    expect(fn.includes("NOT public.sg_tools_paused(auth.uid())")).toBe(true);
    expect(fn.includes("IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'read_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'read_at')")).toBe(true);
    expect(fn.includes("RAISE EXCEPTION 'sg_paused'")).toBe(true);
    expect(sql.includes("CREATE TRIGGER sg_a_pause_messages BEFORE INSERT OR UPDATE OR DELETE ON public.messages")).toBe(true);
  });
});

function policiesOnRealtimeMessages(source: string): string[] {
  return (source.match(/CREATE POLICY[\s\S]*?;/gi) ?? []).filter((statement) => /ON\s+realtime\.messages/i.test(statement));
}

function listSql(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSql(path));
    else if (entry.name.endsWith(".sql")) out.push(path);
  }
  return out;
}
