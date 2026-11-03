// Deploy target: supabase/functions/chat-rewrite/index.ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requirePremium } from "../_shared/premium-access.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are a private writing aid for separated co-parents. Rewrite the user's draft message to their co-parent.
Rules: keep it concise, factual, respectful and child-focused. Preserve the sender's meaning, facts, dates, amounts and the action they are asking for.
Remove judgemental, accusatory, sarcastic, legal or emotionally loaded language. Do not invent facts. Do not give legal advice. Use UK English and hyphens, never em-dashes.
Return ONLY JSON: {"options":[{"tone":"Neutral","text":"..."},{"tone":"Brief","text":"..."},{"tone":"Collaborative","text":"..."}],"changes":"one or two plain sentences on what you changed"}`;

const SEND_SYSTEM = `Check a co-parent's draft message to the other parent.
needs_rewrite = true if it is aggressive, hostile, passive aggressive, sarcastic, blaming, threatening, or uses the child as leverage or as a messenger against the other parent. Otherwise false (neutral, factual, polite or kind).
If it reports a safety concern, risk of harm or an emergency about the child or sender: needs_rewrite = false.
If true: rewrite = one calm, collaborative, child-centred version. Keep all facts, dates, times, amounts and the request. Invent nothing, no legal advice, UK English, no em dashes. If false: rewrite = "".`;

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
    const denied = await requirePremium(req, "rewrite");
    if (denied) return denied;
    const { draft, mode } = await req.json();
    if (!draft || typeof draft !== "string" || draft.length > 4000) return json({ error: "Missing draft" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    if (mode === "send") {
      const resp = await callGateway(apiKey, {
        model: "google/gemini-2.5-flash-lite",
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
