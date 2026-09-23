import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_chat_messages",
  title: "List financial chat messages",
  description:
    "List recent messages in the financial chat between the signed-in parent and their co-parent, newest last.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(30).describe("How many messages to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at, attachment_name")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new ToolError(error.message);

    const userId = ctx.getUserId();
    const messages = (data ?? [])
      .map((row) => ({
        id: row.id,
        body: row.body,
        fromMe: row.sender_id === userId,
        attachmentName: row.attachment_name ?? null,
        sentAt: row.created_at,
      }))
      .reverse();

    return {
      content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
      structuredContent: { messages },
    };
  },
});
