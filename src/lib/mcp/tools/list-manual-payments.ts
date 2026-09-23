import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_manual_payments",
  title: "List manually recorded payments",
  description:
    "List payments the signed-in parent has recorded as sent from their own bank, outside Collabor8, with a running total.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("How many records to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("manual_payments")
      .select("id, amount, paid_on, reference, note, created_at")
      .order("paid_on", { ascending: false })
      .limit(limit);
    if (error) throw new ToolError(error.message);

    const payments = (data ?? []).map((row) => ({
      id: row.id,
      amountGbp: Number(row.amount),
      paidOn: row.paid_on,
      reference: row.reference ?? null,
      note: row.note ?? null,
    }));
    const totalGbp = payments.reduce((sum, p) => sum + p.amountGbp, 0);

    return {
      content: [{ type: "text", text: JSON.stringify({ totalGbp, payments }, null, 2) }],
      structuredContent: { totalGbp, payments },
    };
  },
});
