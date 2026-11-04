// Deploy target: supabase/functions/chat-rewrite/index.ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requirePremium } from "../_shared/premium-access.ts";
import { getUserFromRequest } from "../_shared/supabase.ts";

const CALM_CHECK_REQUIRES_PREMIUM = (Deno.env.get("CALM_CHECK_REQUIRES_PREMIUM") ?? "true").trim().toLowerCase() !== "false";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const unauthorized = () =>
  new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Signed-in only (no Premium gate): same 401 body as requirePremium.
const requireSignedIn = async (req: Request): Promise<Response | null> => {
  try {
    await getUserFromRequest(req);
    return null;
  } catch {
    return unauthorized();
  }
};

const SYSTEM = `You are a private writing aid for separated co-parents. Rewrite the user's draft message to their co-parent.
Rules: keep it concise, factual, respectful and child-focused. Preserve the sender's meaning, facts, dates, amounts and the action they are asking for.
Remove judgemental, accusatory, sarcastic, legal or emotionally loaded language. Do not invent facts. Do not give legal advice. Use UK English and hyphens, never em-dashes.
A child's health, safety, medication, school or care need stays a clear, direct, polite statement or request: keep the need, the item, any time given and who does what, and never soften it into a suggestion to discuss it. Keep names, dates, times, amounts and medication word for word and do not add times or details that are not in the draft. Remove blame and reproach, including about the past (disappointment, guilt, sarcasm, absolutes such as always or never, threats); keep only the request and the next step. Never use the words "police" or "victim".
Never add a request, topic, plan, suggestion or commitment the parent did not write; only soften what is already there. When the draft states a fact or event with no request, keep it as a calm statement or a simple question about that same thing. Keep facts about the child's welfare as written and only remove the blame words around them.
Return ONLY JSON: {"options":[{"tone":"Neutral","text":"..."},{"tone":"Brief","text":"..."},{"tone":"Collaborative","text":"..."}],"changes":"one or two plain sentences on what you changed"}`;

const SEND_SYSTEM = `Check a co-parent's draft message to the other parent.
needs_rewrite = true if it is aggressive, hostile, passive aggressive, sarcastic, blaming, reproachful, guilt-tripping, threatening, uses absolutes about the other parent (always, never), or uses the child as leverage or as a messenger against the other parent. Otherwise false (neutral, factual, polite or kind).
If it reports a safety concern, risk of harm or an emergency about the child or sender: needs_rewrite = false.
If true, rewrite = one calm version:
- Use ONLY facts in the draft. Keep names, dates, times, amounts, medication and items word for word. Never add times, places, deadlines, receipts, agreements, schools, reasons or offers the sender did not mention.
- A child's health, safety, medication, school or care need stays a clear, direct, polite statement or request. Keep the need, the item, any time given and who does what. For example "Leo needs his inhaler" stays "Leo needs his inhaler" followed by a clear polite ask such as "Could you make sure he has it, please?". Never turn such a need into a suggestion to talk about it: never write "could we discuss", "can we talk about" or "could we please talk about" for a health, safety, medication, school or care need.
- If the draft makes any other request (for example pay an amount by a date), keep that exact request, amount and date as a clear, polite request.
- Never add a request, topic, plan, suggestion or commitment the parent did not write (for example never add "Could we focus on our parenting plan?" or "Could we talk about how we communicate?"). Only soften what is already there. A stated child need (for example "Leo needs his inhaler") may end with a polite ask for that same need.
- When the draft states a fact or event with no request, keep it as a calm statement, or as a simple question about that same thing (for example a school play becomes a question about attending it). Add nothing new.
- Keep facts about the child's welfare as written (for example "Leo was hungry and dirty when he returned" stays). Only remove the blame words around them.
- Remove all blame and reproach, including about the past: no disappointment, sarcasm, guilt, accusations, assumptions about the other parent's feelings, motives or future behaviour, absolutes (always, never) or threats. Never write "I am disappointed", "you cannot make it", "in the future" or "make sure you can". Keep only the request and the next step.
- Never mention children, people or details that are not in the draft.
- If it is about the child, frame it around what the child needs, using "we" where natural. Never use the child as leverage, never pass messages through the child.
- Never use the words "police" or "victim". Drop threats of police or court.
- Same length as the draft or shorter. Plain, warm, brief, UK English spelling, no em dashes, no legal advice.
If false: rewrite = "".`;

const SEND_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "calm_check",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { needs_rewrite: { type: "boolean" }, rewrite: { type: "string" } },
      required: ["needs_rewrite", "rewrite"],
    },
  },
};

const callGateway = (apiKey: string, body: Record<string, unknown>) =>
  fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

const gatewayError = (resp: Response) => {
  if (resp.status === 429) return json({ error: "Too many requests - please try again in a moment." }, 429);
  if (resp.status === 402) return json({ error: "AI credits have run out." }, 402);
  if (!resp.ok) return json({ error: "The writing aid is unavailable right now." }, resp.status >= 500 ? 502 : resp.status);
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { draft, mode } = body ?? {};

    // Status mode: no draft, no AI call, no logging, no DB writes. Auth is always checked.
    if (mode === "status") {
      const denied = await requirePremium(req, "rewrite");
      if (denied && (denied.status === 401 || denied.status === 503)) return denied;
      return json({
        requires_premium: CALM_CHECK_REQUIRES_PREMIUM,
        has_access: !CALM_CHECK_REQUIRES_PREMIUM || denied === null,
      });
    }

    // send: Premium when the switch is on, otherwise signed-in only. Any other mode: always Premium.
    const denied = mode === "send"
      ? (CALM_CHECK_REQUIRES_PREMIUM ? await requirePremium(req, "rewrite") : await requireSignedIn(req))
      : await requirePremium(req, "rewrite");
    if (denied) return denied;

    if (!draft || typeof draft !== "string" || draft.length > 4000) return json({ error: "Missing draft" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    if (mode === "send") {
      const resp = await callGateway(apiKey, {
        model: "google/gemini-3.1-flash-lite",
        max_tokens: 600,
        response_format: SEND_SCHEMA,
        messages: [
          { role: "system", content: SEND_SYSTEM },
          { role: "user", content: draft },
        ],
      });
      const err = gatewayError(resp);
      if (err) return err;
      const pass = { needs_rewrite: false, rewrite: null };
      try {
        const data = await resp.json();
        const raw: string = data.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
        if (parsed?.needs_rewrite !== true || typeof parsed.rewrite !== "string") return json(pass);
        const rewrite = parsed.rewrite.replace(/\s*—\s*/g, " - ").trim();
        if (!rewrite || rewrite === draft.trim()) return json(pass);
        return json({ needs_rewrite: true, rewrite });
      } catch {
        return json(pass);
      }
    }

    const resp = await callGateway(apiKey, {
      model: "openai/gpt-6-astra",
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: draft },
      ],
    });
    const err = gatewayError(resp);
    if (err) return err;

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    let parsed: { options?: { tone: string; text: string }[]; changes?: string } = {};
    try {
      parsed = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
    } catch {
      parsed = { options: [{ tone: "Neutral", text: raw.trim() }] };
    }
    const options = (parsed.options ?? []).filter((o) => o?.text?.trim()).slice(0, 3)
      .map((o) => ({ tone: o.tone, text: o.text.replace(/—/g, "-").trim() }));
    return json({ options, changes: parsed.changes ?? "", suggestion: options[0]?.text ?? "" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
