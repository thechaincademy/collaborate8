// Shared account deletion: used by delete-account (signed in) and request-account-deletion (email link).
import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type DeletionResult = { status: "deleted" } | { status: "error"; error: string };

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const log = (step: string, e: unknown) =>
  console.error(`[account-deletion] ${step}:`, (e as Error)?.message ?? JSON.stringify(e));

async function must(step: string, p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) throw new Error(`${step}: ${(error as { message?: string }).message ?? "failed"}`);
}

async function cleanStripe(admin: SupabaseClient, uid: string, email: string | undefined) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return log("stripe", "STRIPE_SECRET_KEY missing");
  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

  const [{ data: rps }, { data: access }, { data: accts }] = await Promise.all([
    admin.from("recurring_payments").select("provider_subscription_id, provider_customer_id").eq("user_id", uid),
    admin.from("conversation_tool_access").select("stripe_subscription_id, stripe_customer_id").eq("user_id", uid),
    admin.from("connected_accounts").select("provider_account_id").eq("user_id", uid),
  ]);

  const subs = new Set<string>();
  const customers = new Set<string>();
  for (const r of rps ?? []) {
    if (r.provider_subscription_id) subs.add(r.provider_subscription_id);
    if (r.provider_customer_id) customers.add(r.provider_customer_id);
  }
  for (const a of access ?? []) {
    if (a.stripe_subscription_id) subs.add(a.stripe_subscription_id);
    if (a.stripe_customer_id) customers.add(a.stripe_customer_id);
  }
  if (email) {
    try {
      const found = await stripe.customers.list({ email, limit: 10 });
      found.data.forEach((c) => customers.add(c.id));
    } catch (e) { log("stripe customers.list", e); }
  }
  for (const c of customers) {
    try {
      const list = await stripe.subscriptions.list({ customer: c, status: "all", limit: 100 });
      list.data.filter((s) => s.status !== "canceled" && s.status !== "incomplete_expired").forEach((s) => subs.add(s.id));
    } catch (e) { log(`stripe subscriptions.list ${c}`, e); }
  }
  for (const s of subs) {
    try {
      const sub = await stripe.subscriptions.retrieve(s);
      if (sub.status !== "canceled" && sub.status !== "incomplete_expired") await stripe.subscriptions.cancel(s);
    } catch (e) { log(`stripe cancel ${s}`, e); }
  }
  for (const c of customers) {
    try { await stripe.customers.del(c); } catch (e) { log(`stripe customers.del ${c}`, e); }
  }
  for (const a of accts ?? []) {
    try { await stripe.accounts.reject(a.provider_account_id, { reason: "other" }); }
    catch (e) { log(`stripe accounts.reject ${a.provider_account_id}`, e); }
  }
}

async function removeFolder(admin: SupabaseClient, bucket: string, uid: string) {
  for (let round = 0; round < 20; round++) {
    const { data, error } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
    if (error) return log(`storage list ${bucket}`, error);
    const paths = (data ?? []).filter((f) => f.name).map((f) => `${uid}/${f.name}`);
    if (!paths.length) return;
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
    if (rmErr) return log(`storage remove ${bucket}`, rmErr);
  }
}

export async function deleteAccount(admin: SupabaseClient, uid: string, email?: string): Promise<DeletionResult> {
  try {
    await cleanStripe(admin, uid, email);

    // Storage files (receipts, documents and chat attachments)
    await removeFolder(admin, "receipts", uid);
    await removeFolder(admin, "chat-attachments", uid);

    // Recurring payments: mark inactive, then remove
    await must("recurring inactive", admin.from("recurring_payments").update({ is_active: false }).eq("user_id", uid));
    await must("recurring delete", admin.from("recurring_payments").delete().eq("user_id", uid));

    // Payments only involving this user are deleted; shared ones stay for the co-parent without personal details
    await must("payments own", admin.from("payments").delete().or(
      `and(payer_id.eq.${uid},payee_id.is.null),and(payee_id.eq.${uid},payer_id.is.null),and(payer_id.eq.${uid},payee_id.eq.${uid})`));
    await must("payments strip", admin.from("payments").update({ provider_consent_token: null, error_message: null })
      .or(`payer_id.eq.${uid},payee_id.eq.${uid}`));
    await must("payment_records own", admin.from("payment_records").delete().or(
      `and(payer_id.eq.${uid},receiver_id.is.null),and(receiver_id.eq.${uid},payer_id.is.null),and(payer_id.eq.${uid},receiver_id.eq.${uid})`));
    await must("payment_records strip payer", admin.from("payment_records").update({ payer_wallet: "" }).eq("payer_id", uid));
    await must("payment_records strip receiver", admin.from("payment_records").update({ receiver_wallet: "" }).eq("receiver_id", uid));

    // Messages: keep what the co-parent received, drop ones nobody can see any more
    await must("messages orphan", admin.from("messages").delete().or(
      `and(sender_id.eq.${uid},recipient_id.is.null),and(recipient_id.eq.${uid},sender_id.is.null)`));

    // Decision threads: keep for the co-parent with the user shown as Deleted user
    const { data: threads } = await admin.from("decision_threads").select("id, creator_id, coparent_id")
      .or(`creator_id.eq.${uid},coparent_id.eq.${uid}`);
    const orphanThreads = (threads ?? []).filter((t) =>
      (t.creator_id === uid || t.creator_id === null) && (t.coparent_id === uid || t.coparent_id === null)).map((t) => t.id);
    if (orphanThreads.length) {
      await must("thread_events orphan", admin.from("thread_events").delete().in("thread_id", orphanThreads));
      await must("threads orphan", admin.from("decision_threads").delete().in("id", orphanThreads));
    }
    await must("threads creator", admin.from("decision_threads").update({ creator_id: null }).eq("creator_id", uid));
    await must("threads coparent", admin.from("decision_threads").update({ coparent_id: null }).eq("coparent_id", uid));
    await must("thread_events actor", admin.from("thread_events").update({ actor_id: null, attachment_path: null, attachment_name: null }).eq("actor_id", uid));

    // Personal rows
    const byUser = ["expense_requests", "device_push_tokens", "push_subscriptions", "notification_preferences",
      "bank_connections", "coparent_bank_accounts", "connected_accounts", "notifications", "conversation_tool_access",
      "conversation_tool_responses", "manual_payments", "usage_events"];
    for (const t of byUser) await must(t, admin.from(t).delete().eq("user_id", uid));
    await must("invitations", admin.from("invitations").delete().eq("inviter_id", uid));
    await must("pending_first_messages", admin.from("pending_first_messages").delete().eq("sender_id", uid));

    // Unlink co-parent on both sides and remove names
    await must("unlink coparent", admin.from("profiles").update({ coparent_id: null }).eq("coparent_id", uid));
    await must("anonymise profile", admin.from("profiles").update({ coparent_id: null, first_name: null, last_name: null, invite_code: null }).eq("id", uid));

    await admin.from("audit_events").insert({
      user_id: null, event_type: "account_deleted", entity_type: "profile",
      metadata: { user_hash: await sha256Hex(uid) },
    });

    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) {
      log("auth deleteUser", error);
      return { status: "error", error: "auth_delete_failed" };
    }
    await admin.from("deletion_requests").update({ status: "completed", user_id: null }).eq("user_id", uid);
    return { status: "deleted" };
  } catch (e) {
    log("deleteAccount", e);
    return { status: "error", error: "cleanup_failed" };
  }
}
