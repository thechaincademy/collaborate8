import { mergeChatMessages } from "@/lib/chatMessages";
import { hideSenderReadAt } from "@/lib/safeguarding/logic";

/** Topic format is sg-family:{low}:{high}. Ids are lowercase and sorted. No co-parent uses the caller twice. */
export function familyMessageTopic(userId: string, coparentId: string | null | undefined): string {
  const me = userId.toLowerCase();
  const other = (coparentId ?? userId).toLowerCase();
  const low = me <= other ? me : other;
  const high = me <= other ? other : me;
  return `sg-family:${low}:${high}`;
}

/** True only when the migration objects are not in this database yet. */
export function isMissingMessageFeed(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("schema cache") && (message.includes("sg_caller_family_topic") || message.includes("messages_caller"));
}

export interface FamilyBroadcast {
  id?: string;
  sender_id?: string;
  recipient_id?: string;
  body?: string;
  created_at?: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  op?: string;
}

export function applyFamilyBroadcast<T extends { id: string; created_at: string; read_at?: string | null; sender_id?: string | null }>(
  current: T[],
  payload: FamilyBroadcast,
  me: string,
): T[] {
  if (!payload.id || !payload.created_at || !payload.sender_id || !payload.recipient_id) return current;
  const row = {
    id: payload.id,
    sender_id: payload.sender_id,
    recipient_id: payload.recipient_id,
    body: payload.body ?? "",
    created_at: payload.created_at,
    attachment_path: payload.attachment_path ?? null,
    attachment_name: payload.attachment_name ?? null,
  };
  if (payload.op === "UPDATE") return mergeChatMessages(current, [row as unknown as T]);
  return mergeChatMessages(current, [hideSenderReadAt({ ...row, read_at: null }, me) as unknown as T]);
}
