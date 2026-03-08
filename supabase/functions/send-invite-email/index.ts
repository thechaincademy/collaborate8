import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const { recipientEmail, inviteCode, senderName } = await req.json();

    if (!recipientEmail || !inviteCode) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail or inviteCode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Supabase's built-in email capabilities via the admin API
    // For now, we'll use a simple approach with the Supabase auth admin
    const supabase = createSupabaseAdmin();

    // Send via Supabase's built-in email (using auth.admin)
    // Since we don't have a dedicated email service, we'll use Supabase's
    // inbuilt email sending via a database-triggered approach or direct SMTP
    // For MVP: store the invite and the system handles notification
    
    // Update the invitation with the email
    await supabase
      .from("invitations")
      .update({ invitee_email: recipientEmail })
      .eq("invite_code", inviteCode);

    // For now, we'll use Supabase's built-in auth email to send a magic link-style invite
    // This sends a signup invitation email through Supabase Auth
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    const appUrl = req.headers.get("origin") || "https://collabor8.lovable.app";
    
    const { error } = await supabase.auth.admin.inviteUserByEmail(recipientEmail, {
      data: {
        invite_code: inviteCode,
        invited_by: senderName || "Your co-parent",
      },
      redirectTo: `${appUrl}/signup/invited?code=${inviteCode}`,
    });

    if (error) {
      console.error("Email invite error:", error);
      // Don't fail - the invite code was still created, user can share manually
      return new Response(JSON.stringify({ 
        success: true, 
        emailSent: false, 
        message: "Invite created but email could not be sent. Share the code manually.",
        inviteCode 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: true, 
      message: "Invitation email sent successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-invite-email error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
