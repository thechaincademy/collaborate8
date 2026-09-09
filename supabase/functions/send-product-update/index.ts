import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const ADMIN_EMAILS = ["jade@collaborate8.com", "rafa@collaborate8.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = req.headers.get("x-admin-key");
  if (!key || key !== Deno.env.get("LOVABLE_API_KEY")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const batch = new Date().toISOString().slice(0, 10);
  const results: Record<string, unknown>[] = [];

  for (const recipient of ADMIN_EMAILS) {
    const name = recipient.split("@")[0];
    try {
      const result = await sendTemplateEmail("product_update", recipient, {
        templateData: { name: name.charAt(0).toUpperCase() + name.slice(1) },
        idempotencyKey: `product-update-${batch}-${recipient}`,
      });
      results.push({ recipient, ...result });
    } catch (error) {
      results.push({ recipient, sent: false, error: String((error as Error).message ?? error) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
