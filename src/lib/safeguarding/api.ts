import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { CMS_COLLECT_AND_PAY_URL } from "@/content/safeguarding";

export interface FamilyStatus {
  sharedToolsPaused: boolean;
  suitabilityCheckDue: boolean;
  quietMode: boolean;
  safeguardingEnabled: boolean;
  moneyGuidance: boolean;
  securityCheckOffered: boolean;
}

export const EMPTY_STATUS: FamilyStatus = {
  sharedToolsPaused: false,
  suitabilityCheckDue: false,
  quietMode: false,
  safeguardingEnabled: false,
  moneyGuidance: false,
  securityCheckOffered: false,
};

function record(value: Json | null): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

export function parseFamilyStatus(value: Json | null, extras?: { moneyGuidance?: boolean; securityCheckOffered?: boolean }): FamilyStatus {
  const row = record(value);
  return {
    sharedToolsPaused: row.shared_tools_paused === true,
    suitabilityCheckDue: row.suitability_check_due === true,
    quietMode: row.quiet_mode === true,
    safeguardingEnabled: row.safeguarding_enabled === true,
    moneyGuidance: extras?.moneyGuidance === true,
    securityCheckOffered: extras?.securityCheckOffered === true,
  };
}

export async function fetchFamilyStatus(): Promise<FamilyStatus> {
  const { data, error } = await supabase.rpc("sg_family_status");
  if (error) return EMPTY_STATUS;
  const status = parseFamilyStatus(data);
  if (!status.safeguardingEnabled) return status;
  const userId = (await supabase.auth.getUser()).data.user?.id ?? "";
  const account = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { money_guidance?: boolean; security_check_offered?: boolean } | null }>;
        };
      };
    };
  }).from("safeguarding_accounts").select("money_guidance, security_check_offered").eq("user_id", userId).maybeSingle();
  const extra = account.data as { money_guidance?: boolean; security_check_offered?: boolean } | null;
  return {
    ...status,
    moneyGuidance: extra?.money_guidance === true,
    securityCheckOffered: extra?.security_check_offered === true,
  };
}

export async function submitSuitability(answers: Record<string, string>) {
  const { data, error } = await supabase.rpc("sg_submit_suitability", { p_answers: answers });
  if (error) throw error;
  return { received: record(data).received === true };
}

export async function reportConcern(input: {
  kind: "message" | "payment" | "expense" | "general";
  targetId?: string | null;
  note?: string | null;
}) {
  const { data, error } = await supabase.rpc("sg_report_concern", {
    p_kind: input.kind,
    p_target_id: input.targetId || null,
    p_note: input.note ?? null,
  });
  if (error) throw error;
  const row = record(data);
  return {
    reference: typeof row.reference === "string" ? row.reference : "",
    receivedAt: typeof row.received_at === "string" ? row.received_at : "",
  };
}

export async function setQuietMode(on: boolean) {
  const { data, error } = await supabase.rpc("sg_set_quiet_mode", { p_on: on });
  if (error) throw error;
  return { quietMode: record(data).quiet_mode === true };
}

export async function openRecordPdf() {
  const { data, error } = await supabase.functions.invoke("record-pdf", { body: { range: "all" } });
  if (error || !data?.url) throw error ?? new Error("record_unavailable");
  window.open(data.url as string, "_blank", "noopener,noreferrer");
}

export interface DslFlag {
  id: string;
  parentA: string | null;
  parentB: string | null;
  status: string;
  source: string;
  createdAt: string;
}

export interface DslConcern {
  id: string;
  parentA: string | null;
  parentB: string | null;
  category: string;
  body: string;
  status: string;
  createdAt: string;
  linkedMessageId: string | null;
  linkedPaymentId: string | null;
}

export async function fetchDslQueue(): Promise<{ allowed: boolean; flags: DslFlag[]; concerns: DslConcern[] }> {
  const { data, error } = await supabase.rpc("sg_dsl_overview");
  if (error) return { allowed: false, flags: [], concerns: [] };
  const row = record(data);
  if (row.ok !== true) return { allowed: false, flags: [], concerns: [] };
  const flags = Array.isArray(row.flags) ? row.flags : [];
  const concerns = Array.isArray(row.concerns) ? row.concerns : [];
  return {
    allowed: true,
    flags: flags.flatMap((item) => {
      const flag = record(item);
      if (typeof flag.parent_low !== "string") return [];
      return [{
        id: `${flag.parent_low}:${flag.parent_high ?? ""}`,
        parentA: flag.parent_low,
        parentB: typeof flag.parent_high === "string" ? flag.parent_high : null,
        status: "active",
        source: "pause",
        createdAt: typeof flag.paused_at === "string" ? flag.paused_at : "",
      }];
    }),
    concerns: concerns.flatMap((item) => {
      const concern = record(item);
      if (typeof concern.id !== "string") return [];
      return [{
        id: concern.id,
        parentA: typeof concern.parent_low === "string" ? concern.parent_low : null,
        parentB: typeof concern.parent_high === "string" ? concern.parent_high : null,
        category: typeof concern.kind === "string" ? concern.kind : "",
        body: typeof concern.note === "string" ? concern.note : "",
        status: typeof concern.reference === "string" ? concern.reference : "",
        createdAt: typeof concern.created_at === "string" ? concern.created_at : "",
        linkedMessageId: null,
        linkedPaymentId: null,
      }];
    }),
  };
}

export async function setPairPause(parentA: string | null, parentB: string | null, paused: boolean) {
  const { error } = await supabase.rpc("sg_dsl_set_pause", {
    p_parent_low: parentA,
    p_parent_high: parentB,
    p_paused: paused,
  });
  if (error) throw error;
}

export const cmsCollectUrl = CMS_COLLECT_AND_PAY_URL;
