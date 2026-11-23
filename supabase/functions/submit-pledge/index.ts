// Deploy target: supabase/functions/submit-pledge/index.ts
// Public endpoint behind the Families Change pledge form (/families-change).
// Validates the pledge, stores it, emails the founders, and sends the pledger
// a confirmation. No JWT: the website form is anonymous.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const ADMIN_EMAILS = ["jade@collaborate8.com", "rafa@collaborate8.com"];
const REPLY_TO = "jade@collaborate8.com";
// Outgoing email is prepared (templates pledge_admin_alert + pledge_confirmation)
// but disabled until the founders approve the copy, recipients and resource links.
// Flip to true to enable sends.
const ENABLE_PLEDGE_EMAILS = false;
const MAX_FIELD = 300;
const ALLOWED_ORG_TYPES = ["School", "Academy trust", "Council or family hub", "Charity or community group", "Other"];
const ALLOWED_PLEDGES = [
  "Share the parent pack",
  "Display the poster or QR code",
  "Mention it in a newsletter or post",
  "Brief staff",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clean = (v: unknown, max = MAX_FIELD) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request" }, 400);

    // Honeypot: bots that fill the hidden "website" field get a fake success
    // and nothing is stored or sent.
    if (clean(body.website)) return json({ ok: true });

    const name = clean(body.name, 120);
    const organisation = clean(body.organisation, 160);
    const email = clean(body.email, 200).toLowerCase();
    const orgType = ALLOWED_ORG_TYPES.includes(body.orgType) ? body.orgType : null;
    const postcode = clean(body.postcode, 12) || null;
    const consent = body.consent === true;
    const publicListing = body.publicListing === true;

    const familiesReachRaw = Number(body.familiesReach);
    const familiesReach =
      Number.isFinite(familiesReachRaw) && familiesReachRaw > 0 && familiesReachRaw <= 100000000
        ? Math.floor(familiesReachRaw)
        : null;

    const pledgeOptions = Array.isArray(body.pledgeOptions)
      ? body.pledgeOptions.filter((o: unknown) => typeof o === "string" && ALLOWED_PLEDGES.includes(o as string))
      : [];

    if (!name || !organisation || !EMAIL_RE.test(email)) {
      return json({ error: "Please complete your name, organisation and a valid email address." }, 400);
    }
    if (!pledgeOptions.length) {
      return json({ error: "Please select at least one way to support the campaign." }, 400);
    }
    if (!consent) {
      return json({ error: "Please agree to the use of your details in connection with your pledge." }, 400);
    }

    const supabase = createSupabaseAdmin();
    const { data: inserted, error: insertError } = await supabase
      .from("families_change_pledges")
      .insert({
        name,
        organisation,
        email,
        org_type: orgType,
        families_reach: familiesReach,
        postcode,
        pledge_options: pledgeOptions,
        public_listing: publicListing,
        user_agent: clean(req.headers.get("user-agent"), 400) || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("submit-pledge insert failed:", insertError.message);
      return json({ error: "Something went wrong saving your pledge. Please try again." }, 500);
    }

    const pledgeId: string = inserted.id;
    const logSend = async (
      templateName: string,
      recipient: string,
      status: string,
      errorMessage: string | null = null
    ) => {
      try {
        await supabase.from("email_send_log").insert({
          template_name: templateName,
          recipient_email: recipient,
          status,
          ...(errorMessage ? { error_message: errorMessage } : {}),
        });
      } catch (e) {
        console.error("email_send_log insert failed:", e instanceof Error ? e.message : String(e));
      }
    };

    const sendSafe = async (
      templateName: string,
      recipient: string,
      templateData: Record<string, unknown>,
      idempotencyKey: string,
      replyTo?: string
    ) => {
      try {
        const result = await sendTemplateEmail(templateName, recipient, {
          templateData,
          idempotencyKey,
          ...(replyTo ? { replyTo } : {}),
        });
        await logSend(templateName, recipient, result.sent ? "sent" : "suppressed");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`${templateName} send failed:`, message);
        await logSend(templateName, recipient, "failed", message);
      }
    };

    const submittedAt = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

    if (!ENABLE_PLEDGE_EMAILS) {
      console.log(`submit-pledge: stored pledge ${pledgeId}; email sends disabled pending founder approval`);
      return json({ ok: true });
    }

    // Founders' notification with the full pledge.
    for (const adminEmail of ADMIN_EMAILS) {
      await sendSafe(
        "pledge_admin_alert",
        adminEmail,
        {
          name,
          organisation,
          email,
          orgType: orgType ?? "-",
          familiesReach: familiesReach ?? "-",
          postcode: postcode ?? "-",
          pledgeOptions: pledgeOptions.join(" · "),
          publicListing: publicListing ? "Yes" : "No",
          submittedAt,
        },
        `pledge-admin:${pledgeId}:${adminEmail}`
      );
    }

    // Pledger's confirmation. The resource download links are sent by the team
    // in reply to the founders' notification above.
    await sendSafe(
      "pledge_confirmation",
      email,
      { name, organisation },
      `pledge-confirm:${pledgeId}`,
      REPLY_TO
    );

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("submit-pledge error:", message);
    return json({ error: "Something went wrong submitting your pledge. Please try again." }, 500);
  }
});
