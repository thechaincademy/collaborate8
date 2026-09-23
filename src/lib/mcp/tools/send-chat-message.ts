import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "send_chat_message",
  title: "Send a financial chat message",
  description:
    "Send a text message to the signed-in parent's linked co-parent in the financial chat. Requires a linked co-parent.",
  inputSchema: {
    body: z.string().trim().min(1).max(2000).describe("The message text to send."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ body }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coparent_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new ToolError(profileError.message);
    if (!profile?.coparent_id) {
      throw new ToolError(
        "No co-parent is linked yet, so there is nobody to message. Invite your co-parent in the Collabor8 app first.",
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: userId, recipient_id: profile.coparent_id, body })
      .select("id, body, created_at")
      .single();
    if (error) throw new ToolError(error.message);

    const message = { id: data.id, body: data.body, sentAt: data.created_at };
    return {
      content: [{ type: "text", text: "Message sent to your co-parent." }],
      structuredContent: { message },
    };
  },
});
