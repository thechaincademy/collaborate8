import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_payments",
  title: "List payments",
  description:
    "List the signed-in parent's Collabor8 payment history (maintenance and expense payments), newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("How many payments to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, currency, status, type, payer_id, payee_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new ToolError(error.message);

    const userId = ctx.getUserId();
    const payments = (data ?? []).map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      type: row.type,
      direction: row.payer_id === userId ? "outgoing" : "incoming",
      createdAt: row.created_at,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(payments, null, 2) }],
      structuredContent: { payments },
    };
  },
});
