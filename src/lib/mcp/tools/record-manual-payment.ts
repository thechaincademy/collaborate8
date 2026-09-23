import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_manual_payment",
  title: "Record a payment sent from your own bank",
  description:
    "Record a maintenance payment the signed-in parent has already sent from their own bank account. Collabor8 does not move the money; this only keeps the record.",
  inputSchema: {
    amountGbp: z.number().positive().max(100000).describe("Amount sent, in GBP."),
    paidOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date the payment was sent, as YYYY-MM-DD. Defaults to today."),
    reference: z.string().trim().max(120).optional().describe("Payment reference used."),
    note: z.string().trim().max(300).optional().describe("Optional note about the payment."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ amountGbp, paidOn, reference, note }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("manual_payments")
      .insert({
        user_id: ctx.getUserId(),
        amount: amountGbp,
        ...(paidOn ? { paid_on: paidOn } : {}),
        ...(reference ? { reference } : {}),
        ...(note ? { note } : {}),
      })
      .select("id, amount, paid_on, reference, note")
      .single();
    if (error) throw new ToolError(error.message);

    const payment = {
      id: data.id,
      amountGbp: Number(data.amount),
      paidOn: data.paid_on,
      reference: data.reference ?? null,
      note: data.note ?? null,
    };

    return {
      content: [
        {
          type: "text",
          text: `Recorded £${payment.amountGbp.toFixed(2)} sent on ${payment.paidOn}.`,
        },
      ],
      structuredContent: { payment },
    };
  },
});
