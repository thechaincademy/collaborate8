import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my Collabor8 profile",
  description:
    "Return the signed-in parent's Collabor8 profile: name, role (managing or viewing parent), invite code and whether a co-parent is linked.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Authenticated caller required");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, invite_code, coparent_id, created_at")
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("No profile found for the signed-in user.");

    const profile = {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      role: data.role,
      inviteCode: data.invite_code ?? null,
      coparentLinked: Boolean(data.coparent_id),
      createdAt: data.created_at,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
