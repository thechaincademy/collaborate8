import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `You are a private writing aid for separated co-parents. Rewrite the user's draft message to their co-parent.
Rules: keep it concise, factual, respectful and child-focused. Preserve the sender's meaning, facts, dates, amounts and the action they are asking for.
Remove judgemental, accusatory, sarcastic, legal or emotionally loaded language. Do not invent facts. Do not give legal advice. Use UK English and hyphens, never em-dashes.
Return ONLY JSON: {"options":[{"tone":"Neutral","text":"..."},{"tone":"Brief","text":"..."},{"tone":"Collaborative","text":"..."}],"changes":"one or two plain sentences on what you changed"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
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
        response_format: { type: "json_object" },
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
