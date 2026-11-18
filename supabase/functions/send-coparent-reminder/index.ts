import { initEdgeSentry } from '../_shared/sentry.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

initEdgeSentry();
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendResendEmail, sanitizeEmailError } from "../_shared/resend.ts";

type ReminderType = 'setup_bank_account' | 'send_payment';

const TEMPLATES: Record<ReminderType, { subject: string; body: (name: string) => string }> = {
  setup_bank_account: {
    subject: 'Your co-parent is ready to send payments on Collabor8',
    body: (name) =>
      `Hi${name ? ' ' + name : ''},\n\nYour co-parent has set up their payment method on Collabor8 and is ready to send you money. To start receiving payments, please finish Stripe setup in the Collabor8 app.\n\nLog in to Collabor8 to finish setup: https://collaborate8.com/dashboard?tab=maintenance\n\nCollabor8`,
  },
  send_payment: {
    subject: 'Your co-parent is ready to receive payments on Collabor8',
    body: (name) =>
      `Hi${name ? ' ' + name : ''},\n\nYour co-parent is ready to receive payments on Collabor8. You can now set up a recurring payment or send a one-off payment through Stripe in the app.\n\nLog in to Collabor8: https://collaborate8.com/dashboard?tab=maintenance\n\nCollabor8`,
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type as ReminderType;
    const recipientId = body?.recipientId as string | undefined;
    if (!type || !TEMPLATES[type] || !recipientId) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify sender and recipient are linked co-parents
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('coparent_id, first_name')
      .eq('id', userData.user.id)
      .single();

    if (!senderProfile || senderProfile.coparent_id !== recipientId) {
      return new Response(JSON.stringify({ error: 'Not linked to this co-parent' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', recipientId)
      .single();

    const { data: recipientUser } = await admin.auth.admin.getUserById(recipientId);
    const recipientEmail = recipientUser?.user?.email;
    const template = TEMPLATES[type];
    const subject = template.subject;
    const text = template.body(recipientProfile?.first_name ?? '');

    // Attempt email delivery via Resend
    let emailSent = false;
    let emailError: string | null = null;

    if (recipientEmail) {
      try {
        const result = await sendResendEmail({
          to: recipientEmail,
          subject,
          text,
          idempotencyKey: `coparent-reminder/${type}/${recipientId}`,
        });
        emailSent = result.sent;
        if (!result.sent) emailError = result.reason;
      } catch (err) {
        emailError = sanitizeEmailError((err as Error).message);
        console.error('Resend error', emailError);
      }
    } else {
      emailError = 'Email sender not configured';
    }

    // Always log an audit event so the reminder is recorded
    await admin.from('audit_events').insert({
      user_id: userData.user.id,
      event_type: 'coparent_reminder_sent',
      metadata: { type, recipientId, emailSent, emailError },
    });

    return new Response(
      JSON.stringify({ ok: true, emailSent, note: emailSent ? undefined : emailError }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('send-coparent-reminder failed', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
