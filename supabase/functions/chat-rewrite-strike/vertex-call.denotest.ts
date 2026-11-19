// Deno tests for chat-rewrite-strike's model call (Vertex, London). Run with:
//   cd supabase/functions/chat-rewrite-strike && deno test --allow-env --allow-net=127.0.0.1 vertex-call.denotest.ts
// (Not named *_test.ts so the repo bun run skips it.) No network: fetch is replaced.
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1'

// A throwaway service account with a real RSA key, so the token minting path runs for real.
const kp = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'],
)
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey))
const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----\n`
Deno.env.set('GCP_VERTEX_SA_JSON', JSON.stringify({ client_email: 'test@example.iam.gserviceaccount.com', private_key: pem }))
Deno.env.delete('VERTEX_MODEL')

const { callGateway, gatewayError } = await import('./vertex-call.ts')
const { callVertex, vertexConfigured, LOCATION } = await import('../_shared/vertex.ts')

const STRIKE_BODY = {
  model: 'vertex',
  max_completion_tokens: 400,
  reasoning_effort: 'none',
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'calm_strike', strict: true, schema: { type: 'object', additionalProperties: false, properties: { strikes: { type: 'array', items: { type: 'string' } } }, required: ['strikes'] } },
  },
  messages: [{ role: 'system', content: 'SYSTEM PROMPT' }, { role: 'user', content: 'DRAFT' }],
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; body: unknown }> = []
  const orig = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    let body: unknown = init?.body
    try { body = JSON.parse(String(init?.body)) } catch { /* form body */ }
    calls.push({ url, body })
    return await handler(url, init)
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = orig } }
}

const ok = (content: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: content }] }, finishReason: 'STOP' }] }), { status: 200 })

Deno.test('strike call goes to Vertex europe-west2 with the default model, never Lovable or global', async () => {
  assert(vertexConfigured())
  const m = mockFetch((url) => url.startsWith('https://oauth2.googleapis.com/token')
    ? new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
    : ok('{"strikes":["you always forget"]}'))
  try {
    const resp = await callGateway('vertex', STRIKE_BODY)
    assertEquals(resp.status, 200)
    const data = await resp.json()
    // Same output shape the strike parser reads: choices[0].message.content
    assertEquals(JSON.parse(data.choices[0].message.content), { strikes: ['you always forget'] })
    const gen = m.calls.find((c) => c.url.includes(':generateContent'))!
    assertEquals(new URL(gen.url).hostname, 'europe-west2-aiplatform.googleapis.com')
    assert(gen.url.includes('/locations/europe-west2/publishers/google/models/gemini-3.5-flash:generateContent'))
    for (const c of m.calls) assertFalse(/lovable|global/i.test(c.url))
    const body = gen.body as Record<string, any>
    assertEquals(body.systemInstruction.parts[0].text, 'SYSTEM PROMPT')
    assertEquals(body.contents, [{ role: 'user', parts: [{ text: 'DRAFT' }] }])
    assertEquals(body.generationConfig.maxOutputTokens, 400)
    assertEquals(body.generationConfig.responseMimeType, 'application/json')
    assertEquals(body.generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL' })
    assertEquals(body.generationConfig.responseJsonSchema.properties.strikes.type, 'array')
    assertFalse('additionalProperties' in body.generationConfig.responseJsonSchema)
    assertFalse('model' in body)
  } finally {
    m.restore()
  }
})

Deno.test('VERTEX_LOCATION=global is refused and London is used', () => {
  Deno.env.set('VERTEX_LOCATION', 'global')
  try { assertEquals(LOCATION(), 'europe-west2') } finally { Deno.env.delete('VERTEX_LOCATION') }
  Deno.env.set('VERTEX_LOCATION', 'europe-west4')
  try { assertEquals(LOCATION(), 'europe-west2') } finally { Deno.env.delete('VERTEX_LOCATION') }
})

Deno.test('callGateway drops the model field and retries a 429 while time allows', async () => {
  const seen: Record<string, unknown>[] = []
  let n = 0
  const call = (b: Record<string, unknown>) => { seen.push(b); n++; return Promise.resolve(n < 3 ? new Response('{}', { status: 429 }) : new Response('{"choices":[]}', { status: 200 })) }
  const resp = await callGateway('vertex', STRIKE_BODY, undefined, Date.now() + 5000, call)
  assertEquals(resp.status, 200)
  assertEquals(n, 3)
  for (const b of seen) assertFalse('model' in b)
})

Deno.test('callGateway gives up on 429 when the hard stop leaves no room', async () => {
  let n = 0
  const call = () => { n++; return Promise.resolve(new Response('{}', { status: 429 })) }
  const resp = await callGateway('vertex', STRIKE_BODY, undefined, Date.now() + 500, call)
  assertEquals(resp.status, 429)
  assertEquals(n, 1)
})

Deno.test('gatewayError keeps the public error messages', async () => {
  assertEquals(gatewayError(new Response('{}', { status: 200 })), null)
  const r429 = gatewayError(new Response('{}', { status: 429 }))!
  assertEquals(r429.status, 429)
  assertEquals((await r429.json()).error, 'Too many requests - please try again in a moment.')
  const r403 = gatewayError(new Response('{}', { status: 403 }))!
  assertEquals(r403.status, 503)
  assertEquals((await r403.json()).error, 'The writing aid is unavailable right now.')
  assertEquals(gatewayError(new Response('{}', { status: 500 }))!.status, 502)
})

Deno.test('callVertex error keeps the status for the caller', async () => {
  const m = mockFetch((url) => url.startsWith('https://oauth2.googleapis.com/token')
    ? new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
    : new Response('{"error":{"status":"RESOURCE_EXHAUSTED"}}', { status: 429 }))
  try {
    const resp = await callVertex({ messages: [{ role: 'user', content: 'x' }] })
    assertEquals(resp.status, 429)
  } finally {
    m.restore()
  }
})
