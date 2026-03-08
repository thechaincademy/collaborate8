import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { YapilyBankConnector } from "../_shared/yapily-adapter.ts";

const connector = new YapilyBankConnector();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const { action, institutionId, callbackUrl, consentToken } = await req.json();
    const supabase = createSupabaseAdmin();

    if (action === "get-institutions") {
      const institutions = await connector.getInstitutions();
      console.log(`Fetched ${institutions.length} institutions from Yapily`);
      if (institutions.length > 0) {
        console.log("Sample institution keys:", JSON.stringify(Object.keys(institutions[0])));
        console.log("Sample features:", JSON.stringify(institutions[0].features?.slice(0, 3)));
        console.log("Sample countries:", JSON.stringify(institutions[0].countries));
      }
      // Filter for UK institutions that support accounts
      const filtered = institutions.filter((inst: any) => {
        const isUK = inst.countries?.some((c: any) => 
          c.countryCode2 === "GB" || c === "GB"
        );
        const hasAccounts = inst.features?.some((f: any) => 
          f === "ACCOUNTS" || f === "ACCOUNT_TRANSACTIONS" ||
          f?.type === "ACCOUNTS" || f?.type === "ACCOUNT_TRANSACTIONS"
        );
        return isUK && hasAccounts;
      });
      console.log(`Filtered to ${filtered.length} UK institutions with account support`);
      // If filter is too aggressive, return all UK ones
      const result = filtered.length > 0 ? filtered : institutions.filter((inst: any) =>
        inst.countries?.some((c: any) => c.countryCode2 === "GB" || c === "GB")
      );
      return new Response(JSON.stringify({ institutions: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-authorisation") {
      if (!institutionId || !callbackUrl) {
        return new Response(JSON.stringify({ error: "Missing institutionId or callbackUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await connector.createAccountAuthorisation(user.id, institutionId, callbackUrl);

      // Store pending bank connection
      await supabase.from("bank_connections").insert({
        user_id: user.id,
        institution_id: institutionId,
        institution_name: institutionId, // will update on callback
        consent_status: "pending",
      });

      // Audit event
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "consent_created",
        entity_type: "bank_connection",
        metadata: { institutionId },
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange-consent") {
      if (!consentToken || !institutionId) {
        return new Response(JSON.stringify({ error: "Missing consentToken or institutionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch accounts with the consent token
      const accounts = await connector.getAccounts(consentToken);
      const primaryAccount = accounts[0];

      // Update bank connection with consent and account info
      await supabase
        .from("bank_connections")
        .update({
          consent_token: consentToken,
          consent_status: "active",
          account_id: primaryAccount?.id || null,
          account_type: primaryAccount?.type || null,
          account_name: primaryAccount?.name || null,
          sort_code: primaryAccount?.sortCode || null,
          account_number_masked: primaryAccount?.accountNumberMasked || null,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        })
        .eq("user_id", user.id)
        .eq("institution_id", institutionId)
        .eq("consent_status", "pending");

      // Audit
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "consent_exchanged",
        entity_type: "bank_connection",
        metadata: { institutionId, accountCount: accounts.length },
      });

      return new Response(JSON.stringify({ accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-accounts") {
      // Get user's active bank connection
      const { data: connection } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("consent_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!connection || !connection.consent_token) {
        return new Response(JSON.stringify({ error: "No active bank connection" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const accounts = await connector.getAccounts(connection.consent_token);
        return new Response(JSON.stringify({ accounts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        // Consent may have expired
        await supabase
          .from("bank_connections")
          .update({ consent_status: "expired" })
          .eq("id", connection.id);

        return new Response(JSON.stringify({ error: "Consent expired, please reconnect your bank" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "get-transactions") {
      const { accountId } = await req.json().catch(() => ({}));

      const { data: connection } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("consent_status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!connection?.consent_token) {
        return new Response(JSON.stringify({ error: "No active bank connection" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const targetAccountId = accountId || connection.account_id;
      if (!targetAccountId) {
        return new Response(JSON.stringify({ error: "No account ID available" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transactions = await connector.getTransactions(connection.consent_token, targetAccountId);
      return new Response(JSON.stringify({ transactions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("yapily-banking error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
