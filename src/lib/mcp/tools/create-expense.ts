import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_expense",
  title: "Raise a shared expense",
  description:
    "Raise a one-off shared expense for the co-parent to approve or decline. Receipts can only be attached inside the Collabor8 app.",
  inputSchema: {
    description: z.string().trim().min(1).max(200).describe("What the expense is for."),
    amountGbp: z.number().positive().max(100000).describe("Amount in GBP."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ description, amountGbp }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("expense_requests")
      .insert({ user_id: ctx.getUserId(), description, amount: amountGbp })
      .select("id, description, amount, status, created_at")
      .single();
    if (error) throw new ToolError(error.message);

    const expense = {
      id: data.id,
      description: data.description,
      amountGbp: Number(data.amount),
      status: data.status,
      createdAt: data.created_at,
    };

    return {
      content: [
        {
          type: "text",
          text: `Expense raised for £${expense.amountGbp.toFixed(2)}: ${expense.description}. Awaiting your co-parent's approval.`,
        },
      ],
      structuredContent: { expense },
    };
  },
});
