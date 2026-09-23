import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "List shared expenses",
  description:
    "List shared one-off expense requests visible to the signed-in parent, with amount, status (pending, approved, rejected, paid) and who raised it.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "rejected", "paid"])
      .optional()
      .describe("Only return expenses with this status."),
    limit: z.number().int().min(1).max(100).default(25).describe("How many expenses to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("expense_requests")
      .select(
        "id, description, amount, status, user_id, decided_at, applied_at, paid_at, apply_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const userId = ctx.getUserId();
    const expenses = (data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      amountGbp: Number(row.amount),
      status: row.status,
      raisedByMe: row.user_id === userId,
      decidedAt: row.decided_at ?? null,
      appliedAt: row.applied_at ?? null,
      paidAt: row.paid_at ?? null,
      note: row.apply_note ?? null,
      createdAt: row.created_at,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(expenses, null, 2) }],
      structuredContent: { expenses },
    };
  },
});
