import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[EXPENSE-APPROVALS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const getStripe = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const supabase = createSupabaseAdmin();
    const { action, expenseId, decision } = await req.json();

    if (action !== "decide") {
      return json({ error: "Unknown action" }, 400);
    }
    if (!expenseId || !["approve", "reject"].includes(decision)) {
      return json({ error: "Missing expenseId or decision" }, 400);
    }

    const { data: expense, error: expErr } = await supabase
      .from("expense_requests")
      .select("*")
      .eq("id", expenseId)
      .maybeSingle();

    if (expErr) throw expErr;
    if (!expense) return json({ error: "Expense not found" }, 404);
    if (expense.status !== "pending") {
      return json({ error: "This expense has already been decided" }, 400);
    }

    // The decider must be the linked co-parent of the person who raised it
    const { data: deciderProfile } = await supabase
      .from("profiles")
      .select("id, coparent_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!deciderProfile || deciderProfile.coparent_id !== expense.user_id) {
      return json({ error: "Only your linked co-parent can decide this expense" }, 403);
    }

    if (decision === "reject") {
      await supabase
        .from("expense_requests")
        .update({ status: "rejected", decided_by: user.id, decided_at: new Date().toISOString() })
        .eq("id", expense.id);

      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "expense_rejected",
        entity_type: "expense_request",
        entity_id: expense.id,
      });

      return json({ status: "rejected" });
    }

    // Approved: try to add the amount to the payer's next recurring payment.
    // The payer is whichever parent in the pair holds the active Stripe arrangement.
    const { data: arrangement } = await supabase
      .from("recurring_payments")
      .select("*")
      .in("user_id", [user.id, expense.user_id])
      .eq("provider", "stripe")
      .eq("is_active", true)
      .not("provider_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .maybeSingle();

    let invoiceItemId: string | null = null;
    let applyNote: string | null = null;

    if (arrangement?.provider_subscription_id && arrangement?.provider_customer_id) {
      try {
        const stripe = getStripe();
        const item = await stripe.invoiceItems.create(
          {
            customer: arrangement.provider_customer_id,
            subscription: arrangement.provider_subscription_id,
            currency: "gbp",
            amount: Math.round(Number(expense.amount) * 100),
            description: `Shared expense: ${expense.description}`.slice(0, 350),
            metadata: {
              collabor8_expense_id: expense.id,
              collabor8_arrangement_id: arrangement.id,
            },
          },
          { idempotencyKey: `expense_${expense.id}` },
        );
        invoiceItemId = item.id;
        applyNote = "Added to the next recurring payment only.";
        logStep("Invoice item created", { invoiceItemId, expenseId: expense.id });
      } catch (e) {
        logStep("Stripe invoice item failed", { message: (e as Error).message });
        applyNote = "Approved, but it could not be added automatically to the next payment.";
      }
    } else {
      applyNote = "Approved. There is no active recurring payment to add it to yet.";
    }

    await supabase
      .from("expense_requests")
      .update({
        status: "approved",
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        provider_invoice_item_id: invoiceItemId,
        applied_at: invoiceItemId ? new Date().toISOString() : null,
        apply_note: applyNote,
      })
      .eq("id", expense.id);

    await supabase.from("audit_events").insert({
      user_id: user.id,
      event_type: "expense_approved",
      entity_type: "expense_request",
      entity_id: expense.id,
      metadata: { invoiceItemId, arrangementId: arrangement?.id ?? null },
    });

    return json({ status: "approved", appliedToNextPayment: Boolean(invoiceItemId), note: applyNote });
  } catch (e) {
    logStep("Error", { message: (e as Error).message });
    return json({ error: (e as Error).message }, 400);
  }
});
