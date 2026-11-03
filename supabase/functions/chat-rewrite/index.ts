// Deploy target: supabase/functions/chat-rewrite/index.ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requirePremium } from "../_shared/premium-access.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are a private writing aid for separated co-parents. You receive a draft message one parent wants to send to the other parent.
Step 1: classify the draft.
- needs_rewrite = true when the draft is aggressive, hostile, passive aggressive, sarcastic, blaming, threatening, or uses the child as leverage or as a messenger or tool against the other parent.
- needs_rewrite = false when the draft is neutral, factual, polite or kind.
- Safety rule: if the draft reports a safety concern, a risk of harm, or an emergency about the child or the sender, needs_rewrite = false. Never soften a safety message.
Step 2: return ONE version only.
- If needs_rewrite is true: write one calm, reasonable, collaborative version that keeps the child at the centre (what is best for the child) and never uses the child as leverage. Keep the sender's facts, dates, times, amounts and the request they are making. Invent nothing. Give no legal advice. Use UK English. Use hyphens or commas, never em dashes.
- If needs_rewrite is false: rewrite must be exactly the original draft, unchanged.
reason: one short plain sentence explaining the classification or what you changed.
Return ONLY JSON: {"needs_rewrite": boolean, "rewrite": string, "reason": string}`;

const SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "calm_check",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        needs_rewrite: { type: "boolean" },
        rewrite: { type: "string" },
        reason: { type: "string" },
      },
      required: ["needs_rewrite", "rewrite", "reason"],
    },
  },
};

const build = (needs: boolean, rewrite: string, reason: string) =>
  json({
    needs_rewrite: needs,
    rewrite,
    reason,
    options: [{ tone: "Collaborative", text: rewrite }],
    suggestion: needs ? rewrite : "",
    changes: reason,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const denied = await requirePremium(req, "rewrite");
    if (denied) return denied;
    const { draft } = await req.json();
    if (!draft || typeof draft !== "string" || draft.length > 4000) return json({ error: "Missing draft" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        response_format: SCHEMA,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: draft },
        ],
      }),
    });

    if (resp.status === 429) return json({ error: "Too many requests - please try again in a moment." }, 429);
    if (resp.status === 402) return json({ error: "AI credits have run out." }, 402);
    if (!resp.ok) return json({ error: "The writing aid is unavailable right now." }, resp.status >= 500 ? 502 : resp.status);

    const data = await resp.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    let parsed: { needs_rewrite?: unknown; rewrite?: unknown; reason?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
    } catch {
      parsed = null;
    }
    const reason = typeof parsed?.reason === "string" ? parsed.reason.replace(/[—–]/g, "-").trim() : "";
    const rewrite = typeof parsed?.rewrite === "string" ? parsed.rewrite.replace(/\s*—\s*/g, " - ").trim() : "";
    if (!parsed || !rewrite) return build(false, draft, "");
    let needs = parsed.needs_rewrite === true;
    if (needs && rewrite === draft.trim()) needs = false;
    return build(needs, needs ? rewrite : draft, reason);
  } catch {
    return json({ error: "The writing aid is unavailable right now." }, 500);
  }
});
