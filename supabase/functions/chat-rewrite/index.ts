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

Step 1. needs_rewrite: true if the draft is aggressive, hostile, passive aggressive, sarcastic, blaming, reproachful, guilt-tripping, threatening, uses absolutes about the other parent (always, never), or uses a child as leverage or as a messenger against the other parent. false if it is neutral, factual, polite, firm but polite, or kind; a polite refusal or a polite insistence on an agreed arrangement is firm but polite. false if it reports a safety concern, risk of harm or an emergency about a child or the sender.

Step 2. Always read the draft and fill:
- draft_languages: every language used in the draft, as ISO 639-1 codes (for example "en", "pt").
- facts: every fact in the draft, each as one short plain sentence. Include what happened or is happening to a child, how the child was or is (feelings and behaviour as described), anything that was not done, times, dates, days, amounts, doses, numbers, frequencies and durations, places, items, and who did or must do what. Leave out insults, sarcasm, blame and opinions about the other parent. What someone forgot, missed, did not pay or did late is a fact: list it with that person as actor. Threats (court, lawyer, solicitor) are not facts.
  Write each fact in the language the draft used for it. A child's state or health is a fact.
  actor = who did, missed or must do the thing in this fact, as the draft refers to them: "you" for the other parent, "I" for the sender, or the person's name. "" if nobody does anything. action = the one verb from the draft for what the actor did, missed or must do, copied as written (for example "missed"), or "".
  For each fact, keep = the words that carry it and must appear unchanged in the rewrite: names, numbers with units exactly as written, days, dates, frequency and duration phrases, and the word for the child's state or what happened. Copy them from the draft in the draft's own language, never translated. Repetition and count words are facts and go in keep with what they describe (again, second weekend running, third month in a row, every weekend, outra vez, de novo, seguidos, otra vez). Only absolutes such as always, never, as usual and words such as typical are blame: leave them out. A crude or exaggerated word may be replaced by its plain everyday word with the same meaning, and then that plain word goes in keep; otherwise keep the parent's word and never weaken it. Each keep entry is one to four words.
- has_ask: true only if the draft itself makes a request: it asks a question, uses words such as please, could you, can you, make sure or let me know, gives an instruction (for example "bring...", "don't..."), or warns the other parent about what they do next ("if you ... again"), in any language. false if it only states facts, a need or a rule, reports or complains about what already happened, or only states the sender's own decision; then the rewrite stays statements only.
- ask: that ask in plain words, or "". When rewriting, keep the draft's own words for what is asked (its verb and the thing or person it is about); never swap them for a milder or different request.
- states_decision: true if the sender states something they have decided or will do themselves.

Step 3. If needs_rewrite is true, write rewrite, one calm version:
- Use the draft's own language or languages. If the draft mixes languages, keep each part in the language the parent wrote it in, word for word where you can. Never translate any part, and never drop a sentence or fact because of its language. When the draft is not all in English, make the fewest changes: keep the parent's own sentences and phrases as written and only delete the blame words; any word you must add (such as please) goes in the language of the words around it. Never write a sentence or phrase that mixes languages where the draft's own one did not.
- Keep every fact with the same meaning and tense, using its keep words, in the language the draft used for it.
- Keep who did what: each fact's actor stays the one who did, missed or must do that same action (you stays you, I stays I, a person stays that person). Never make the child or anyone else the one who did it. Keep date wording such as due, by and on as written, and never turn a future date or deadline into a past one. Never add a time, day, date, number, unit, place, person, reason, option or detail that is not in the draft. Never add words such as tonight, today, next time or in future, and never add am or pm to a bare number.
- If has_ask is false: write only calm statements of the facts. No question, no "please", no request, no suggestion and no next step. A stated need (someone needs, has to or must have something) stays the same statement; never turn it into a request such as "Please give ...".
- If has_ask is true: keep that same ask, concrete and specific (the same child, person, item, amount, time and date), as one clear polite request; a question stays a question. A child's health, safety, medication, school or care need stays a clear direct request, never a suggestion to talk about it. Never add a second ask, an option or a plan.
- If states_decision is true: the decision stays a calm statement of what the sender will do, in their own terms. Never turn it into a question or a request and never offer alternatives.
- Remove all blame, reproach, sarcasm, insults, threats, guilt, absolutes and assumptions about the other parent's motives or feelings, including about the past. An accusation may be softened to a neutral word (an accusation of dishonesty becomes "not true"), but keep who and what it is about; never replace it with general wording.
- Never use a child as leverage or pass messages through a child. Never use the words "police" or "victim". No legal advice.
- Keep every fact, including what the other parent forgot, missed, did not pay or did late, said calmly with the same person doing it (for example "You forgot Jack's boots last time."). Never drop it and never make it passive.
- Keep every amount with its currency, number, time, day, date, repetition word (again, running, in a row, outra vez, otra vez, seguidos) and medicine name word for word.
- Add nothing: no new sentence, clause, feeling, reason, importance, thanks or understanding (never "is important to me"). Use only the draft's own words, plus "please" at most once.
- If the draft makes no plain request, add none: a stated fact or rule stays a statement, and a question stays a question.
- Remove threats (court, lawyer, solicitor) entirely.
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
              actor: { type: "string" },
              action: { type: "string" },
              keep: { type: "array", items: { type: "string" } },
            },
            required: ["fact", "actor", "action", "keep"],
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

// mode:send time budget. The app gives up at about 4s; network and cold start add up to ~1.3s on the client,
// so the server answers by 2.4s at the latest. Model calls are aborted at 2.3s; a retry starts only with 700ms left.
const SEND_HARD_STOP_MS = 2400;
const SEND_DEADLINE_MS = 2300;
const SEND_RETRY_MIN_LEFT_MS = 700;
const SEND_MODEL = "openai/gpt-5.6-luna";
// OpenAI models take max_completion_tokens; reasoning off keeps the first call near flash-lite latency.
const sendModel = (maxTokens: number) => ({ model: SEND_MODEL, max_completion_tokens: maxTokens, reasoning_effort: "none" });
const SEND_FIRST_CALLS = 2; // parallel first calls; the first that passes the checks wins, the rest are aborted.

type SendFact = { fact?: unknown; actor?: unknown; action?: unknown; keep?: unknown };
type SendCheck = { facts: SendFact[]; has_ask: boolean; states_decision: boolean; languages: string[] };

const normText = (s: string) =>
  s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();

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
const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

// Health and welfare words: when the draft uses one, the rewrite must use the same word (any language, never translated or softened).
const HEALTH_WORDS = new Set([
  "fever", "temperature", "cough", "coughing", "vomit", "vomited", "vomiting", "sick", "ill", "pain", "hurt", "injured", "bitten", "bleeding",
  "rash", "allergy", "allergic", "asthma", "inhaler", "epipen", "medicine", "medication", "ibuprofen", "paracetamol", "calpol", "antibiotics",
  "hospital", "doctor", "gp", "vaccine", "vaccination", "throat", "nightmares", "crying", "sobbing", "worse", "fast",
  "febre", "temperatura", "tosse", "vomitou", "vómitos", "doente", "dor", "magoou", "magoado", "mordido", "alergia", "alérgico", "alérgica",
  "asma", "inalador", "remédio", "medicamento", "medicação", "hospital", "médico", "vacina", "garganta", "pesadelos", "chorar", "chorou", "pior", "jejum", "jejuar",
  "fiebre", "tos", "vomitó", "vómito", "enfermo", "enferma", "dolor", "herido", "herida", "alérgico", "inhalador", "medicina", "vacuna",
  "pesadillas", "llorando", "lloró", "peor", "ayunas", "ayunar",
]);
const healthStem = (w: string) => stripAccents(w).slice(0, Math.min(5, w.length));

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
  const stem = verbStem(verb);
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
const ACTION_EQUIV: Record<string, string[]> = { want: ["like", "wish"] };
// A rewrite that removes none of the draft's words only restyles it: treat the draft as fine and leave it untouched.
const removesNothing = (draft: string, rewrite: string) => {
  const words = (t: string) => expandContractions(normText(t)).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !KEEP_STOP_WORDS.has(w));
  const have = new Set(words(rewrite).map(wordStem));
  return words(draft).every((w) => have.has(wordStem(w)));
};
// "letting" -> "let", "missed" -> "miss": the part of a verb shared by its forms.
const verbStem = (verb: string) => {
  let b = stripAccents(verb.toLowerCase());
  if (b.length > 4) b = b.replace(/(?:ing|ed|es|s)$/, "");
  if (/([b-df-hj-np-tv-z])\1$/.test(b)) b = b.slice(0, -1);
  return b.slice(0, Math.min(4, b.length));
};
const sameActor = (a: string, b: string) =>
  a === b || (a === "third" && b.startsWith("name:")) || (b === "third" && a.startsWith("name:"));


// Asks found by code in a text (the model's has_ask is not trusted on its own).
const IMP_VERBS = new Set([
  "bring", "take", "pack", "give", "send", "pick", "drop", "stop", "keep", "call", "text", "tell", "remember", "pay", "put", "check",
  "sign", "return", "let", "make", "get", "leave", "collect", "book", "buy", "help", "try", "be", "come", "go", "wait", "ask", "answer",
  "reply", "read", "write", "swap", "change", "stay", "don't", "dont", "never", "ensure", "confirm", "tell",
  "leva", "levem", "traz", "traga", "dá", "dê", "manda", "envia", "liga", "paga", "põe", "deixa", "vem", "vai", "lembra", "avisa", "diz",
  "compra", "busca", "apanha", "confirma", "para", "pára",
  "dale", "dame", "da", "lleva", "llévalo", "llévala", "trae", "tráelo", "tráela", "envía", "llama", "pon", "deja", "ven", "dile",
  "recuerda", "acuérdate", "recoge", "confirma",
]);
const NEG_IMP_NEXT = new Set(["le", "les", "lo", "la", "te", "se", "lhe", "des", "dês", "dejes", "deixes", "olvides", "esqueças", "esqueces", "esquece", "penses", "llegues", "chegues"]);
const OBLIGATION = wordRe("you need to|you have to|you must|you should|i need you to|i need it|i need them|i need this|i want you to|i'd like you to|i would like you to|tens de|tens que|precisas de|tienes que|necesito que|preciso que|nem penses|lembra-te|no te olvides|não te esqueças|não esqueças|não esquece");
const CLAUSE_LEAD = new Set(["and", "so", "but", "or", "just", "also", "then", "hi", "hey", "oh", "olha", "fine", "e", "y", "pois", "entonces", "now", "ok", "okay", "honestly"]);
const clausesOf = (t: string) =>
  normText(t).split(/[.!?;,:]+|\s(?:or|and|but|ou|e|y|o|mas|pero)\s/u).map((x) => x.trim()).filter(Boolean);
const clauseWords = (cl: string) => cl.split(/[^\p{L}\p{N}']+/u).filter(Boolean);
const isAskClause = (cl: string) => {
  if (ASK_MARKERS.test(cl) || OBLIGATION.test(cl)) return true;
  const ws = clauseWords(cl);
  let i = 0;
  while (i < ws.length && CLAUSE_LEAD.has(ws[i])) i++;
  const w = ws[i];
  if (!w) return false;
  if (w === "do" && ws[i + 1] === "not") return true;
  // A warning about what the other parent does next ("if you're late again ...") is a demand.
  if ((w === "if" || w === "se" || w === "si") && ["you", "you're", "tu", "tú", "você", "voce", "usted", "voltares", "chegares", "vuelves", "llegas"].includes(ws[i + 1] ?? "")) return true;
  if ((w === "no" || w === "não" || w === "nao" || w === "nem") && NEG_IMP_NEXT.has(ws[i + 1] ?? "")) return true;
  return IMP_VERBS.has(w) && ws.length > i + 1;
};
const textHasAsk = (t: string) => t.includes("?") || clausesOf(t).some(isAskClause);
// Words that say how something is asked, not what is asked.
const ASK_GENERIC = new Set(["please", "stop", "make", "sure", "ensure", "keep", "let", "don't", "dont", "not", "just", "also", "you", "your", "yours",
  "can", "could", "would", "will", "know", "need", "want", "like", "i'd", "about", "again", "always", "never", "more", "anything", "something",
  "this", "that", "them", "these", "those", "there", "here", "time", "last", "por", "favor", "pode", "podes", "puedes", "outra", "otra", "vez"]);

// An accusation softened the way the prompt allows ("lies" -> "not true") still counts as the same thing asked about.
const SOFTENED: Record<string, string[]> = {
  lies: ["true", "untr", "accu"], lyin: ["true", "untr", "accu"], liar: ["true", "untr", "accu"],
  ment: ["verd"], // mentiras / mentir -> verdade / verdad
};
// Specific counts and durations are facts and must stay (frequency words that only blame are not counts).
const COUNT_RE = /(?<![\p{L}\p{N}])(?:(?:first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)) time|twice|(?:two|three|four|five|\d+) times|all (?:night|week|day|weekend|morning|afternoon)|(?:a|à) noite toda|toda a noite|a semana toda|toda a semana|toda la noche|toda la semana|duas vezes|três vezes|dos veces|tres veces|pela (?:segunda|terceira|quarta) vez|por (?:segunda|tercera|cuarta) vez)(?![\p{L}\p{N}])/gu;

const ASK_WRAP = new Set(["please", "ensure", "make", "sure", "that", "the", "kindly", "could", "can", "you", "would"]);
const RESTATE_FREE = new Set(["there", "until", "with", "agreed", "should", "also", "have", "has", "had", "been", "being", "are", "was", "were", "this", "that", "and"]);
const ACCUSE = new Set(["lies", "lie", "lying", "liar", "liars", "mentiras", "mentira", "mentir", "mentiroso", "mentirosa"]);
// The sender's own stance: a wish stays a wish and a future step stays future (never "I will" for "I want", never "I have told" for "I'll tell").
const WISH = wordRe("i want|i'd like|i would like|i wish|eu quero|queria|gostaria|yo quiero|quisiera|me gustaría");
const SELF_FUTURE = wordRe("i'll|i will|i'm going to|i am going to|vou|voy a");
// English needs future wording ("I am informing" is not "I'll tell"); pt/es keep present forms.
const SELF_NOW_OR_FUTURE = wordRe("i'll|i will|i'm going to|i am going to|vou|voy|estou|estoy");

// Copy check for mixed-language drafts: every word must be the draft's own, in the draft's order (only deletions),
// so nothing is translated or re-mixed.
const expandContractions = (t: string) =>
  t.replace(/\bcan't\b|\bcannot\b/g, "can not").replace(/\bwon't\b/g, "will not").replace(/n't\b/g, " not")
    .replace(/'s\b/g, " is").replace(/'re\b/g, " are").replace(/'m\b/g, " am").replace(/'ll\b/g, " will")
    .replace(/'ve\b/g, " have").replace(/'d\b/g, " would");
const COPY_FREE = new Set(["please", "por", "favor", "the", "is", "it"]);
const COPY_GAP = 6;
const copyProblem = (draft: string, rewrite: string) => {
  const toks = (t: string) => t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const dt = toks(expandContractions(normText(draft)));
  const pos = new Map<string, number[]>();
  dt.forEach((w, i) => pos.set(w, [...(pos.get(w) ?? []), i]));
  for (const cl of expandContractions(normText(rewrite)).split(/[.!?;,:]+/)) {
    const ws = toks(cl).filter((w) => !COPY_FREE.has(w));
    for (const w of ws) if (!pos.has(w)) return `"${w}" is not one of the draft's own words`;
    for (let k = 1; k < ws.length; k++) {
      const a = pos.get(ws[k - 1])!, b = pos.get(ws[k])!;
      if (!a.some((i) => b.some((j) => j > i && j - i <= COPY_GAP))) return `"${ws[k - 1]} ${ws[k]}" does not follow the draft's own wording`;
    }
  }
  // An added please / por favor must be in the language of the words it goes with.
  const other = (ws: string[]) => Math.max(...Object.keys(LANG_MARKERS).filter((x) => x !== "en").map((x) => langScore(ws.join(" "), x)));
  for (const sent of expandContractions(normText(rewrite)).split(/[.!?]+/)) {
    const ws = toks(sent);
    for (let i = 0; i < ws.length; i++) {
      if (ws[i] === "please" && !dt.includes("please")) {
        const next = ws.slice(i + 1, i + 9);
        if (other(next) > langScore(next.join(" "), "en")) return `"please" is added to words in another language`;
      }
      if (ws[i] === "por" && ws[i + 1] === "favor" && !(dt.includes("por") && dt.includes("favor"))) {
        const next = ws.slice(i + 2, i + 10);
        if (langScore(next.join(" "), "en") > other(next)) return `"por favor" is added to English words`;
      }
    }
  }
  return null;
};

// ---- fix11: facts the code finds in the draft itself, independent of the model's list ----
// Every one of these must survive the rewrite. The model's facts stay as an extra check on top.
const FX_NEG = new Set(["not", "didn't", "hasn't", "haven't", "hadn't", "wasn't", "weren't", "doesn't", "don't", "won't", "can't", "never", "não", "nao", "nunca", "nem", "no", "ni"]);
const FX_STOP = new Set([
  "a", "an", "the", "this", "that", "these", "those", "it", "its", "i", "me", "my", "mine", "we", "us", "our", "you", "your", "yours", "he", "him", "his",
  "she", "her", "hers", "they", "them", "their", "is", "are", "am", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must", "to", "of", "in", "on", "at", "by", "for", "with", "from", "up", "as",
  "so", "and", "or", "but", "if", "then", "than", "there", "here", "what", "which", "who", "when", "where", "how", "also", "just", "very", "only", "still",
  "o", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "na", "nas", "nos", "em", "ao", "à", "aos", "às", "por", "para",
  "com", "que", "se", "e", "ou", "mas", "eu", "tu", "ele", "ela", "nós", "eles", "elas", "você", "voce", "vocês", "te", "lhe", "seu", "sua", "seus", "suas",
  "meu", "minha", "teu", "tua", "é", "são", "foi", "era", "está", "estão", "estava", "ser", "estar", "ter", "tem", "tinha", "há", "isso", "isto", "esse",
  "essa", "este", "esta", "também", "já", "el", "la", "los", "las", "un", "unos", "unas", "del", "al", "en", "con", "y", "pero", "yo", "tú",
  "él", "ella", "nosotros", "ellos", "ellas", "usted", "le", "les", "lo", "su", "sus", "mi", "mis", "es", "son", "fue", "está", "están", "estaba",
  "tener", "tiene", "tenía", "hay", "eso", "esto", "ese", "esa", "ya",
]);
// Words a calm rewrite may add that carry no new fact: politeness and the frame of a request.
const FX_ALLOWED_NEW = new Set(["please", "kindly", "ensure", "make", "sure", "let", "know", "favor", "favour", "podes", "pode", "puedes", "puede", "podrías", "poderias", "podia", "faz"]);
const FX_IRREG: Record<string, string> = {
  brought: "bring", bought: "buy", caught: "catch", taught: "teach", thought: "think", left: "leave", lost: "lose", paid: "pay", came: "come",
  took: "take", taken: "take", gave: "give", given: "give", told: "tell", sent: "send", went: "go", gone: "go", kept: "keep", slept: "sleep", ate: "eat",
  eaten: "eat", broke: "break", broken: "break", made: "make", said: "say", saw: "see", seen: "see", got: "get", felt: "feel", met: "meet", ran: "run",
  woke: "wake", wore: "wear", drove: "drive", wrote: "write", children: "child", kids: "kid", owed: "owe",
};
// Tokens for comparing words: n't becomes "not", other contractions drop, possessive 's drops.
const fxToks = (t: string) =>
  normText(t).replace(/n't\b/g, " not").replace(/\bcannot\b/g, "can not").split(/[^\p{L}\p{N}']+/u)
    .map((w) => w.replace(/^'+|'+$/g, "").replace(/'(s|ve|ll|re|m|d)$/, "")).filter(Boolean);
const fxBase = (w: string) => FX_IRREG[w] ?? w;
const fxStem = (w: string) => wordStem(fxBase(w));
const fxHasStem = (stems: Set<string>, w: string) => {
  const st = fxStem(w);
  if (stems.has(st)) return true;
  for (const x of stems) if ((x.length >= 3 && st.length >= 3) && (x.startsWith(st) || st.startsWith(x))) return true;
  return false;
};
// Threats are reproach: they may go, and their words are never facts to keep.
const FX_THREAT = wordRe("court|courts|lawyer|lawyers|solicitor|solicitors|legal action|judge|tribunal|tribunais|advogad[oa]s?|juiz|abogad[oa]s?|juez|juzgado|sue|processar|demandar|denunciar|polícia|police|policía");
const FX_THREAT_FRAME = wordRe("i'll|i will|i'm going to|i am going to|i'm calling|i am calling|we'll|we will|or|otherwise|or else|if|vou|vamos|ou|senão|se|falo|voy a|vamos a|o|si|si no|como sigas|hablo|see you in|nos vemos");
const fxSentences = (t: string) => t.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const fxIsThreat = (s: string) => FX_THREAT.test(normText(s)) && FX_THREAT_FRAME.test(normText(s));
// Blame words that must never stay in a rewrite, in any language.
const FX_REPROACH = wordRe("always|never|sempre|nunca|siempre|typical|típico|típica|tipico|pathetic|patético|patética|obviously|clearly|as usual|como sempre|como siempre|useless|inútil|lazy|selfish|irresponsible|irresponsável|irresponsable|do you even|did you even|you even|even bother|do you ever|how hard|not that you|thanks so much|brilliant|honestly|seriously|done being nice|se é que|nem penses|ni se te ocurra|a sério|en serio|ridiculous|ridículo|unbelievable|disgrace|vergonha|vergüenza|incompetent|incompetente|for once|pela primeira vez na vida|por una vez");
const FX_PLEASE = /(?<![\p{L}])(?:please|kindly|por favor|se faz favor|faz favor)(?![\p{L}])/gu;
const FX_TIMES = wordRe([
  "today", "tonight", "tomorrow", "yesterday", "last night", "this morning", "this afternoon", "this evening", "this week", "this weekend", "this month",
  "last week", "last weekend", "last month", "last time", "next week", "next weekend", "next month", "next time", "midnight", "noon", "weekend", "weekends",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "hoje", "amanhã", "ontem", "anteontem", "esta noite", "esta manhã", "esta tarde", "esta semana", "este fim de semana", "fim de semana", "fins de semana",
  "semana passada", "mês passado", "última vez", "meia-noite", "meio-dia", "segunda-feira", "terça-feira", "terça", "quarta-feira", "quinta-feira", "sexta-feira", "sexta", "sábado", "domingo",
  "hoy", "mañana", "ayer", "anoche", "anteayer", "esta noche", "fin de semana", "fines de semana", "semana pasada", "mes pasado", "vez pasada",
  "medianoche", "mediodía", "lunes", "martes", "miércoles", "jueves", "viernes",
].join("|"));
const FX_TIMES_G = new RegExp(FX_TIMES.source, "gu");
const FX_PLACES_G = new RegExp(wordRe("at yours|from yours|at your place|at your house|at your mum's|em tua casa|na tua casa|da tua casa|em casa do pai|em casa da mãe|en tu casa|de tu casa").source, "gu");
const FX_NUM_WORDS = wordRe("two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|half|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|vinte|trinta|quarenta|cinquenta|cem|metade|dos|tres|cuatro|siete|ocho|nueve|diez|doce|veinte|treinta|cuarenta|cincuenta|cien|mitad");
const FX_NUM_WORDS_G = new RegExp(FX_NUM_WORDS.source, "gu");
const FX_MONEY_G = /(?:r\$|us\$|£|€|\$)\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:€|euros?|pounds?|quid|libras?|reais|pesos?|dólares|dolares|dollars?)(?![\p{L}])/gu;
const FX_AGAIN: Record<string, RegExp> = {
  en: wordRe("again|once more"),
  still: wordRe("still|ainda|todavía|aún"),
  pt: wordRe("de novo|outra vez|novamente|mais uma vez"),
  es: wordRe("otra vez|de nuevo|nuevamente|una vez más"),
};
const FX_ORDINAL = "first|second|third|fourth|fifth|sixth|seventh|\\d+(?:st|nd|rd|th)|primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|sext[oa]|primer[oa]?|tercer[oa]?|cuart[oa]";
const FX_ORD_G = new RegExp(`(?<![\\p{L}\\p{N}])(?:${FX_ORDINAL})(?![\\p{L}\\p{N}])(?:\\s+[\\p{L}\\p{N}-]+){0,2}`, "gu");
const FX_PERIOD_G = /(?:[\p{L}\p{N}£.,-]+\s+){0,3}(?:running|in a row|on the trot|consecutive|seguid[oa]s?|consecutiv[oa]s?|de seguida|sin parar)(?![\p{L}])/gu;
const FX_EVERY_G = /(?<![\p{L}])(?:every|each|cada|todos os|todas as|todos los|todas las)(?:\s+[\p{L}\p{N}-]+){1,2}/gu;
// Medication: listed names, plus a capitalised or listed word right next to a dose.
const FX_MEDS = new Set(["calpol", "nurofen", "ibuprofen", "ibuprofeno", "paracetamol", "benuron", "ben-u-ron", "brufen", "amoxicillin", "amoxicilina",
  "penicillin", "penicilina", "antibiotic", "antibiotics", "antibiótico", "antibióticos", "inhaler", "inalador", "inhalador", "epipen", "ventolin", "salbutamol",
  "piriton", "cetirizine", "cetirizina", "loratadine", "loratadina", "antihistamine", "antihistamínico", "anti-histamínico", "melatonin", "melatonina",
  "omeprazole", "omeprazol", "insulin", "insulina", "dalsy", "apiretal", "xarope", "jarabe", "syrup", "eyedrops", "colírio", "colirio", "medicine",
  "medication", "remédio", "medicamento", "medicação", "medicina", "pomada", "cream", "creme", "crema", "gotas", "drops", "spray", "puffer", "dipirona",
  "aspirina", "aspirin", "clarityn", "zyrtec", "movicol", "gaviscon", "strepsils", "fenistil", "atarax", "voltaren"]);
const FX_DOSE_UNIT = /^(?:\d+(?:[.,]\d+)?(?:ml|mg|mcg|g)|ml|mg|mcg|gotas|drops|comprimidos?|tablets?|pills?|puffs?|pastillas?|sachets?|saquetas?|colher(?:es)?|cucharadas?|cucharaditas?|teaspoons?|spoonfuls?)$/u;
const FX_DOSE_SKIP = new Set(["de", "of", "do", "da", "del", "the", "a", "his", "her", "seu", "sua", "su", "dose"]);
const fxMedNames = (draft: string) => {
  const out = new Set<string>();
  const raw = draft.replace(/[\u2018\u2019]/g, "'").split(/[^\p{L}\p{N}.,'-]+/u).map((w) => w.replace(/^[.,'-]+|[.,'-]+$/g, "")).filter(Boolean);
  const low = raw.map((w) => w.toLowerCase());
  low.forEach((w, i) => { if (FX_MEDS.has(w) || FX_MEDS.has(stripAccents(w))) out.add(w); });
  low.forEach((w, i) => {
    const isDose = FX_DOSE_UNIT.test(w) || (/^\d+(?:[.,]\d+)?$/.test(w) && FX_DOSE_UNIT.test(low[i + 1] ?? ""));
    if (!isDose) return;
    for (const dir of [-1, 1]) {
      let j = i + dir;
      while (j >= 0 && j < low.length && (FX_DOSE_SKIP.has(low[j]) || FX_DOSE_UNIT.test(low[j]) || /^\d/.test(low[j]))) j += dir;
      if (j < 0 || j >= low.length) continue;
      if (FX_MEDS.has(low[j]) || (/^\p{Lu}/u.test(raw[j]) && !CAP_SKIP.has(low[j]) && j > 0)) out.add(low[j]);
    }
  });
  return out;
};
// Who did what: the person and the key verb (forgot, missed, didn't pay ...), with its negation.
const FX_KEY: [string, RegExp][] = [
  ["forget", /^(?:forg[eo]t(?:s|ten|ting)?|esquec\p{L}*|esqueç\p{L}*|olvid\p{L}*)$/u],
  ["miss", /^(?:miss|missed|misses|falt(?:ou|aste|aram|ei|ó|aron|é)|falh(?:ou|aste|aram|ei))$/u],
  ["pay", /^(?:paid|pay|pays|pag(?:ou|aste|aram|uei|ó|aron|ué|aste))$/u],
  ["owe", /^(?:owe|owes)$/u],
  ["bring", /^(?:brought|trouxe|trouxeste|trouxeram|trajo|trajiste|trajeron)$/u],
  ["leave", /^(?:left|deixou|deixaste|deixei|deixaram|dejó|dejaste|dejé|dejaron)$/u],
  ["lose", /^(?:lost|perdeu|perdeste|perdi|perdió|perdiste|perdí)$/u],
  ["break", /^(?:broke|broken|partiu|partiste|rompió|rompiste)$/u],
  ["cancel", /^(?:cancell?ed|cancelou|cancelaste|canceló)$/u],
  ["collect", /^(?:collected|picked|recolheu|recolheste|recogió|recogiste|buscou|buscaste)$/u],
  ["late", /^(?:late|atrasad[oa]s?|atrasou|atrasaste|atrasó)$/u],
  ["let", /^(?:let|lets|letting|allowed|deixaste|dejaste)$/u],
];
const FX_CLITIC: Record<string, string> = { te: "other", me: "self", le: "third", lhe: "third" };
const FX_SUBJ_SKIP = new Set([...SUBJ_SKIP, "didn't", "hasn't", "haven't", "hadn't", "still", "even", "completely", "totally", "ni", "nem", "se", "te", "me", "lhe", "le", "then", "once"]);
type FxDeed = { key: string; role: string; neg: boolean; word: string };
const fxDeeds = (text: string, names: Set<string>) => {
  const out: FxDeed[] = [];
  for (const sent of text.split(/(?<=[.!?,;])\s+|\s(?:and|but|e|mas|y|pero)\s/u)) {
    const toks = subjTokens(sent);
    toks.forEach((t, i) => {
      const hit = FX_KEY.find(([, re]) => re.test(t));
      if (!hit) return;
      const key = hit[0];
      if (i > 0 && toks[i - 1] === "to") return; // "to pay": an infinitive, part of an ask
      let role: string | null = null;
      if (key !== "late" && i > 0 && PASSIVE_AUX.has(toks[i - 1])) role = "passive";
      for (let j = i - 1; !role && j >= Math.max(0, i - 5); j--) {
        if (FX_SUBJ_SKIP.has(toks[j])) continue;
        role = (toks[j] === "yours" ? "other" : roleOf(toks[j], names)) ?? "none";
      }
      if (!role || role === "none") {
        const ascii = /^[a-z']+$/.test(t) && !/(?:aste|iste|este|ou|ei|ó|é|í)$/.test(t);
        if (FX_CLITIC[toks[i - 1]] && key === "forget") role = FX_CLITIC[toks[i - 1]];
        else if (/(?:aste|iste|este)$/.test(stripAccents(t)) && !ascii) role = "other";
        else if (/(?:ei|é|í)$/.test(t) || /^(?:esqueci|perdi)$/.test(t)) role = "self";
        else if (!ascii) role = "3";
        else return; // English verb with no subject (an instruction): not a report of who did it
      }
      const neg = toks.slice(Math.max(0, i - 3), i).some((w) => FX_NEG.has(w));
      out.push({ key, role, neg, word: t });
    });
  }
  return out;
};
const fxSameRole = (a: string, b: string) =>
  a === b || sameActor(a, b) || (a === "3" && (b === "third" || b.startsWith("name:"))) || (b === "3" && (a === "third" || a.startsWith("name:")));
const fxPhraseKept = (phrase: string, rStems: Set<string>) => {
  const ws = fxToks(phrase).filter((w) => !FX_STOP.has(w));
  return ws.every((w) => /^\d/.test(w) || fxHasStem(rStems, w));
};

const codeFactCheck = (draft: string, rewrite: string, asksPlain: boolean) => {
  const codes = new Set<string>();
  const notes: string[] = [];
  const kept: string[] = [];
  const factDraft = fxSentences(draft).filter((s) => !fxIsThreat(s)).join(" ");
  const d = normText(factDraft);
  const r = normText(rewrite);
  const rStems = new Set(fxToks(rewrite).map(fxStem));
  const need = (code: string, label: string) => { codes.add(code); kept.push(label); };
  // Money with its currency, numbers written as words.
  const squash = (s: string) => s.replace(/\s+/g, "").replace(",", ".");
  const rMoney = (r.match(FX_MONEY_G) ?? []).map(squash);
  for (const m of d.match(FX_MONEY_G) ?? []) if (!rMoney.includes(squash(m))) need("money_dropped", m);
  const esDraft = langScore(d, "es") > langScore(d, "pt");
  for (const m of d.match(FX_NUM_WORDS_G) ?? []) {
    if ((m === "dos" || m === "doce") && !esDraft) continue; // Portuguese "dos" (of the), "doce" (sweet)
    if (!hasWord(r, m)) need("number_dropped", m);
  }
  // Times and dates (days, months, today, last time, weekend ...).
  for (const m of d.match(FX_TIMES_G) ?? []) if (!hasWord(r, m)) need("time_dropped", m);
  for (const [key, re] of MONTHS) if (re.test(d) && !re.test(r)) need("time_dropped", key);
  // Counts and repetition with their period.
  for (const re of [FX_ORD_G, FX_PERIOD_G, FX_EVERY_G]) {
    for (const m of d.match(re) ?? []) if (!fxPhraseKept(m, rStems)) need("count_dropped", m.trim());
  }
  for (const m of d.match(COUNT_RE) ?? []) if (!fxPhraseKept(m, rStems)) need("count_dropped", m);
  for (const [lang, re] of Object.entries(FX_AGAIN)) {
    if (re.test(d) && !Object.values(FX_AGAIN).some((x) => x.test(r))) need("count_dropped", lang === "en" ? "again" : lang === "pt" ? "outra vez / de novo" : "otra vez / de nuevo");
  }
  // Names of people and places, and "at yours"-type places.
  for (const n of draftNames(factDraft)) if (!hasWord(r, n)) need("name_dropped", n);
  for (const m of d.match(FX_PLACES_G) ?? []) if (!hasWord(r, m)) need("place_dropped", m);
  // Negated statements ("wouldn't say why", "no screens") keep their negation and verb; absolutes and blame sentences aside.
  for (const sent of fxSentences(factDraft)) {
    if (FX_REPROACH.test(normText(sent))) continue;
    const ts = fxToks(sent);
    ts.forEach((w, i) => {
      if (!FX_NEG.has(w) || w === "never" || w === "nunca") return;
      const nxt = ts.slice(i + 1).find((x) => !FX_STOP.has(x) && !FX_NEG.has(x));
      if (!nxt || /^\d/.test(nxt)) return;
      const rt = fxToks(rewrite);
      const ok = rt.some((x, k) => fxStem(x) === fxStem(nxt) && rt.slice(Math.max(0, k - 4), k).some((y) => FX_NEG.has(y)));
      if (!ok) need("negation_dropped", `${w} ${nxt}`);
    });
  }
  // Medication and health names.
  for (const m of fxMedNames(factDraft)) if (!hasWord(r, m)) need("medication_dropped", m);
  // Who did what.
  const names = draftNames(draft);
  const rDeeds = fxDeeds(rewrite, names);
  for (const dd of fxDeeds(factDraft, names)) {
    if (dd.role === "passive") continue;
    const ok = rDeeds.some((x) => x.key === dd.key && x.neg === dd.neg && x.role !== "passive" && fxSameRole(dd.role, x.role));
    if (!ok) need("deed_dropped", `${dd.role === "other" ? "you" : dd.role === "self" ? "I" : dd.role.replace(/^name:/, "")} ${dd.neg ? "not " : ""}${dd.word}`);
  }
  if (kept.length) notes.push(`Keep these from the draft, word for word and with the same person doing them: ${kept.map((k) => `"${k}"`).join(", ")}.`);
  // Nothing added: every content word of the rewrite must come from the draft (only please and the frame of a request may be new).
  const dStems = new Set(fxToks(draft).map(fxStem));
  const added = new Set<string>();
  const dNeg = fxToks(draft).some((w) => FX_NEG.has(w));
  for (const w of fxToks(rewrite)) {
    if (FX_STOP.has(w) || FX_ALLOWED_NEW.has(w) || /^\d/.test(w) || w.length < 2) continue;
    if (w === "not" && dNeg) continue; // "never" -> "did not"
    if (!fxHasStem(dStems, w)) added.add(w);
  }
  if (added.size) { codes.add("added_content"); notes.push(`These words are not in the draft: ${[...added].slice(0, 8).map((w) => `"${w}"`).join(", ")}. Add nothing: no new sentence, feeling, reason or detail.`); }
  // Threats: removed entirely, never kept.
  if (fxSentences(draft).some(fxIsThreat) && FX_THREAT.test(r)) { codes.add("threat_kept"); notes.push("Remove the threat entirely."); }
  if (FX_REPROACH.test(r)) { codes.add("reproach_kept"); notes.push("Remove every blame word (always, never, typical, and the like)."); }
  const dPlease = (normText(draft).match(FX_PLEASE) ?? []).length;
  const rPlease = (r.match(FX_PLEASE) ?? []).length;
  if (rPlease > 1 && rPlease > dPlease) { codes.add("repeat"); notes.push('Say "please" at most once.'); }
  // A request in the rewrite needs a plain request in the draft (a question stays a question; a fact or rule never becomes a request).
  if (!asksPlain) {
    const plainR = fxSentences(rewrite).filter((s) => !s.trim().endsWith("?")).some((s) => clausesOf(expandContractions(s)).some(isAskClause));
    if (plainR) { codes.add("ask_added"); notes.push("The draft makes no plain request, so the rewrite must not add one."); }
  }
  return { codes: [...codes], notes };
};

// Deterministic fact check. Returns failure codes (for logs) and plain notes (for the retry prompt only).
const checkRewrite = (draft: string, rewrite: string, c: SendCheck) => {
  const codes = new Set<string>();
  const notes: string[] = [];
  const d = normText(draft);
  const r = normText(rewrite);
  if (!r) return { codes: ["empty"], notes: ["The rewrite was empty."] };
  // An ask counts only when the code finds one in the draft and the model agrees.
  const draftAsk = textHasAsk(draft);
  // A plain request (not a question) that the code finds in the draft is an ask even when the model says has_ask:false,
  // so a rewrite can never drop it ("Make sure ... pack her EpiPen"). Questions still need the model to agree.
  const plainDraftAsk = draftAsk && draft.split(/(?<=[.!?])\s+/).filter((x) => !x.trim().endsWith("?"))
    .flatMap((x) => x.split(/\s(?:or|ou|o)\s/u)).filter((x) => !SELF_FUTURE.test(normText(x)))
    .some((x) => clausesOf(expandContractions(x)).some(isAskClause));
  // fix11: the code decides whether the draft asks; the model's has_ask is not used.
  const asks = draftAsk;
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
  for (const m of d.match(COUNT_RE) ?? []) if (!r.includes(m)) { codes.add("missing_fact"); missing.push(m); }
  if (missing.length) notes.push(`These words from the draft are missing: ${missing.map((k) => `"${k}"`).join(", ")}. Use each of them exactly as the draft writes them, in the draft's language.`);

  // Health words from the draft must still be there, in the draft's own words.
  const rStems = new Set(r.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(healthStem));
  // Required when the word is in a draft sentence not addressed to the other parent, or in one of the listed facts
  // (a health word inside a sentence that only blames "you" may go with the blame).
  const factText = normText((c.facts ?? []).map((f) => (typeof f?.fact === "string" ? f.fact : "")).join(" "));
  const healthIn = (t: string) => t.split(/[^\p{L}\p{N}]+/u).filter((w) => HEALTH_WORDS.has(w));
  const needHealth = new Set<string>(healthIn(factText).filter((w) => d.split(/[^\p{L}\p{N}]+/u).includes(w)));
  for (const sent of d.split(/(?<=[.!?])\s+/)) {
    if (sent.split(/[^\p{L}\p{N}']+/u).some((w) => ROLE_OTHER.has(w))) continue;
    for (const w of healthIn(sent)) needHealth.add(w);
  }
  const lostHealth = [...needHealth].filter((w) => !rStems.has(healthStem(w)));
  if (lostHealth.length) {
    codes.add("health_word_missing");
    notes.push(`These health or welfare words from the draft are missing or changed: ${lostHealth.map((w) => `"${w}"`).join(", ")}. Keep each one exactly as the draft writes it, in its own language, with the fact it belongs to.`);
  }

  // Language: every language the draft is written in must still be there (no translating, no dropped parts).
  const langs = new Set<string>(c.languages.map(langCode).filter((l) => LANG_MARKERS[l]));
  for (const l of Object.keys(LANG_MARKERS)) if (langScore(d, l) >= 4) langs.add(l);
  const dTotal = [...langs].reduce((n, l) => n + langScore(d, l), 0);
  const rTotal = [...langs].reduce((n, l) => n + langScore(r, l), 0);
  const mixed = [...langs].filter((l) => langScore(d, l) >= 3).length >= 2;
  for (const l of langs) {
    const ds = langScore(d, l);
    if (ds < 2) continue;
    const rs = langScore(r, l);
    // Mixed drafts: a language's share of the rewrite must not shrink to under 60% of its share of the draft (no translating).
    const shrunk = mixed && ds >= 3 && ds / dTotal >= 0.2 && rTotal > 0 && rs / rTotal < 0.6 * (ds / dTotal);
    if (rs < (ds >= 6 ? 2 : 1) || shrunk) {
      codes.add("language_changed");
      notes.push(`The draft is written partly or fully in ${LANG_NAMES[l]} and the rewrite translated or dropped some of it. Copy the draft's own sentences in their own languages, word for word, and only delete the blame words. Do not translate anything.`);
    }
  }

  for (const l of Object.keys(LANG_MARKERS)) {
    if (!langs.has(l) && langScore(d, l) === 0 && langScore(r, l) >= 2) { codes.add("language_changed"); notes.push("Do not add words in a language the draft does not use."); }
  }
  if (mixed) {
    const problem = copyProblem(draft, rewrite);
    if (problem) {
      codes.add("partial_translation");
      notes.push(`The draft mixes languages, so build the rewrite only from the draft's own words in the draft's order, deleting the blame words: ${problem}. Do not translate or reword anything.`);
    }
  }

  // Who did what: the subject of each fact's action must not change to someone else.
  const names = draftNames(draft);
  for (const f of c.facts ?? []) {
    const action = typeof f?.action === "string" ? normText(f.action).split(" ").pop() ?? "" : "";
    if (action.length < 3 || !keepFound(action, d)) continue;
    const want = subjectsOf(d, action, names).find((s) => s) ?? actorRole(f.actor, names);
    if (!want) continue;
    const draftSaid = subjectsOf(d, action, names).some((s) => s === want);
    const rSubjects = subjectsOf(r, action, names);
    const rStemsAll = r.split(/[^\p{L}\p{N}']+/u).filter(Boolean).map(wordStem);
    // The same action in other words that mean the same ("want" -> "would like").
    if (!rSubjects.length && (ACTION_EQUIV[verbStem(action)] ?? []).some((e) => rStemsAll.includes(e))) continue;
    // Only when the draft just reports it (no ask): then that report is the message and who did it must stay.
    if (!asks && draftSaid && (want === "other" || want === "self") && !rSubjects.some((g) => g === want)) {
      codes.add("actor_dropped");
      const who = want === "other" ? '"you"' : '"I"';
      notes.push(`The draft says ${who} ${action}. Keep that fact with ${who} as the one who ${action}, in the draft's words; do not drop it or make it passive.`);
      continue;
    }
    // The sender's own action (what I did, will do or want), and the other parent's action in a report, must stay.
    const verbGone = rSubjects.length === 0;
    if (verbGone && (want === "self" || (want === "other" && !asks))) {
      codes.add("action_dropped");
      const who = want === "other" ? '"you"' : '"I"';
      notes.push(`The draft says ${who} "${action}". Keep that action with ${who} doing it, in the draft's words; do not change it into a different action or a decision.`);
      continue;
    }
    for (const got of rSubjects) {
      if (got && !sameActor(want, got)) {
        codes.add("actor_changed");
        const who = want === "other" ? '"you"' : want === "self" ? '"I"' : `"${want.replace(/^name:/, "")}"`;
        notes.push(`In the draft ${who} is the one who "${action}". Keep ${who} as the one who ${action}; do not change who did it.`);
        break;
      }
    }
  }

  if (WISH.test(d) && !WISH.test(r)) { codes.add("stance_changed"); notes.push("The draft says what the sender wants or would like. Keep it as a wish (I want / I would like), not a decision or a statement that it will happen."); }
  // (A threat at the other parent, "I'll take you to ...", is blame and may go.)
  const selfFuture = d.split(/[.!?]+|\s(?:or|ou|o)\s/u).some((x) => SELF_FUTURE.test(x) && !x.split(/[^\p{L}\p{N}']+/u).some((w) => ROLE_OTHER.has(w)));
  if (selfFuture && !SELF_NOW_OR_FUTURE.test(r)) { codes.add("stance_changed"); notes.push("The draft says what the sender will do. Keep it in the future (I will ...), not as something already done or decided."); }

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

  if (!asks) {
    if (r.includes("?")) { codes.add("question_added"); notes.push("The draft asks for nothing, so the rewrite must not ask a question."); }
    if (clausesOf(rewrite).some(isAskClause)) { codes.add("ask_added"); notes.push("The draft asks for nothing, so the rewrite must not add a request, instruction or please. Write only calm statements of the facts."); }
  } else {
    // What is asked must stay what the draft asked: at least one of the draft's own words for it must be there.
    const rWords = clauseWords(r).map(wordStem);
    const askWords = clausesOf(draft).filter(isAskClause)
      .map((cl) => clauseWords(cl).map((w) => w.replace(/'s$/, "")).filter((w) => w.length > 2 && !ASK_GENERIC.has(w) && !KEEP_STOP_WORDS.has(w) && !names.has(w)))
      .filter((ws) => ws.length);
    const kept = (w: string) => {
      const st = wordStem(w);
      if ((SOFTENED[st] ?? []).some((e) => rWords.includes(e))) return true;
      return rWords.some((x) => x === st || (x.length >= 3 && st.startsWith(x)) || (st.length >= 3 && x.startsWith(st)));
    };
    // An accusation in the ask (lies) may be softened (not true) but never dropped or made general.
    const accused = askWords.flat().filter((w) => ACCUSE.has(w) && !kept(w));
    if (accused.length) {
      codes.add("ask_changed");
      notes.push(`The request is about ${accused.map((w) => `"${w}"`).join(", ")}. Keep that, or say "not true", and do not make it more general.`);
    }
    if (askWords.length && !askWords.some((ws) => ws.some(kept))) {
      codes.add("ask_changed");
      notes.push(`The request must use the draft's own words for what is asked (${[...new Set(askWords.flat())].slice(0, 6).map((w) => `"${w}"`).join(", ")}); do not change it into a different or milder request.`);
    }
    // Every plain request (not a question) must still be there in the draft's words; a request is never silently dropped.
    // (A threat, "or I'll take you to court and get the police involved", is not a request.)
    const plainAsks = draft.split(/(?<=[.!?])\s+/).filter((x) => !x.trim().endsWith("?"))
      .flatMap((x) => x.split(/\s(?:or|ou|o)\s/u)).filter((x) => !SELF_FUTURE.test(normText(x)))
      .flatMap((x) => clausesOf(expandContractions(x)).filter(isAskClause))
      .map((cl) => clauseWords(cl).map((w) => w.replace(/'s$/, "")).filter((w) => w.length > 2 && !ASK_GENERIC.has(w) && !KEEP_STOP_WORDS.has(w) && !names.has(w)))
      .filter((ws) => ws.length);
    // The draft asked for something plainly, so the rewrite must still ask it; a bare statement drops the ask.
    if (plainDraftAsk && !r.includes("?") && !clausesOf(expandContractions(rewrite)).some(isAskClause)) {
      codes.add("ask_dropped");
      notes.push("The draft asks for something. Keep it as a calm request in the draft's own words; do not turn it into a statement or leave it out.");
    }
    const lost = plainAsks.filter((ws) => !ws.some(kept));
    if (lost.length) {
      codes.add("ask_dropped");
      notes.push(`Keep every request the draft makes, in its own words (${lost.flat().slice(0, 6).map((w) => `"${w}"`).join(", ")}).`);
    }
    // If the rewrite asks nothing, it may only restate what the draft says; it must not turn a question into a new claim.
    if (!plainAsks.length && !textHasAsk(rewrite)) {
      const dStems = clauseWords(d).map(wordStem);
      const fresh = clauseWords(r).filter((w) => w.length > 2 && !KEEP_STOP_WORDS.has(w) && !RESTATE_FREE.has(w) && !names.has(w) && !/^\d/.test(w))
        .map(wordStem).filter((st) => !dStems.some((x) => x === st || (x.length >= 3 && st.startsWith(x)) || (st.length >= 3 && x.startsWith(st))));
      if (fresh.length) {
        codes.add("ask_dropped");
        notes.push("Keep the draft's question or request as a calm request; do not replace it with a new statement.");
      }
    }
    // A fact or rule the draft states must not become a new request ("Bedtime is 8pm" never becomes "Please ensure bedtime is 8pm").
    if (!plainAsks.length) {
      const toks = (t: string) => clauseWords(expandContractions(t)).map((w) => w.replace(/'s$/, ""));
      const stated = draft.split(/(?<=[.!?])\s+/).filter((x) => !x.trim().endsWith("?"))
        .flatMap((x) => clausesOf(x)).filter((cl) => !isAskClause(cl)).map((cl) => toks(cl).map(wordStem));
      const turned = clausesOf(rewrite).filter(isAskClause).some((cl) => {
        const core = toks(cl).filter((w) => !ASK_WRAP.has(w)).map(wordStem);
        return core.length >= 2 && stated.some((sc) => core.every((st) => sc.includes(st)));
      });
      if (turned) {
        codes.add("ask_added");
        notes.push("The draft states that as a fact or rule, not a request. Keep it a statement in the draft's words; do not add please, ensure or make sure to it.");
      }
    }
  }
  if (c.states_decision && r.includes("?") && !d.includes("?")) {
    codes.add("decision_as_question");
    notes.push("The sender's decision must stay a statement, not a question.");
  }
  const fx = codeFactCheck(draft, rewrite, plainDraftAsk);
  for (const x of fx.codes) codes.add(x);
  notes.push(...fx.notes);
  return { codes: [...codes], notes };
};

const logSend = (outcome: string, reasons: string[], attempts: number, started: number, timing: Record<string, number> = {}) =>
  console.log(JSON.stringify({ fn: "chat-rewrite", event: "calm_check", outcome, reasons, attempts, ms: Date.now() - started, ...timing }));

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

    // send: signed-in check first (no model call before the user is confirmed), then the Premium check runs
    // alongside the model calls; its answer is awaited before any response, so the 402 gate still comes first.
    // Any other mode: always Premium, before anything else.
    const timing: Record<string, number> = {};
    let premiumCheck: Promise<Response | null> = Promise.resolve(null);
    if (mode === "send") {
      const signedOut = await requireSignedIn(req);
      timing.auth_ms = Date.now() - started;
      if (signedOut) return signedOut;
      if (CALM_CHECK_REQUIRES_PREMIUM) {
        const p0 = Date.now();
        premiumCheck = requirePremium(req, "rewrite").then((d) => { timing.premium_ms = Date.now() - p0; return d; });
      }
    } else {
      const denied = await requirePremium(req, "rewrite");
      if (denied) return denied;
    }

    if (!draft || typeof draft !== "string" || draft.length > 4000) {
      const denied = await premiumCheck;
      if (denied) return denied;
      return json({ error: "Missing draft" }, 400);
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      const denied = await premiumCheck;
      if (denied) return denied;
      return json({ error: "AI not configured" }, 500);
    }

    if (mode === "send") {
      const pass = { needs_rewrite: false, rewrite: null };
      const deadline = started + SEND_DEADLINE_MS;
      // One controller for every model call in this request. It is aborted at the deadline, at the hard stop
      // and when the response is sent, so no fetch or body read outlives the cap.
      const sendCtrl = new AbortController();
      const deadlineTimer = setTimeout(() => sendCtrl.abort(), Math.max(0, deadline - Date.now()));
      let settled = false;
      // Nothing from a send is logged until Premium is confirmed; on a denial the model reply is thrown away unlogged.
      let premiumOk = false;
      let pendingLog: (() => void) | null = null;
      const log = (outcome: string, reasons: string[], attempts: number) => {
        if (settled) return;
        const write = () => logSend(outcome, reasons, attempts, started, timing);
        if (premiumOk) write(); else pendingLog = write;
      };
      const runSend = async (): Promise<Response> => {
        const timed = async (payload: Record<string, unknown>, signal: AbortSignal = sendCtrl.signal) => {
          if (signal.aborted) throw new Error("timeout");
          return await callGateway(apiKey, payload, signal);
        };
        const firstMessages = [
          { role: "system", content: SEND_SYSTEM },
          { role: "user", content: draft },
        ];
        const clean = (s: string) => s.replace(/\s*—\s*/g, " - ").trim();
        type First =
          | { kind: "timeout" | "parse" }
          | { kind: "error"; resp: Response }
          | { kind: "pass"; reasons: string[] }
          | { kind: "cand"; raw: string; rewrite: string; checkInput: SendCheck; result: ReturnType<typeof checkRewrite> };
        const firstOnce = async (signal: AbortSignal): Promise<First> => {
          let resp: Response;
          const m0 = Date.now();
          try {
            resp = await timed({ ...sendModel(800), response_format: SEND_SCHEMA, messages: firstMessages }, signal);
            if (timing.model_ms === undefined) timing.model_ms = Date.now() - m0;
          } catch {
            return { kind: "timeout" };
          }
          const err = gatewayError(resp);
          if (err) return { kind: "error", resp: err };
          let parsed: Record<string, unknown>;
          let raw = "";
          try {
            const data = await resp.json();
            raw = data.choices?.[0]?.message?.content ?? "";
            parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
          } catch {
            return { kind: signal.aborted ? "timeout" : "parse" };
          }
          if (parsed?.needs_rewrite !== true || typeof parsed.rewrite !== "string") return { kind: "pass", reasons: [] };
          const checkInput: SendCheck = {
            facts: Array.isArray(parsed.facts) ? (parsed.facts as SendFact[]) : [],
            has_ask: parsed.has_ask === true,
            states_decision: parsed.states_decision === true,
            languages: Array.isArray(parsed.draft_languages) ? (parsed.draft_languages as unknown[]).filter((l): l is string => typeof l === "string") : [],
          };
          const rewrite = clean(parsed.rewrite as string);
          if (removesNothing(draft, rewrite)) return { kind: "pass", reasons: ["near_identical"] };
          return { kind: "cand", raw, rewrite, checkInput, result: checkRewrite(draft, rewrite, checkInput) };
        };
        // Parallel first calls: a rewrite that passes every check wins at once and the others are aborted.
        // A "no change" result does not win at once: the other call may still bring a passing rewrite within the budget.
        // If none brings one, "no change" is used, then the first failed rewrite (for the retry).
        const ctrls = Array.from({ length: SEND_FIRST_CALLS }, () => new AbortController());
        const onAbort = () => ctrls.forEach((c) => c.abort());
        sendCtrl.signal.addEventListener("abort", onAbort);
        const isWin = (f: First) => f.kind === "cand" && !f.result.codes.length;
        const all: First[] = [];
        const first: First = await new Promise<First>((resolve) => {
          let done = 0;
          ctrls.forEach((c) => {
            firstOnce(c.signal).then((f) => {
              all.push(f);
              done++;
              if (isWin(f)) {
                ctrls.forEach((o) => { if (o !== c) o.abort(); });
                resolve(f);
              } else if (done === ctrls.length) {
                resolve(all.find((x) => x.kind === "pass") ?? all.find((x) => x.kind === "cand") ?? all.find((x) => x.kind === "parse") ?? all.find((x) => x.kind === "error") ?? all[0]);
              }
            });
          });
        });
        sendCtrl.signal.removeEventListener("abort", onAbort);
        if (first.kind === "timeout") {
          log("fallback", ["timeout"], 1);
          return json(pass);
        }
        if (first.kind === "error") return first.resp;
        if (first.kind === "parse") {
          log("fallback", ["parse"], 1);
          return json(pass);
        }
        if (first.kind === "pass") {
          log("pass", first.reasons, 1);
          return json(pass);
        }
        const { raw, checkInput } = first;
        let rewrite = first.rewrite;
        let result = first.result;
        let attempts = 1;
        if (result.codes.length) {
          if (deadline - Date.now() < SEND_RETRY_MIN_LEFT_MS) {
            log("fallback", ["no_time_for_retry", ...result.codes], attempts);
            return json(pass);
          }
          attempts = 2;
          try {
            const retry = await timed({
              ...sendModel(300),
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
          if (!settled) log("fallback", ["timeout"], 0);
          settled = true;
          sendCtrl.abort();
          resolve(json(pass));
        }, Math.max(0, started + SEND_HARD_STOP_MS - Date.now()));
      });
      const work = runSend().then((r) => { settled = true; return r; }, () => { settled = true; return json(pass); });
      let denied: Response | null;
      try {
        denied = await premiumCheck;
      } catch (e) {
        settled = true; clearTimeout(hardTimer); clearTimeout(deadlineTimer); sendCtrl.abort();
        throw e;
      }
      if (denied) {
        // 401/402/503: stop the model calls, throw their reply away, log nothing from it.
        settled = true; clearTimeout(hardTimer); clearTimeout(deadlineTimer); sendCtrl.abort();
        return denied;
      }
      premiumOk = true;
      if (pendingLog) { const w = pendingLog; pendingLog = null; w(); }
      const out = await Promise.race([work, hardStop]);
      clearTimeout(hardTimer);
      clearTimeout(deadlineTimer);
      sendCtrl.abort();
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
