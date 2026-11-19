// Model call for chat-rewrite-strike: Vertex AI London (europe-west2) through _shared/vertex.ts, the
// same way chat-rewrite does it. Prompts, request shape (chat-completions style) and the parsed
// response are the same as before. Nothing here logs drafts or output.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callVertex } from "../_shared/vertex.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Same as chat-rewrite: Vertex answers 429 at busy moments on shared capacity, so a 429 is retried
// after a short jittered wait, but only while the hard stop still leaves room for another call.
export const RETRY_429_MAX = 4;
export const RETRY_MIN_CALL_MS = 900;
const abortableSleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(new Error("aborted"));
  const t = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
  const onAbort = () => { clearTimeout(t); reject(new Error("aborted")); };
  signal?.addEventListener("abort", onAbort, { once: true });
});
export const callGateway = async (
  _apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
  deadline?: number,
  call: (b: Record<string, unknown>, s?: AbortSignal) => Promise<Response> = callVertex,
) => {
  const { model: _model, ...rest } = body;
  let resp = await call(rest, signal);
  for (let i = 0; i < RETRY_429_MAX && resp.status === 429; i++) {
    const wait = 150 + Math.floor(Math.random() * 151);
    if (deadline !== undefined && deadline - Date.now() < wait + RETRY_MIN_CALL_MS) break;
    try { await resp.body?.cancel(); } catch { /* ignore */ }
    await abortableSleep(wait, signal);
    resp = await call(rest, signal);
  }
  return resp;
};

export const gatewayError = (resp: Response) => {
  if (resp.status === 429) return json({ error: "Too many requests - please try again in a moment." }, 429);
  if (resp.status === 402 || resp.status === 403) return json({ error: "The writing aid is unavailable right now." }, 503);
  if (!resp.ok) return json({ error: "The writing aid is unavailable right now." }, resp.status >= 500 ? 502 : resp.status);
  return null;
};

