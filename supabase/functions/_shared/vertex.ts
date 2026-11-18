import { cfg } from "./config.ts";
// Vertex AI (London, europe-west2) client for Collabor8 edge functions.
// Accepts the OpenAI-style chat body the functions already build and returns a
// Response shaped like an OpenAI chat completion ({ choices: [{ message: { content } }] }),
// so callers keep their prompt and response contract unchanged.
// Auth: service-account JSON in GCP_VERTEX_SA_JSON. An OAuth access token is minted
// with a signed RS256 JWT (WebCrypto) and cached until shortly before it expires.
// Nothing here logs prompts, drafts or model output.

const PROJECT = () => Deno.env.get("VERTEX_PROJECT") ?? "collaborate8-c9e7f";
const LOCATION = () => cfg("VERTEX_LOCATION") ?? "europe-west2";
export const VERTEX_MODEL = () => (cfg("VERTEX_MODEL") ?? "").trim() || "gemini-3.5-flash";

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };
let cached: { token: string; exp: number } | null = null;
let inflight: Promise<string> | null = null;

export const vertexConfigured = () => {
  try {
    const sa = JSON.parse(cfg("GCP_VERTEX_SA_JSON") ?? "");
    return typeof sa?.client_email === "string" && typeof sa?.private_key === "string";
  } catch {
    return false;
  }
};

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const importKey = (pem: string) => {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
};

const mintToken = async (): Promise<string> => {
  const sa = JSON.parse(cfg("GCP_VERTEX_SA_JSON") ?? "{}") as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error("vertex_not_configured");
  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud,
    iat: now,
    exp: now + 3600,
  }));
  const key = await importKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const resp = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  if (!resp.ok) throw new Error(`vertex_token_${resp.status}`);
  const data = await resp.json();
  cached = { token: data.access_token, exp: Date.now() + (Number(data.expires_in ?? 3600) - 120) * 1000 };
  return cached.token;
};

export const vertexToken = async (): Promise<string> => {
  if (cached && cached.exp > Date.now()) return cached.token;
  if (!inflight) inflight = mintToken().finally(() => { inflight = null; });
  return await inflight;
};

// Drop OpenAI-only keys (strict) and keys Gemini's JSON schema support may refuse.
const toGeminiSchema = (s: unknown): unknown => {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== "object") return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (k === "additionalProperties" || k === "strict" || k === "$schema") continue;
    out[k] = k === "properties"
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, toGeminiSchema(pv)]))
      : toGeminiSchema(v);
  }
  return out;
};

type ChatMessage = { role: string; content: string };

export const toGeminiRequest = (body: Record<string, unknown>) => {
  const messages = (body.messages ?? []) as ChatMessage[];
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content ?? "") }] }));
  const generationConfig: Record<string, unknown> = {};
  const maxTokens = body.max_completion_tokens ?? body.max_tokens;
  if (typeof maxTokens === "number") generationConfig.maxOutputTokens = maxTokens;
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  const rf = body.response_format as { type?: string; json_schema?: { schema?: unknown } } | undefined;
  if (rf?.type === "json_object" || rf?.type === "json_schema") generationConfig.responseMimeType = "application/json";
  // responseJsonSchema takes standard JSON Schema. The older OpenAPI-style responseSchema field returns
  // RESOURCE_EXHAUSTED (429) for the send schema on gemini-3.5-flash, so it is not used.
  if (rf?.type === "json_schema" && rf.json_schema?.schema) generationConfig.responseJsonSchema = toGeminiSchema(rf.json_schema.schema);
  // Low-latency paths ask for no or low reasoning; map to the smallest thinking level.
  const effort = body.reasoning_effort;
  if (effort === "none" || effort === "minimal") generationConfig.thinkingConfig = { thinkingLevel: "MINIMAL" };
  else if (effort === "low") generationConfig.thinkingConfig = { thinkingLevel: "LOW" };
  const req: Record<string, unknown> = { contents, generationConfig };
  if (system) req.systemInstruction = { parts: [{ text: system }] };
  return req;
};

// Same signature as the old gateway call, minus the API key.
export const callVertex = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> => {
  const token = await vertexToken();
  const url = `https://${LOCATION()}-aiplatform.googleapis.com/v1/projects/${PROJECT()}/locations/${LOCATION()}/publishers/google/models/${VERTEX_MODEL()}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(toGeminiRequest(body)),
    signal,
  });
  if (!resp.ok) {
    if (resp.status === 401) cached = null;
    await resp.body?.cancel().catch(() => {});
    // Gemini quota errors are 429 (RESOURCE_EXHAUSTED); keep the status for the caller's error mapping.
    return new Response(JSON.stringify({ error: "vertex_error" }), { status: resp.status, headers: { "Content-Type": "application/json" } });
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const content = parts.filter((p: { thought?: boolean }) => !p?.thought).map((p: { text?: string }) => p?.text ?? "").join("");
  return new Response(JSON.stringify({
    choices: [{ message: { role: "assistant", content }, finish_reason: data?.candidates?.[0]?.finishReason ?? null }],
    usage: data?.usageMetadata ?? null,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};
