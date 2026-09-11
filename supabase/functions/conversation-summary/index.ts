import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const CHAT_URL = "https://collaborate8.com/dashboard?tab=chat";

type Answers = Record<string, string | string[]>;

const asArray = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : v ? [v] : [];

const INCOME_MIDPOINTS: Record<string, number> = {
  "Under £20,000": 15000,
  "£20,001 to £30,000": 25000,
  "£30,001 to £40,000": 35000,
  "£40,001 to £60,000": 50000,
  "£60,001 to £80,000": 70000,
  "Over £80,000": 90000,
};

function suggestedFigure(payer: Answers, receiver: Answers): string | undefined {
  const bothAgree = payer.cms_formula === "Yes" && receiver.cms_formula === "Yes";
  const band = typeof payer.income_band === "string" ? payer.income_band : undefined;
  if (!bothAgree || payer.share_income !== "Yes" || !band) return undefined;

  const gross = INCOME_MIDPOINTS[band];
  if (!gross) return undefined;

  // CMS basic rate: 12% of gross weekly income for one child (illustrative).
  const weekly = Math.round(((gross / 52) * 0.12) * 100) / 100;
  return `Based on the income band shared and the CMS statutory formula, a suggested starting figure is around £${weekly.toFixed(
    0,
  )} per week for one child. This is an estimate only - the actual figure depends on the number of children, shared care and other deductions.`;
}

function buildTopics(a: Answers, b: Answers): string[] {
  const collect = (x: Answers) => [
    ...asArray(x.purpose),
    ...asArray(x.outcome),
    ...asArray(x.expense_areas),
  ];
  const mine = collect(a);
  const theirs = collect(b);
  const counts = new Map<string, number>();
  for (const t of [...mine, ...theirs]) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([topic]) => topic)
    .slice(0, 8);
}

function buildNextSteps(a: Answers, b: Answers, topics: string[]) {
  const needsSupport = (x: Answers) =>
    asArray(x.agreements).includes("We may benefit from additional support to reach agreement") ||
    asArray(x.support).some((s) => s === "Access to professional mediation" || s === "Legal advice");

  const agreedCount = asArray(a.agreements).filter((v) => asArray(b.agreements).includes(v)).length;

  if (needsSupport(a) || needsSupport(b)) {
    return {
      nextSteps:
        "Based on your answers, some additional support may be helpful before you begin your financial conversation directly.",
      nextStepsLinks: [
        { label: "Family Mediation Council", url: "https://www.familymediationcouncil.org.uk" },
        { label: "Citizens Advice", url: "https://www.citizensadvice.org.uk" },
        { label: "Resolution directory", url: "https://resolution.org.uk/find-a-professional/" },
      ],
    };
  }

  if (agreedCount >= 3) {
    return {
      nextSteps: `Your financial chat is ready. We suggest starting with ${
        topics[0] ?? "the maintenance amount"
      }. Your summary is pinned at the top of your chat.`,
      nextStepsLinks: [],
    };
  }

  return {
    nextSteps:
      "You have some areas to work through together. Your financial chat is ready, and you may also find it helpful to speak with a professional family mediator.",
    nextStepsLinks: [
      { label: "familymediationcouncil.org.uk", url: "https://www.familymediationcouncil.org.uk" },
    ],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    const supabase = createSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, coparent_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const coparentId = profile?.coparent_id;
    if (!coparentId) {
      return new Response(JSON.stringify({ ready: false, reason: "no_coparent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: responses } = await supabase
      .from("conversation_tool_responses")
      .select("user_id, answers, note, completed_at, summary_sent_at")
      .in("user_id", [user.id, coparentId])
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    const mine = responses?.find((r) => r.user_id === user.id);
    const theirs = responses?.find((r) => r.user_id === coparentId);

    if (!mine || !theirs) {
      return new Response(JSON.stringify({ ready: false, reason: "awaiting_coparent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mine.summary_sent_at && theirs.summary_sent_at) {
      return new Response(JSON.stringify({ ready: true, alreadySent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const myAnswers = (mine.answers ?? {}) as Answers;
    const theirAnswers = (theirs.answers ?? {}) as Answers;

    const { data: coparentProfileRole } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", coparentId)
      .maybeSingle();

    const iAmPayer = profile?.role === "payer";
    const payerAnswers = iAmPayer
      ? myAnswers
      : coparentProfileRole?.role === "payer"
        ? theirAnswers
        : undefined;
    const receiverAnswers = payerAnswers === myAnswers ? theirAnswers : myAnswers;

    const agreements = asArray(myAnswers.agreements).filter((v) =>
      asArray(theirAnswers.agreements).includes(v),
    );
    const topics = buildTopics(myAnswers, theirAnswers);
    const figure = payerAnswers ? suggestedFigure(payerAnswers, receiverAnswers) : undefined;
    const { nextSteps, nextStepsLinks } = buildNextSteps(myAnswers, theirAnswers, topics);

    const recipients: { email: string; note: string | null; userId: string }[] = [];
    for (const [id, note] of [
      [user.id, theirs.note] as const,
      [coparentId, mine.note] as const,
    ]) {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user?.email) recipients.push({ email: data.user.email, note, userId: id });
    }

    const results: Record<string, boolean> = {};
    for (const r of recipients) {
      try {
        const result = await sendTemplateEmail("conversation_summary", r.email, {
          templateData: {
            agreements,
            topics,
            startingFigure: figure,
            coparentNote: r.note,
            nextSteps,
            nextStepsLinks,
            chatUrl: CHAT_URL,
          },
          idempotencyKey: `conversation_summary:${[user.id, coparentId].sort().join(":")}:${r.userId}`,
        });
        results[r.email] = result.sent;
      } catch (e) {
        console.error("summary send failed", r.email, e instanceof Error ? e.message : e);
        results[r.email] = false;
      }

      await supabase.from("email_send_log").insert({
        template_name: "conversation_summary",
        recipient_email: r.email,
        status: results[r.email] ? "sent" : "failed",
        error_message: results[r.email] ? null : "Send failed or recipient suppressed",
      });
    }

    await supabase
      .from("conversation_tool_responses")
      .update({ summary_sent_at: new Date().toISOString() })
      .in("user_id", [user.id, coparentId])
      .is("summary_sent_at", null);

    return new Response(JSON.stringify({ ready: true, sent: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("conversation-summary error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
