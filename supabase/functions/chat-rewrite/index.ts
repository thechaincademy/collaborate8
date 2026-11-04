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
Keep the softened ask concrete and specific to what the parent wrote: name the same child, person and thing the parent objects to, and never replace it with general wording such as "conversations remain neutral", "personal matters", "adult matters" or "her well-being"; never reuse a stock sentence. If the draft only reports something that already happened to the child and asks for nothing, keep it as a calm statement of fact in the draft's own plain terms with no request added.
Return ONLY JSON: {"options":[{"tone":"Neutral","text":"..."},{"tone":"Brief","text":"..."},{"tone":"Collaborative","text":"..."}],"changes":"one or two plain sentences on what you changed"}`;

const SEND_SYSTEM = `You check a message a separated parent has drafted to the other parent and, if needed, write one calmer version. Work in three steps and fill every JSON field.
Language: the rewrite uses the draft's own language or languages. If the draft mixes languages, keep each part in the language the parent wrote it in. Never translate anything, and never drop a sentence or fact because of its language.

Step 1. needs_rewrite: true if the draft is aggressive, hostile, passive aggressive, sarcastic, blaming, reproachful, guilt-tripping, threatening, uses absolutes about the other parent (always, never), or uses a child as leverage or as a messenger against the other parent. false if it is neutral, factual, polite, firm but polite, or kind. false if it reports a safety concern, risk of harm or an emergency about a child or the sender.

Step 2. Always read the draft and fill:
- draft_languages: every language used in the draft, as ISO 639-1 codes (for example "en", "pt").
- facts: every fact in the draft, each as one short plain sentence. Include what happened or is happening to a child, how the child was or is (feelings and behaviour as described), anything that was not done, times, dates, days, amounts, doses, numbers, frequencies and durations, places, items, and who did or must do what. Leave out insults, sarcasm, blame and opinions about the other parent. A mention of the other parent's past lapse that is only a side remark to criticise them (next to a separate ask or need) is blame: leave it out. Keep it only when that event is what the draft is reporting.
  Write each fact in the language the draft used for it, and set lang to that ISO 639-1 code.
  actor = who did, missed or must do the thing in this fact, as the draft refers to them: "you" for the other parent, "I" for the sender, or the person's name. "" if nobody does anything. action = the one verb from the draft for what the actor did, missed or must do, copied as written (for example "missed"), or "".
  For each fact, keep = the words that carry it and must appear unchanged in the rewrite: names, numbers with units exactly as written, days, dates, frequency and duration phrases, and the word for the child's state or what happened. Copy them from the draft in the draft's own language, never translated. Frequency and count words go in keep only when they describe the child's state or are a specific count (twice, three times, third time this week, all night, all week). Words such as again, always, never, as usual or every time that only criticise the other parent are blame, in any language: leave them out of keep and out of the rewrite. A crude or exaggerated word may be replaced by its plain everyday word with the same meaning, and then that plain word goes in keep; otherwise keep the parent's word and never weaken it. Each keep entry is one to four words.
- has_ask: true if the draft asks or tells the other parent to do or not do something (including a demand implied by a stated rule or by a warning about what they do next), asks a question that wants a real answer, or states something a child needs from them. false if it only reports or complains about what already happened (even when the complaint implies the other parent should do better), asks only rhetorical or sarcastic questions, or only states the sender's own decision.
- ask: that ask in plain words, or "".
- states_decision: true if the sender states something they have decided or will do themselves.

Step 3. If needs_rewrite is true, write rewrite, one calm version:
- Keep every fact with the same meaning and tense, using its keep words, in the language the draft used for it.
- Keep who did what: each fact's actor stays the one who did, missed or must do that same action (you stays you, I stays I, a person stays that person). Never make the child or anyone else the one who did it. Keep date wording such as due, by and on as written, and never turn a future date or deadline into a past one. Never add a time, day, date, number, unit, place, person, reason, option or detail that is not in the draft. Never add words such as tonight, today, next time or in future, and never add am or pm to a bare number.
- If has_ask is false: write only calm statements of the facts. No question, no "please", no request, no suggestion and no next step.
- If has_ask is true: keep that same ask, concrete and specific (the same child, person, item, amount, time and date), as one clear polite request. A child's health, safety, medication, school or care need stays a clear direct request, never a suggestion to talk about it. Never add a second ask, an option or a plan.
- If states_decision is true: the decision stays a calm statement of what the sender will do, in their own terms. Never turn it into a question or a request and never offer alternatives.
- Remove all blame, reproach, sarcasm, insults, threats, guilt, absolutes and assumptions about the other parent's motives or feelings, including about the past. An accusation may be softened to a neutral word (an accusation of dishonesty becomes "not true"), but keep who and what it is about; never replace it with general wording.
- Never use a child as leverage or pass messages through a child. Never use the words "police" or "victim". No legal advice.
- Say each fact once; do not repeat an item, dose or time in the ask, refer back with it, this or them.
- Plain, brief and warm. UK English spelling, no em dashes. About the same length as the draft or shorter.
If needs_rewrite is false: rewrite = "".`;

const SEND_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "calm_check",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        needs_rewrite: { type: "boolean" },
        draft_languages: { type: "array", items: { type: "string" } },
        facts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              fact: { type: "string" },
              lang: { type: "string" },
              actor: { type: "string" },
              action: { type: "string" },
              keep: { type: "array", items: { type: "string" } },
            },
            required: ["fact", "lang", "actor", "action", "keep"],
          },
        },
        has_ask: { type: "boolean" },
        ask: { type: "string" },
        states_decision: { type: "boolean" },
        rewrite: { type: "string" },
      },
      required: ["needs_rewrite", "draft_languages", "facts", "has_ask", "ask", "states_decision", "rewrite"],
    },
  },
};

const RETRY_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "calm_retry",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { rewrite: { type: "string" } },
      required: ["rewrite"],
    },
  },
};

// mode:send time budget. The app gives up at about 4s, so the whole round trip must stay near 3s.
const SEND_DEADLINE_MS = 2900;
const SEND_RETRY_MIN_LEFT_MS = 900;

type SendFact = { fact?: unknown; lang?: unknown; actor?: unknown; action?: unknown; keep?: unknown };
type SendCheck = { facts: SendFact[]; has_ask: boolean; states_decision: boolean; languages: string[] };

const normText = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const numberTokens = (s: string) =>
  new Set(
    (normText(s).match(/£?\d+(?:[.:,]\d+)*(?:\s?(?:am|pm|ml|mg|kg|g|p|st|nd|rd|th|%|h(?:\d{2})?))?(?![\p{L}\p{N}])/gu) ?? [])
      .map((t) => t.replace(/\s/g, "")),
  );

const numberTokenList = (s: string) =>
  (normText(s).match(/£?\d+(?:[.:,]\d+)*(?:\s?(?:am|pm|ml|mg|kg|g|p|st|nd|rd|th|%|h(?:\d{2})?))?(?![\p{L}\p{N}])/gu) ?? [])
    .map((t) => t.replace(/\s/g, ""));
const contentWords = (sentence: string) =>
  new Set(sentence.split(WORD_SPLIT).map((w) => w.replace(/^[.:]+|[.:]+$/g, "")).filter((w) => w.length > 2 && !KEEP_STOP_WORDS.has(w)));
const KEEP_STOP_WORDS = new Set(["the", "and", "his", "her", "their", "your", "our", "was", "were", "for", "with", "that", "this", "from", "are", "has", "have", "had", "she", "him", "them", "you", "please", "could", "would", "can", "will"]);

const WORD_SPLIT = /[^\p{L}\p{N}£.:%']+/u;
const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const TIME_WORDS = [
  "tonight", "today", "tomorrow", "yesterday", "this morning", "this afternoon", "this evening", "this week",
  "this weekend", "next week", "next weekend", "next time", "in future", "in the future", "from now on",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "hoje", "amanhã", "ontem", "esta noite", "logo à noite", "da próxima vez", "na próxima semana", "a partir de agora",
  "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo",
  "hoy", "mañana", "ayer", "esta noche", "la próxima vez", "la próxima semana", "a partir de ahora",
  "lunes", "martes", "miércoles", "jueves", "viernes",
];
const wordRe = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "u");
const MONTHS: [string, RegExp][] = [
  ["jan", wordRe("jan(uary)?|janeiro|enero")], ["feb", wordRe("feb(ruary)?|fevereiro|febrero")],
  ["mar", wordRe("march|março|marzo")], ["apr", wordRe("apr(il)?|abril")], ["may", wordRe("maio|mayo")],
  ["jun", wordRe("june?|junho|junio")], ["jul", wordRe("july?|julho|julio")], ["aug", wordRe("aug(ust)?|agosto")],
  ["sep", wordRe("sept?(ember)?|setembro|septiembre")], ["oct", wordRe("oct(ober)?|outubro|octubre")],
  ["nov", wordRe("nov(ember)?|novembro|noviembre")], ["dec", wordRe("dec(ember)?|dezembro|diciembre")],
];
const ASK_MARKERS = wordRe("please|could you|can you|would you|will you|make sure|ensure|let me know|i would like you|i'd like you|por favor|podes|pode|poderias|podia|puedes|podrías|podria|asegúrate|certifica-te");
const hasWord = (text: string, w: string) => wordRe(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text);

const KEEP_STOP = new Set(["a", "an", "the", "of", "to", "at", "in", "on", "for", "with", "and", "or", "his", "her", "their", "my", "your", "our", "is", "was", "were", "be", "by", "from", "that", "this", "it"]);
const wordStem = (w: string) => stripAccents(w.replace(/'s$/, "")).slice(0, 4);
// A keep entry counts as kept if the exact phrase is there, or every content word appears (same first four letters).
const keepFound = (keep: string, rewrite: string) => {
  if (rewrite.includes(keep)) return true;
  const words = keep.split(WORD_SPLIT).map((w) => w.replace(/^[.:]+|[.:]+$/g, "")).filter((w) => w && !KEEP_STOP.has(w));
  if (!words.length) return true;
  const have = new Set(rewrite.split(WORD_SPLIT).map((w) => w.replace(/^[.:]+|[.:]+$/g, "")).filter(Boolean).map(wordStem));
  return words.every((w) => have.has(wordStem(w)));
};


// Blame frequency words (about the other parent) never count as facts that must be kept.
const BLAME_FREQ = new Set(["again", "always", "never", "as usual", "every time", "every single time", "yet again", "once again",
  "outra vez", "de novo", "sempre", "nunca", "como sempre", "otra vez", "de nuevo", "siempre", "como siempre"]);

// Language markers: common function words that are distinctive enough per language.
const LANG_MARKERS: Record<string, Set<string>> = {
  en: new Set(["the", "and", "is", "was", "you", "your", "please", "with", "for", "she", "he", "her", "his", "last", "time", "need", "needs", "this", "that", "have", "has", "after", "before", "at", "to", "of", "in", "on", "it", "my", "i", "he's", "she's", "it's", "i'm", "can't", "don't", "didn't", "been", "all", "night"]),
  pt: new Set(["não", "nao", "ela", "ele", "uma", "um", "da", "das", "dos", "às", "ao", "aos", "você", "voce", "tu", "foi", "ficou", "também", "muito", "isso", "essa", "esse", "noite", "eu", "meu", "minha", "seu", "sua", "com", "olha", "hoje", "amanhã", "outra", "vez", "precisa", "tem", "está", "em", "na", "nas", "nos", "pelo", "pela", "é", "só", "já", "mas", "nem", "toda", "todo", "depois", "antes", "levar", "leva", "traz", "horas"]),
  es: new Set(["ella", "él", "una", "del", "los", "las", "muy", "pero", "eso", "esa", "ese", "noche", "yo", "usted", "tú", "necesita", "mañana", "hoy", "otra", "con", "tiene", "también", "cuando", "el", "la", "y", "es", "le", "lo", "se", "dale", "sabes", "ya", "puso", "peor", "desde", "toda", "todo", "después", "antes", "lleva", "trae", "horas"]),
  fr: new Set(["le", "les", "des", "est", "pas", "je", "vous", "avec", "pour", "une", "elle", "il", "du", "au", "aux", "mais", "très", "cette", "ça", "merci", "demain", "aujourd'hui", "soir"]),
  de: new Set(["der", "das", "und", "ist", "nicht", "ich", "du", "mit", "für", "ein", "eine", "auch", "aber", "bitte", "heute", "morgen", "wieder", "dem", "den"]),
  it: new Set(["il", "non", "che", "della", "con", "una", "sono", "lei", "lui", "anche", "molto", "oggi", "domani", "stasera", "gli", "ancora", "questo", "questa"]),
};
const LANG_ACCENTS: Record<string, RegExp> = { pt: /[ãõ]/gu, es: /[ñ¿¡]/gu };
const LANG_NAMES: Record<string, string> = { en: "English", pt: "Portuguese", es: "Spanish", fr: "French", de: "German", it: "Italian" };
const langScore = (text: string, lang: string) => {
  const marks = LANG_MARKERS[lang];
  if (!marks) return 0;
  const words = text.split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  return words.filter((w) => marks.has(w)).length + ((LANG_ACCENTS[lang] && text.match(LANG_ACCENTS[lang])?.length) || 0);
};
const langCode = (l: unknown) => (typeof l === "string" ? l.trim().toLowerCase().slice(0, 2) : "");

// Who did what: the word just before an action verb (skipping auxiliaries) is its subject.
const ROLE_OTHER = new Set(["you", "você", "voce", "tu", "usted", "tú", "vous", "du"]);
const ROLE_SELF = new Set(["i", "eu", "yo", "je", "ich", "io", "we", "nós", "nosotros"]);
const ROLE_THIRD = new Set(["he", "she", "they", "ele", "ela", "eles", "elas", "él", "ella", "ellos", "ellas", "il", "elle", "er", "sie", "lui", "lei"]);
const SUBJ_SKIP = new Set(["has", "have", "had", "did", "didn't", "does", "doesn't", "do", "don't", "not", "also", "just", "already", "was", "wasn't", "were", "weren't", "is", "isn't", "will", "won't", "would", "wouldn't", "could", "couldn't", "can", "can't", "may", "might", "should", "shouldn't", "must", "to", "again", "still", "never", "always", "unfortunately", "sadly", "really", "then", "both", "all", "only", "não", "nao", "já", "também", "nem", "sempre", "nunca", "no", "ya", "nunca", "siempre", "se", "me", "te", "lhe", "le", "o", "a", "lo", "la"]);
const CAP_SKIP = new Set(["i", "please", "hi", "hey", "olha", "oh", "the", "make", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "dentist", "bedtime", "fine", "typical", "pathetic", "can", "christmas", "grandma", "ipad", "epipen", "calpol"]);
const PASSIVE_AUX = new Set(["was", "were", "been", "being", "is", "are", "be", "foi", "foram", "fue", "fueron", "sido"]);
const subjTokens = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean).map((w) => w.replace(/'(ve|ll|d|re|s|m)$/, ""));
const draftNames = (draft: string) => {
  const names = new Set<string>();
  for (const sent of draft.split(/(?<=[.!?])\s+/)) {
    const words = sent.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean);
    words.forEach((w, i) => {
      const b = w.replace(/['’]s$/, "");
      if (i > 0 && /^\p{Lu}\p{Ll}+$/u.test(b) && !CAP_SKIP.has(b.toLowerCase())) names.add(b.toLowerCase());
    });
  }
  return names;
};
const roleOf = (w: string, names: Set<string>) =>
  ROLE_OTHER.has(w) ? "other" : ROLE_SELF.has(w) ? "self" : ROLE_THIRD.has(w) ? "third" : names.has(w) ? `name:${w}` : null;
const actorRole = (actor: unknown, names: Set<string>) => {
  if (typeof actor !== "string") return null;
  const a = actor.trim().toLowerCase().replace(/^the /, "");
  if (!a) return null;
  if (ROLE_OTHER.has(a) || a === "other parent" || a === "co-parent") return "other";
  if (ROLE_SELF.has(a) || a === "sender" || a === "me") return "self";
  const first = a.split(/\s+/)[0];
  return names.has(first) ? `name:${first}` : roleOf(first, names);
};
// Subjects of each use of a verb (matched on its first 4 letters) in a text.
const subjectsOf = (text: string, verb: string, names: Set<string>) => {
  const stem = stripAccents(verb).slice(0, Math.min(4, verb.length));
  const out: (string | null)[] = [];
  for (const sent of text.split(/(?<=[.!?,;])\s+/)) {
    const toks = subjTokens(sent);
    toks.forEach((t, i) => {
      if (stripAccents(t).slice(0, stem.length) !== stem || t.length < 3) return;
      let subj: string | null = null;
      // Passive ("the call was missed"): no subject to compare.
      if (i > 0 && PASSIVE_AUX.has(toks[i - 1])) { out.push(null); return; }
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (SUBJ_SKIP.has(toks[j])) continue;
        subj = roleOf(toks[j], names);
        break;
      }
      out.push(subj);
    });
  }
  return out;
};
const sameActor = (a: string, b: string) =>
  a === b || (a === "third" && b.startsWith("name:")) || (b === "third" && a.startsWith("name:"));

// Deterministic fact check. Returns failure codes (for logs) and plain notes (for the retry prompt only).
const checkRewrite = (draft: string, rewrite: string, c: SendCheck) => {
  const codes = new Set<string>();
  const notes: string[] = [];
  const d = normText(draft);
  const r = normText(rewrite);
  if (!r) return { codes: ["empty"], notes: ["The rewrite was empty."] };
  if (/\b(police|victim)\b/.test(r)) { codes.add("banned_word"); notes.push('Do not use "police" or "victim".'); }

  const dn = numberTokens(draft), rn = numberTokens(rewrite);
  for (const t of rn) {
    if (dn.has(t)) continue;
    codes.add("new_number");
    const base = [...dn].find((x) => t.startsWith(x) || x.startsWith(t));
    notes.push(base ? `The draft writes "${base}", not "${t}". Write "${base}" exactly, with nothing added.` : `"${t}" is not in the draft. Write numbers, times and units exactly as the draft does.`);
  }
  for (const t of dn) if (!rn.has(t)) { codes.add("dropped_number"); notes.push(`"${t}" from the draft is missing.`); }

  for (const w of TIME_WORDS) if (hasWord(r, w) && !hasWord(d, w)) { codes.add("new_time_word"); notes.push(`"${w}" is not in the draft. Do not add it.`); }
  for (const w of ["was due", "were due", "had been due", "was supposed to", "was meant to"]) {
    if (r.includes(w) && !d.includes(w)) { codes.add("tense_changed"); notes.push(`"${w}" changes the tense of the draft. Keep the draft's own date wording and tense.`); }
  }
  for (const [key, re] of MONTHS) if (re.test(r) && !re.test(d)) { codes.add("new_time_word"); notes.push(`A month (${key}) was added that is not in the draft.`); }

  const missing: string[] = [];
  for (const f of c.facts ?? []) {
    const keep = Array.isArray(f?.keep) ? f.keep : [];
    for (const k of keep) {
      if (typeof k !== "string") continue;
      const nk = normText(k).replace(/^[^\p{L}\p{N}£]+|[^\p{L}\p{N}%]+$/gu, "");
      if (!nk || nk.split(" ").length > 6 || BLAME_FREQ.has(nk)) continue;
      // Keep words must be the draft's own words (in its own language); a translated keep is not trusted.
      if (!keepFound(nk, d)) continue;
      if (!keepFound(nk, r)) { codes.add("missing_fact"); missing.push(k); }
    }
  }
  if (missing.length) notes.push(`These words from the draft are missing: ${missing.map((k) => `"${k}"`).join(", ")}. Use each of them exactly as the draft writes them, in the draft's language.`);

  // Language: every language the draft is written in must still be there (no translating, no dropped parts).
  const langs = new Set<string>(c.languages.map(langCode).filter((l) => LANG_MARKERS[l]));
  for (const l of Object.keys(LANG_MARKERS)) if (langScore(d, l) >= 2) langs.add(l);
  for (const l of langs) {
    const ds = langScore(d, l);
    if (ds < 2) continue;
    if (langScore(r, l) < (ds >= 6 ? 2 : 1)) {
      codes.add("language_changed");
      notes.push(`The draft is written partly or fully in ${LANG_NAMES[l]}. Keep those parts in ${LANG_NAMES[l]} as the parent wrote them, keep the facts they state, and do not translate anything.`);
    }
  }

  // Who did what: the subject of each fact's action must not change to someone else.
  const names = draftNames(draft);
  for (const f of c.facts ?? []) {
    const action = typeof f?.action === "string" ? normText(f.action).split(" ").pop() ?? "" : "";
    if (action.length < 3 || !keepFound(action, d)) continue;
    const want = subjectsOf(d, action, names).find((s) => s) ?? actorRole(f.actor, names);
    if (!want) continue;
    for (const got of subjectsOf(r, action, names)) {
      if (got && !sameActor(want, got)) {
        codes.add("actor_changed");
        const who = want === "other" ? '"you"' : want === "self" ? '"I"' : `"${want.replace(/^name:/, "")}"`;
        notes.push(`In the draft ${who} is the one who "${action}". Keep ${who} as the one who ${action}; do not change who did it.`);
        break;
      }
    }
  }

  // Repeats: a number, time or dose used more often than in the draft, or two sentences saying the same thing.
  const countOf = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const dCount = countOf(numberTokenList(draft));
  for (const [t, n] of countOf(numberTokenList(rewrite))) {
    if (n > 1 && n > (dCount.get(t) ?? 0)) { codes.add("repeat"); notes.push(`"${t}" is written ${n} times. Say it once and refer back with it, this or them.`); }
  }
  const sentences = r.split(/(?<=[.!?])\s+/).map(contentWords).filter((w) => w.size >= 3);
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const shared = [...sentences[i]].filter((w) => sentences[j].has(w)).length;
      if (shared / Math.min(sentences[i].size, sentences[j].size) >= 0.66) {
        codes.add("repeat");
        notes.push("Two sentences say the same thing. State the fact once and make the ask short, referring back with it, this or them.");
      }
    }
  }

  if (!c.has_ask) {
    if (r.includes("?")) { codes.add("question_added"); notes.push("The draft asks for nothing, so the rewrite must not ask a question."); }
    if (ASK_MARKERS.test(r)) { codes.add("ask_added"); notes.push("The draft asks for nothing, so the rewrite must not add a request. Write only calm statements of the facts."); }
  }
  if (c.states_decision && r.includes("?") && !d.includes("?")) {
    codes.add("decision_as_question");
    notes.push("The sender's decision must stay a statement, not a question.");
  }
  return { codes: [...codes], notes };
};

const logSend = (outcome: string, reasons: string[], attempts: number, started: number) =>
  console.log(JSON.stringify({ fn: "chat-rewrite", event: "calm_check", outcome, reasons, attempts, ms: Date.now() - started }));

const callGateway = (apiKey: string, body: Record<string, unknown>, signal?: AbortSignal) =>
  fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  });

const gatewayError = (resp: Response) => {
  if (resp.status === 429) return json({ error: "Too many requests - please try again in a moment." }, 429);
  if (resp.status === 402) return json({ error: "AI credits have run out." }, 402);
  if (!resp.ok) return json({ error: "The writing aid is unavailable right now." }, resp.status >= 500 ? 502 : resp.status);
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
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
      const pass = { needs_rewrite: false, rewrite: null };
      const deadline = started + SEND_DEADLINE_MS;
      let settled = false;
      const log = (outcome: string, reasons: string[], attempts: number) => {
        if (!settled) logSend(outcome, reasons, attempts, started);
      };
      const runSend = async (): Promise<Response> => {
        const timed = async (payload: Record<string, unknown>) => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), Math.max(0, deadline - Date.now()));
          try {
            return await callGateway(apiKey, payload, ctrl.signal);
          } finally {
            clearTimeout(timer);
          }
        };
        const firstMessages = [
          { role: "system", content: SEND_SYSTEM },
          { role: "user", content: draft },
        ];
        let resp: Response;
        try {
          resp = await timed({ model: "google/gemini-3.1-flash-lite", max_tokens: 800, response_format: SEND_SCHEMA, messages: firstMessages });
        } catch {
          log("fallback", ["timeout"], 1);
          return json(pass);
        }
        const err = gatewayError(resp);
        if (err) return err;
        let parsed: Record<string, unknown>;
        let raw = "";
        try {
          const data = await resp.json();
          raw = data.choices?.[0]?.message?.content ?? "";
          parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
        } catch {
          log("fallback", ["parse"], 1);
          return json(pass);
        }
        if (parsed?.needs_rewrite !== true || typeof parsed.rewrite !== "string") {
          log("pass", [], 1);
          return json(pass);
        }
        const clean = (s: string) => s.replace(/\s*—\s*/g, " - ").trim();
        const checkInput: SendCheck = {
          facts: Array.isArray(parsed.facts) ? (parsed.facts as SendFact[]) : [],
          has_ask: parsed.has_ask === true,
          states_decision: parsed.states_decision === true,
          languages: Array.isArray(parsed.draft_languages) ? (parsed.draft_languages as unknown[]).filter((l): l is string => typeof l === "string") : [],
        };
        let rewrite = clean(parsed.rewrite as string);
        let result = checkRewrite(draft, rewrite, checkInput);
        let attempts = 1;
        if (result.codes.length) {
          if (deadline - Date.now() < SEND_RETRY_MIN_LEFT_MS) {
            log("fallback", ["no_time_for_retry", ...result.codes], attempts);
            return json(pass);
          }
          attempts = 2;
          try {
            const retry = await timed({
              model: "google/gemini-3.1-flash-lite",
              max_tokens: 300,
              response_format: RETRY_SCHEMA,
              messages: [
                ...firstMessages,
                { role: "assistant", content: raw },
                {
                  role: "user",
                  content: `Your rewrite failed these checks:\n- ${result.notes.join("\n- ")}\nWrite it again from the draft: keep every fact and the exact words named above, keep the draft's language or languages, keep who did what, remove only the blame, and follow all the rules. Return only JSON {"rewrite":"..."}.`,
                },
              ],
            });
            if (!retry.ok) throw new Error("retry_http");
            const rdata = await retry.json();
            const rraw: string = rdata.choices?.[0]?.message?.content ?? "";
            const rparsed = JSON.parse(rraw.replace(/^```(?:json)?|```$/g, "").trim());
            if (typeof rparsed?.rewrite !== "string") throw new Error("retry_parse");
            rewrite = clean(rparsed.rewrite);
            result = checkRewrite(draft, rewrite, checkInput);
          } catch (e) {
            const reason = e instanceof Error && e.message.startsWith("retry_") ? e.message : "retry_timeout";
            log("fallback", [reason, ...result.codes], attempts);
            return json(pass);
          }
          if (result.codes.length) {
            log("fallback", ["retry_failed", ...result.codes], attempts);
            return json(pass);
          }
        }
        if (!rewrite || rewrite === draft.trim()) {
          log("pass", ["same_as_draft"], attempts);
          return json(pass);
        }
        log("rewrite", [], attempts);
        return json({ needs_rewrite: true, rewrite });
      };
      // Hard stop: whatever happens, answer by the deadline so the app never waits past its own limit.
      let hardTimer: ReturnType<typeof setTimeout> | undefined;
      const hardStop = new Promise<Response>((resolve) => {
        hardTimer = setTimeout(() => {
          if (!settled) logSend("fallback", ["timeout"], 0, started);
          settled = true;
          resolve(json(pass));
        }, Math.max(0, deadline + 100 - Date.now()));
      });
      const work = runSend().then((r) => { settled = true; return r; }, () => { settled = true; return json(pass); });
      const out = await Promise.race([work, hardStop]);
      clearTimeout(hardTimer);
      return out;
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
