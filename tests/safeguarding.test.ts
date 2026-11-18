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
  alertEmailRecipients,
  alertSubject,
  alertText,
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
  it("sends real alerts to the DSL list and test alerts only to QA", () => {
    expect(alertEmailRecipients(false, { dsl: "rafa@collaborate8.com, jade@collaborate8.com" }).to).toEqual([
      "rafa@collaborate8.com",
      "jade@collaborate8.com",
    ]);
    expect(alertEmailRecipients(true, { qa: "collaborate8-qa@agentmail.to" }).to).toEqual([
      "collaborate8-qa@agentmail.to",
    ]);
    expect(alertEmailRecipients(true, { qa: "" }).dropped).toBe(true);
    expect(alertSubject("safety_flag", true).startsWith("[TEST] ")).toBe(true);
    expect(alertSubject("safety_flag", false).startsWith("[TEST]")).toBe(false);
  });

  it("never texts a test account and skips SMS when it is not configured", () => {
    expect(smsDecision({ kind: "safety_flag", testAccount: true, outOfHours: true, configured: true })).toBe("skip_test");
    expect(smsDecision({ kind: "safety_flag", testAccount: false, outOfHours: false, configured: false })).toBe("skip_config");
    expect(smsDecision({ kind: "safety_flag", testAccount: false, outOfHours: false, configured: true })).toBe("send");
    expect(smsDecision({ kind: "monitoring", testAccount: false, outOfHours: false, configured: true })).toBe("skip_hours");
    expect(smsDecision({ kind: "monitoring", testAccount: false, outOfHours: true, configured: true })).toBe("send");
    expect(alertText("safety_flag")).toBe("Collabor8: a safety flag needs review. Please check your email or the console.");
    const notify = readFileSync(new URL("../supabase/functions/_shared/safeguarding-notify.ts", import.meta.url), "utf8");
    expect(notify.includes("WHATSAPP")).toBe(false);
    expect(notify.includes("SMS_PROVIDER")).toBe(true);
    expect(notify.includes("console.log")).toBe(false);
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

    const supabaseDir = fileURLToPath(new URL("../supabase", import.meta.url));
    for (const file of listSql(supabaseDir)) {
      const source = readFileSync(file, "utf8");
      for (const policy of policiesOnRealtimeMessages(source)) {
        expect(/FOR\s+(INSERT|ALL)/i.test(policy)).toBe(false);
      }
    }
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
