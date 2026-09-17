import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";

const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";
const USDC_MINT = Deno.env.get("SOLANA_USDC_MINT") ??
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const MEMO_PREFIX = "C8|v1|";

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fail(check: string, detail?: string) {
  return { verified: false, failedCheck: check, detail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const user = await getUserFromRequest(req);
    const { recordId } = await req.json();
    if (!recordId || typeof recordId !== "string") {
      return json({ error: "recordId is required" }, 400);
    }

    const admin = createSupabaseAdmin();
    const { data: record, error } = await admin
      .from("payment_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (error) throw error;
    if (!record) return json({ error: "Record not found" }, 404);
    if (record.payer_id !== user.id && record.receiver_id !== user.id) {
      return json({ error: "Not authorised" }, 403);
    }
    if (!record.tx_signature) return json(fail("tx_signature_missing"));

    // 1. Reference hash must recompute from the stored fields + salt.
    const canonical = [
      record.arrangement_id ?? "",
      record.payer_id,
      record.receiver_id,
      record.period ?? "",
      record.payment_type,
      record.expense_id ?? "",
      Number(record.amount_usdc).toFixed(6),
      record.salt,
    ].join("|");
    const expectedHash = await sha256Hex(canonical);
    if (expectedHash !== record.reference_hash) {
      return json(fail("reference_hash_mismatch"));
    }

    // 2. Transaction must be finalized.
    const statuses = await rpc("getSignatureStatuses", [
      [record.tx_signature],
      { searchTransactionHistory: true },
    ]);
    const status = statuses?.value?.[0];
    if (!status) return json(fail("transaction_not_found"));
    if (status.err) return json(fail("transaction_failed", JSON.stringify(status.err)));
    if (status.confirmationStatus !== "finalized") {
      return json(fail("transaction_not_finalized", status.confirmationStatus));
    }

    const tx = await rpc("getTransaction", [
      record.tx_signature,
      { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) return json(fail("transaction_not_found"));
    if (tx.meta?.err) return json(fail("transaction_failed", JSON.stringify(tx.meta.err)));

    // 3. USDC balance movement between the two wallets must match amount_usdc.
    const balanceFor = (list: any[], owner: string) =>
      list?.find((b) => b.owner === owner && b.mint === USDC_MINT)?.uiTokenAmount?.uiAmount ?? null;

    const pre = tx.meta?.preTokenBalances ?? [];
    const post = tx.meta?.postTokenBalances ?? [];

    const mintsTouched = [...pre, ...post].some((b: any) => b.mint === USDC_MINT);
    if (!mintsTouched) return json(fail("usdc_mint_not_found"));

    const receiverPre = balanceFor(pre, record.receiver_wallet) ?? 0;
    const receiverPost = balanceFor(post, record.receiver_wallet);
    const payerPre = balanceFor(pre, record.payer_wallet);
    const payerPost = balanceFor(post, record.payer_wallet);

    if (receiverPost === null) return json(fail("receiver_wallet_not_in_transaction"));
    if (payerPre === null || payerPost === null) {
      return json(fail("payer_wallet_not_in_transaction"));
    }

    const expected = Number(record.amount_usdc);
    const credited = Number((receiverPost - receiverPre).toFixed(6));
    const debited = Number((payerPre - payerPost).toFixed(6));

    if (Math.abs(credited - expected) > 1e-6) {
      return json(fail("amount_mismatch", `credited ${credited}, expected ${expected}`));
    }
    if (Math.abs(debited - expected) > 1e-6) {
      return json(fail("payer_amount_mismatch", `debited ${debited}, expected ${expected}`));
    }

    // 4. Memo must be exactly the hashed reference.
    const expectedMemo = `${MEMO_PREFIX}${record.reference_hash}`;
    const logs: string[] = tx.meta?.logMessages ?? [];
    const memoInLogs = logs.some((l) => l.includes(expectedMemo));
    const instructions = [
      ...(tx.transaction?.message?.instructions ?? []),
      ...((tx.meta?.innerInstructions ?? []).flatMap((i: any) => i.instructions ?? [])),
    ];
    const memoInInstructions = instructions.some(
      (i: any) => i.program === "spl-memo" && String(i.parsed) === expectedMemo
    );
    if (!memoInLogs && !memoInInstructions) return json(fail("memo_mismatch"));

    const verifiedAt = new Date().toISOString();
    const { error: updateError } = await admin
      .from("payment_records")
      .update({ status: "verified", verified_at: verifiedAt, verification_error: null })
      .eq("id", record.id);
    if (updateError) throw updateError;

    return json({ verified: true, status: "verified", verified_at: verifiedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const unauthorised = message === "Unauthorized" || message.includes("authorization");
    return json({ error: message }, unauthorised ? 401 : 500);
  }
});
