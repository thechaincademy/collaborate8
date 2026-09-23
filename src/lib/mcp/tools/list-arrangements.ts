import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_maintenance_arrangements",
  title: "List child maintenance arrangements",
  description:
    "List the signed-in parent's recurring child maintenance arrangements, with amount in GBP, frequency, next due date and whether the arrangement is active.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("recurring_payments")
      .select(
        "id, amount, frequency, day_of_month, day_of_week, next_due_date, is_active, user_id, receiver_id, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new ToolError(error.message);

    const userId = ctx.getUserId();
    const arrangements = (data ?? []).map((row) => ({
      id: row.id,
      amountGbp: Number(row.amount),
      frequency: row.frequency,
      dayOfMonth: row.day_of_month ?? null,
      dayOfWeek: row.day_of_week ?? null,
      nextDueDate: row.next_due_date ?? null,
      isActive: row.is_active,
      myRole: row.user_id === userId ? "paying" : "receiving",
      createdAt: row.created_at,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(arrangements, null, 2) }],
      structuredContent: { arrangements },
    };
  },
});
