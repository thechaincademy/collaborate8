// Deploy target: supabase/functions/chat-rewrite-strike/index.ts (prototype v7.1; the live chat-rewrite is untouched)
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

// Strike-only calm check: the model never writes a message. It only lists the parts of the draft to strike out;
// code removes them and keeps every other character as the parent wrote it.
const STRIKE_SYSTEM = `You check a message a separated parent has drafted to the other parent. You never rewrite it. You only list the parts to strike out, so the rest is sent exactly as the parent wrote it.

Return JSON {"strikes":[...]}: each item is an exact, contiguous, character-for-character copy of text from the draft (same spelling, case, accents and punctuation), in the order they appear, not overlapping.

Strike only:
- blame, sarcasm, insults, name-calling, jibes, mockery, guilt-tripping and character judgements ("You're useless", "Típico.", "És mesmo desleixado.", "Eres un irresponsable.", "Honestly.", "Unbelievable.", "Great parenting.")
- reproach about having said it before: "I already told you", "como já te disse", "ya te lo dije" (strike only those words; the fact after them stays)
- threats and ultimatums (solicitor, court, lawyer, "or else", "you'll regret it", "I'll stop the visits")
- absolutes and generalisations about the other parent ("as always", "como sempre", "como siempre", "it's always the same with you")
- rhetorical or sarcastic questions and tags ("is that too much to ask?", "o es mucho pedir", "não é difícil, pois não?", "did you even look?")
- jabs that imply they always fail: "this time", "for once", "actually", "esta vez", "desta vez", "por una vez" (strike the jab words; a real request around them stays)
- a defensive "it wasn't me" / "não fui eu" / "no fui yo" (only those words: who did it, such as "it was you who forgot it", stays)
- brush-offs and martyr lines ("Don't bother.", "Não te incomodes.", "No te molestes.", "Fine, I'll just do it myself"): strike the brush-off; "I'll do it" / "ya lo hago yo" stays.
- mild blame counts too: a sigh or dig ("No worries, I'll sort it like always", "Não faz mal, eu trato disso", "No pasa nada, ya me encargo yo"), "just a gentle reminder", "per my last message", a sarcastic thanks or opener ("Oh great,", "Wow,", "Well done.", "Parabéns,", "Qué sorpresa,"), "even" / "sequer" / "siquiera" used as a jab.
- sarcasm: strike the sarcastic words; if what is left of that sentence would have no subject ("Great job forgetting her bag."), strike the whole sentence.
- digs about what they or a place are not ("the school isn't a babysitting service", "I'm not a taxi", "não sou tua empregada", "no soy tu chófer"): strike that whole clause with its comma.
- in a long run-on sentence, strike a whole clause with its joining word ("and I can't keep doing this every single weekend"); never leave a word group such as "every single weekend" or a subject such as "e tu" / "and you" / "y tú" cut off from its verb.
- around a fact that something was not told, only the blame wrapper ("Típico que", "de nada", "claro que", "of course", "as usual"); the not-told fact itself stays.

Never strike: names, dates, days, times, numbers, amounts of money, counts and repetition words (again, second time, outra vez, de novo, otra vez, de nuevo, still, ainda, todavía), places, what happened and who did it (forgot, missed, was late, didn't pay, left), medicine, doses, health and symptoms, rules ("no screens after 8pm", "bedtime is 7:30"), agreements ("we agreed"), what someone said, a fact that something was not told, and real requests or questions ("please bring", "can you", "let me know", "tens de", "tienes que").

Strike the smallest span that removes the blame. A request with blame tagged on keeps the request ("Não te esqueças do casaco outra vez, honestly." -> strike only ", honestly"). When a whole sentence is blame, strike the whole sentence including its final punctuation. Strike a joining comma or word with the clause it belongs to (", which is typical of you,"), so the rest still reads as a sentence. Never leave a broken sentence: no "If ..." without its main clause (strike the whole threat sentence), no sentence missing its subject or verb, no sentence ending on "and", "to" or "with". Never strike part of a word. Capitals are fixed by code: never strike a word only because it is shouted. Never strike a "not", "never", "no", "não" or "nunca" on its own: strike the whole clause or leave it.

If the draft is already calm, factual or a plain request, return {"strikes":[]}. Never translate; the strikes are in the draft's own language or languages.

Examples:
Draft: "Unbelievable. You forgot Leo's bag again, so he had no kit for PE. Sort it out."
{"strikes":["Unbelievable."]}
Draft: "Como já te disse, a reunião da escola é quinta às 18h. Mas claro, tu nunca te lembras de nada."
{"strikes":["Como já te disse,","Mas claro, tu nunca te lembras de nada."]}
Draft: "Lola volvió con tos y no me dijiste nada, como siempre. Si vuelve a pasar, hablaré con mi abogado."
{"strikes":[", como siempre","Si vuelve a pasar, hablaré con mi abogado."]}
Draft: "Stop letting Jake play 18-rated games. If you carry on, I'll take this to court."
{"strikes":["If you carry on, I'll take this to court."]}
Draft: "¿Puedes traer a Nico a las 19h esta vez, o es mucho pedir?"
{"strikes":[" esta vez, o es mucho pedir"]}
Draft: "Oh brilliant, you forgot the swimming bag again. Well done. The lesson is at 9 on Saturday."
{"strikes":["Oh brilliant, ","Well done. "]}
Draft: "Can you pick Mia up at 4pm on Thursday? Her dentist is at 4:30."
{"strikes":[]}`;

const STRIKE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "calm_strike",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { strikes: { type: "array", items: { type: "string" } } },
      required: ["strikes"],
    },
  },
};

const SEND_HARD_STOP_MS = 2400;
const SEND_DEADLINE_MS = 2300;
const SEND_RETRY_MIN_LEFT_MS = 700;
const SEND_MODEL = "openai/gpt-5.6-luna";
// OpenAI models take max_completion_tokens; reasoning off keeps the call fast.
const sendModel = (maxTokens: number) => ({ model: SEND_MODEL, max_completion_tokens: maxTokens, reasoning_effort: "none" });
const SEND_FIRST_CALLS = 2; // parallel first calls; the first whose strikes pass every check wins, the rest are aborted.
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
const FX_ALLOWED_NEW = new Set(["please", "kindly", "ensure", "make", "sure", "let", "know", "favor", "favour", "podes", "pode", "puedes", "puede", "podrías", "poderias", "podia", "faz", "rule", "regra", "regla"]);
const FX_IRREG: Record<string, string> = {
  brought: "bring", bought: "buy", caught: "catch", taught: "teach", thought: "think", left: "leave", lost: "lose", paid: "pay", came: "come",
  took: "take", taken: "take", gave: "give", given: "give", told: "tell", sent: "send", went: "go", gone: "go", kept: "keep", slept: "sleep", ate: "eat",
  eaten: "eat", broke: "break", broken: "break", made: "make", said: "say", saw: "see", seen: "see", got: "get", felt: "feel", met: "meet", ran: "run",
  woke: "wake", wore: "wear", drove: "drive", wrote: "write", children: "child", kids: "kid", owed: "owe",
};
// Tokens for comparing words: n't becomes "not", other contractions drop, possessive 's drops.
const fxToks = (t: string) =>
  normText(t).replace(/\bcan't\b/g, "can not").replace(/\bwon't\b/g, "will not").replace(/n't\b/g, " not").replace(/\bcannot\b/g, "can not").split(/[^\p{L}\p{N}']+/u)
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
const FX_REPROACH = wordRe("always|never|sempre|nunca|siempre|typical|típico|típica|tipico|pathetic|patético|patética|obviously|clearly|as usual|como sempre|como siempre|useless|inútil|lazy|selfish|irresponsible|irresponsável|irresponsable|do you even|did you even|you even|even bother|do you ever|how hard|not that you|thanks so much|brilliant|honestly|seriously|done being nice|se é que|nem penses|ni se te ocurra|a sério|en serio|ridiculous|ridículo|important to you|importante para ti|importante pra ti|don't care|do not care|doesn't care|does not care|you care|não queres saber|não te importa|no te importa|te da igual|i guess|whatever|capable|capaz|pretend|finges|fingir|finjas|unbelievable|disgrace|vergonha|vergüenza|incompetent|incompetente|for once|pela primeira vez na vida|por una vez|already told you|told you already|i told you already|i've told you|for the hundredth time|já te disse|como te disse|já te tinha dito|ya te lo dije|ya te dije|te lo he dicho|te lo dije|mess it up|mess this up|desastre|disaster|desleixado|desleixada|irresponsable|irresponsible|irresponsável|hazlo bien|no la cagues|não estragues|grow up|get a grip|for god's sake|por amor de deus|por el amor de dios|é muito pedir|es mucho pedir|too much to ask|an excuse|uma desculpa|una excusa|nem apareces|ni apareces|won't even show");
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
  let prevLast = "";
  for (const sent of text.split(/(?<=[.!?,;])\s+|\s(?:and|but|e|mas|y|pero)\s/u)) {
    const toks = subjTokens(sent);
    const before = prevLast;
    prevLast = toks[toks.length - 1] ?? "";
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
        else if (i === 0 && /ing$/.test(t) && before === "yours") role = "other"; // "another idea of yours, letting Max..."
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

const fxAnchored = (sent: string) => {
  const ts = fxToks(sent);
  return /\d/.test(sent) || FX_TIMES.test(normText(sent)) || draftNames(sent).size > 0 ||
    ts.some((t) => FX_KEY.some(([, re]) => re.test(t))) || ts.filter((t) => !FX_STOP.has(t) && !FX_NEG.has(t) && !/^(?:again|once|more|otra|outra|vez|novo|nuevo|mismo|mesmo|same)$/.test(t)).length >= 3 ||
    ts.some((t) => /^(?:he|she|they|ele|ela|eles|elas|él|ella|ellos|ellas)$/.test(t)); // about the child: "or he can't play"
};
// Rules both parents follow: "no fizzy drinks after 5pm", "nada de telemóvel depois do jantar", "sin tablet después de cenar",
// "phones aren't allowed at the table", "não pode", "no se puede", "prohibido", "only ... after 6", "must".
type FxRule = { head: string; word: string };
// A limit word (when or where the rule applies) marks "no X" / "sem X" / "sin X" / "only" as a rule rather than a plain "no".
const FX_RULE_LIMIT = wordRe("after|before|until|till|past|during|at|in|on|by|depois|antes|até|durante|em|na|nas|à|después|despues|hasta|en|por la noche|de noche|à noite|entre semana|hour|hours|minutes|hora|horas|minutos|meia|media");
const FX_RULE_SKIP = new Set(["one", "idea", "way", "problem", "need", "longer", "worries", "doubt", "matter", "le", "lo", "la", "les", "los", "las", "me", "te",
  "se", "nos", "os", "lhe", "lhes", "o", "a", "sé", "sei", "sabe", "hay", "há", "es", "está", "puedo", "posso", "quiero", "quero"]);
const FX_RULE_JOIN = /^(?:and|but|or|also|plus|e|y|mas|pero|también|também)$/;
// "There are no ...", "we have no ...", "no hay ...", "não há ..." turn a rule into a statement of what there is.
const FX_RULE_THERE = /^(?:there|have|has|had|got|hay|há|tem|têm|tiene|tienen|tenemos|temos|existe|existem|existen)$/;
const FX_RULE_BE = /^(?:are|is|were|was|be|son|es|está|están|são|é|estão)$/;
const FX_RULE_FRAME = wordRe("the rule is|the rule's|our rule is|the rule:|a regra é|a nossa regra é|regra:|la regla es|nuestra regla es|regla:");
const fxRuleWord = (ts: string[], from: number, to: number) => {
  const after = ts.slice(from).find((x) => !FX_STOP.has(x) && !FX_NEG.has(x) && !/^(?:more|any|mais|más|de|del|el)$/.test(x));
  if (after) return after;
  return ts.slice(0, to).reverse().find((x) => !FX_STOP.has(x) && !FX_NEG.has(x));
};
const fxRules = (clauses: string[]): FxRule[] => {
  const out: FxRule[] = [];
  for (const c of clauses) {
    const n = normText(c), ts = fxToks(c);
    const limited = FX_RULE_LIMIT.test(n) || /\d/.test(n) || FX_NUM_WORDS.test(n);
    ts.forEach((w, i) => {
      const prev = ts[i - 1] ?? "", prev2 = ts[i - 2] ?? "";
      let head = "", at = i + 1, from = i;
      if ((w === "no" || w === "sem" || w === "sin") && (i === 0 || FX_RULE_JOIN.test(prev))) {
        const nx = ts[i + 1] ?? "";
        if (!limited || !nx || FX_RULE_SKIP.has(nx) || /^\d/.test(nx) || (w !== "no" && /(?:ar|er|ir)$/.test(nx))) return;
        head = w;
      } else if (w === "nada" && ts[i + 1] === "de") { head = "nada de"; at = i + 2; }
      else if (/^(?:proibid|prohibid)[oa]s?$/.test(w)) head = w;
      else if (w === "allowed" && prev === "not") { head = "not allowed"; from = i - 1; }
      else if ((w === "pode" || w === "podem") && prev === "não") { head = `não ${w}`; from = i - 1; }
      else if (w === "puede" && prev === "se" && prev2 === "no") { head = "no se puede"; from = i - 2; }
      else if (/^permitid[oa]s?$/.test(w) && (prev2 === "não" || prev2 === "no") && FX_RULE_BE.test(prev)) { head = `${prev2} ${prev} ${w}`; from = i - 2; }
      else if (/^(?:only|só|solo|sólo)$/.test(w) && limited) head = w;
      else if (w === "must" && prev !== "you" && prev !== "i") head = w;
      if (!head) return;
      // "Sweets are not allowed ...", "Phones aren't permitted ...": the thing the rule is about comes before the rule words.
      const before = /allowed|permitid/.test(head) ? ts.slice(0, from).reverse().find((x) => !FX_STOP.has(x) && !FX_NEG.has(x)) : undefined;
      const word = before ?? fxRuleWord(ts, at, from);
      if (word && !out.some((r) => r.head === head && r.word === word)) out.push({ head, word });
    });
  }
  return out;
};
const fxRuleKept = (rewrite: string, rule: FxRule) => {
  const st = fxStem(rule.word), headToks = rule.head.split(" ");
  const loose = /^(?:no|sem|sin|nada de|only|só|solo|sólo)$/.test(rule.head);
  for (const s of fxSentences(rewrite).flatMap((x) => x.split(/;\s*/))) {
    const ts = fxToks(s);
    const wIdx = ts.map((x, k) => (fxStem(x) === st ? k : -1)).filter((k) => k >= 0);
    if (!wIdx.length) continue;
    const fm = normText(s).match(FX_RULE_FRAME);
    if (fm && normText(s).indexOf(fm[0]) < normText(s).search(new RegExp(`(?<![\\p{L}\\p{N}])${rule.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u")) ) return true;
    for (let h = 0; h + headToks.length <= ts.length; h++) {
      if (!headToks.every((t, j) => ts[h + j] === t)) continue;
      if (!wIdx.some((k) => Math.abs(k - h) <= 6)) continue;
      if (loose) {
        const p1 = ts[h - 1] ?? "", p2 = ts[h - 2] ?? "";
        if (FX_RULE_THERE.test(p1) || FX_RULE_THERE.test(p2) || (!/^(?:only|só|solo|sólo)$/.test(rule.head) && FX_RULE_BE.test(p1))) continue;
      }
      return true;
    }
  }
  return false;
};
const FX_AGREE = /^(?:agree|agreed|agreement|acordamos|acordámos|acordado|acordada|acuerdo|combinámos|combinamos|combinado|combinada|falámos|falamos|hablamos|hablado|decidimos|decided|norma)$/;
const FX_SAID = /^(?:said|says|told|tells|tell|disse|diz|contou|dijo|dice|contó|avisou|avisaste|avisó)$/;
// Not being told: "typical you never tell me anything", "típico não me dizeres nada", "típico que no me avises de nada", "nobody told me".
// The blame around it ("typical", "never", "de nada") may go; that the sender was not told, and what about, stays.
const FX_TELL = /^(?:tell|tells|telling|told|inform|informs|informed|informing|warn|warned|mention|mentioned|avis\p{L}*|avís\p{L}*|diz|dizes|dizer|dizeres|dizia|dito|diss\p{L}*|digas|diga|dices|dice|dicho|dij\p{L}*|decir|decirme|cont(?:ou|aste|aram|ar|as|asses|ó|es|aras|arme|ado)|cuent(?:as|es|a)|inform\p{L}*|mencion\p{L}*)$/u;
const FX_TOLD_NEG = /^(?:not|never|no|não|nao|nunca|nem|ni|nobody|noone|ninguém|ninguem|nadie|without|sem|sin)$/;
const FX_TOLD_FILL = /^(?:anything|nothing|nada|about|sobre|acerca|ever|again|either|sequer|siquiera|nunca|never|anymore|até|hasta|first|beforehand|antes|primeiro|all|whatsoever|absolutely|coisa|coisas|cosa|cosas|thing|things|nenhuma|ninguna|nenhum|ningún|ninguno|nadinha|bit)$/;
const FX_TOLD_STOP = /^(?:and|but|y|e|pero|mas|because|porque|so|or|ou|o)$/;
type FxTold = { span: string[]; about: string[] };
// Negated "tell" verbs in a token list: [verb index, negation index].
const fxNegTell = (ts: string[]) => {
  const out: [number, number][] = [];
  ts.forEach((w, i) => {
    const know = w === "know" && ts[i - 1] === "me" && /^(?:let|letting)$/.test(ts[i - 2] ?? "");
    if (!know && !FX_TELL.test(w)) return;
    for (let k = i - 1; k >= Math.max(0, i - 5); k--) if (FX_TOLD_NEG.test(ts[k])) { out.push([i, k]); return; }
  });
  return out;
};
const fxNotTold = (text: string): FxTold[] => {
  const out: FxTold[] = [];
  for (const cl of fxSentences(text).flatMap((x) => x.split(/[,;:]\s*/))) {
    const ts = fxToks(cl);
    for (const [i, k] of fxNegTell(ts)) {
      const w = ts[i];
      const toMe = w === "know" || /me$/.test(w) && /^(?:decirme|contarme)$/.test(w) || ["me", "us"].includes(ts[i + 1] ?? "") ||
        ["me", "nos"].includes(ts[i - 1] ?? "") || ["me", "nos"].includes(ts[i - 2] ?? "") || /^(?:nobody|noone|ninguém|ninguem|nadie)$/.test(ts[k]) && ["me", "us", "nos"].some((m) => ts.slice(k, i + 2).includes(m));
      if (!toMe) continue;
      // "Don't tell me you forgot", "Não me digas que...", "No me digas": a figure of speech, not a fact.
      const lead = ts.slice(0, k).filter((t) => !/^(?:oh|and|e|y|please|do|por|favor)$/.test(t));
      if (!lead.length && /^(?:tell|digas|diga)$/.test(w)) continue;
      const about: string[] = [];
      for (const t of ts.slice(i + 1, i + 9)) {
        if (FX_TOLD_STOP.test(t)) break;
        if (FX_STOP.has(t) || FX_NEG.has(t) || FX_TOLD_FILL.test(t) || FX_REPROACH.test(t) || /^(?:me|us|nos)$/.test(t)) continue;
        about.push(t);
      }
      out.push({ span: [...ts.slice(k, i + 1), ...about], about });
    }
  }
  return out;
};
const codeFactCheck = (draft: string, rewrite: string, asksPlain: boolean, strike = false) => {
  const codes = new Set<string>();
  const notes: string[] = [];
  const kept: string[] = [];
  const factDraft = fxSentences(draft).filter((s) => !fxIsThreat(s)).join(" ");
  const d = normText(factDraft);
  // Blame sentences ("You ALWAYS forget...", "Are you even capable...?", "...isn't important to you. Again.") give no facts that must stay;
  // money, medicines and deeds are still read from every non-threat sentence.
  // Read clause by clause, so "Don't forget otra vez, it's so typical of you" still keeps "otra vez".
  const coreSents = fxSentences(factDraft).flatMap((s) => s.split(/[,;:]\s+/)).filter((s) => !FX_REPROACH.test(normText(s)));
  const coreText = coreSents.join(" ");
  const dc = normText(coreText);
  // "Again" counts unless its clause has nothing else in it ("Again.", "Otra vez lo mismo.").
  const FX_AGAIN_FILLER = /^(?:again|once|more|otra|outra|vez|novo|nuevo|mismo|mesmo|same|lo|o|the|y|e|and|de)$/;
  const dAgain = normText(coreSents.filter((s) => fxAnchored(s) ||
    fxToks(s).filter((t) => !FX_STOP.has(t) && !FX_NEG.has(t) && !FX_AGAIN_FILLER.test(t)).length >= 2).join(" "));
  const r = normText(rewrite);
  const rStems = new Set(fxToks(rewrite).map(fxStem));
  const need = (code: string, label: string) => { codes.add(code); kept.push(label); };
  // Money with its currency, numbers written as words.
  const squash = (s: string) => s.replace(/\s+/g, "").replace(",", ".");
  const rMoney = (r.match(FX_MONEY_G) ?? []).map(squash);
  for (const m of d.match(FX_MONEY_G) ?? []) if (!rMoney.includes(squash(m))) need("money_dropped", m);
  const esDraft = langScore(d, "es") > langScore(d, "pt");
  for (const m of dc.match(FX_NUM_WORDS_G) ?? []) {
    if ((m === "dos" || m === "doce") && !esDraft) continue; // Portuguese "dos" (of the), "doce" (sweet)
    if (!hasWord(r, m)) need("number_dropped", m);
  }
  // Times and dates (days, months, today, last time, weekend ...).
  for (const m of dc.match(FX_TIMES_G) ?? []) if (!hasWord(r, m)) need("time_dropped", m);
  for (const [key, re] of MONTHS) if (re.test(dc) && !re.test(r)) need("time_dropped", key);
  // Counts and repetition with their period.
  for (const re of [FX_ORD_G, FX_PERIOD_G, FX_EVERY_G]) {
    for (const m of dc.match(re) ?? []) if (!fxPhraseKept(m, rStems)) need("count_dropped", m.trim());
  }
  for (const m of dc.match(COUNT_RE) ?? []) if (!fxPhraseKept(m, rStems)) need("count_dropped", m);
  for (const [lang, re] of Object.entries(FX_AGAIN)) {
    if (re.test(dAgain) && !Object.values(FX_AGAIN).some((x) => x.test(r))) need("count_dropped", lang === "en" ? "again" : lang === "pt" ? "outra vez / de novo" : "otra vez / de nuevo");
  }
  // Names of people and places, and "at yours"-type places.
  for (const n of draftNames(coreText)) if (!hasWord(r, n)) need("name_dropped", n);
  for (const m of dc.match(FX_PLACES_G) ?? []) if (!hasWord(r, m)) need("place_dropped", m);
  // Negated statements ("wouldn't say why", "no screens") keep their negation and verb; absolutes and blame sentences aside.
  for (const sent of coreSents) {
    const ts = fxToks(sent);
    // Only factual sentences (a name, number, time, key deed, he/she, or 3+ content words); a bare jibe such as "Seguro que ni apareces" may go.
    if (!fxAnchored(sent)) continue;
    ts.forEach((w, i) => {
      if (!FX_NEG.has(w) || w === "never" || w === "nunca") return;
      const nxt = ts.slice(i + 1).find((x) => !FX_STOP.has(x) && !FX_NEG.has(x));
      if (!nxt || /^\d/.test(nxt)) return;
      const rt = fxToks(rewrite);
      const ok = rt.some((x, k) => fxStem(x) === fxStem(nxt) && rt.slice(Math.max(0, k - 4), k).some((y) => FX_NEG.has(y)));
      if (!ok) need("negation_dropped", `${w} ${nxt}`);
    });
    // "without telling me" / "sem avisar" / "sin avisar" is a fact about what was not done; keep it.
    ts.forEach((w, i) => {
      if (!/^(?:without|sem|sin)$/.test(w)) return;
      const nxt = ts.slice(i + 1).find((x) => !FX_STOP.has(x) && !/^(?:even|sequer|siquiera|just|so|much|mesmo|nem|ni)$/.test(x));
      if (!nxt || /^\d/.test(nxt)) return;
      const rt = fxToks(rewrite);
      const ok = rt.some((x, k) => fxStem(x) === fxStem(nxt) && rt.slice(Math.max(0, k - 4), k).some((y) => /^(?:without|sem|sin)$/.test(y) || FX_NEG.has(y)));
      if (!ok) need("negation_dropped", `${w} ${nxt}`);
    });
  }
  // A rule stays a rule: its own rule words, or "The rule is ..." / "A regra é ..." / "La regla es ...". "There are no ..." fails.
  for (const rule of fxRules(coreSents)) {
    if (fxRuleKept(rewrite, rule)) continue;
    codes.add("rule_changed");
    notes.push(`Keep the rule "${rule.head} ... ${rule.word}" as a rule, in the draft's words or starting "The rule is" / "A regra é" / "La regla es"; never "there are no", "não há" or "no hay".`);
  }
  // Who agreed or who said what stays: "we agreed", "lo acordamos", "combinámos", "já falámos disto", "he said", "disse-me que", "me dijo que".
  // "The rule is ..." does not replace "we agreed".
  const rToks = fxToks(rewrite);
  for (const [re, code] of [[FX_AGREE, "agreement_dropped"], [FX_SAID, "report_dropped"]] as const) {
    const hit = coreSents.flatMap((x) => fxToks(x)).find((t) => re.test(t));
    if (hit && !rToks.some((t) => re.test(t))) need(code, hit);
  }
  // Not being told stays, even when it sits inside a jibe; what it was about stays too.
  const told = fxNotTold(factDraft);
  const toldStems = new Set([...told.flatMap((x) => x.span), ...(told.length ? ["about", "sobre", "acerca"] : [])].filter((t) => !FX_STOP.has(t)).map(fxStem));
  if (told.length) {
    const rt = fxToks(rewrite);
    if (!fxNegTell(rt).length) {
      codes.add("not_told_dropped");
      notes.push(`Keep that you were not told, as a plain statement without the blame ("You didn't tell me." / "Não me avisaste." / "No me avisaste."); never leave the whole sentence out.`);
    }
    const rSt = new Set(rt.map(fxStem));
    for (const x of told) for (const a of x.about) if (!fxHasStem(rSt, a)) need("not_told_dropped", a);
  }
  // A rewrite clause made only from a blame clause of the draft ("You ALWAYS forget...", "Are you even capable of...",
  // "If you're late again I'm done being nice") or from a bare negative jibe with no fact and no ask ("Ni apareces") keeps reproach.
  const fxClauses = (t: string) => fxSentences(t).flatMap((x) => x.split(/[,;:]\s*/)).map((x) => x.trim()).filter(Boolean);
  const dSents = fxSentences(factDraft).flatMap((sent) => {
    const blameSent = FX_REPROACH.test(normText(sent));
    return [sent, ...sent.split(/[,;:]\s*/)].map((x, k) => ({
      x, blame: k === 0 ? blameSent : FX_REPROACH.test(normText(x)), st: new Set(fxToks(x).filter((t) => !FX_STOP.has(t)).map(fxStem)),
    }));
  });
  const blameStems = new Set<string>(), factStems = new Set<string>();
  for (const ds of dSents) for (const t of ds.st) (ds.blame ? blameStems : factStems).add(t);
  for (const t of toldStems) factStems.add(t);
  for (const rs of fxClauses(rewrite)) {
    const rsToks = fxToks(rs);
    const rt = rsToks.filter((t) => !FX_STOP.has(t) && !FX_NEG.has(t) && !FX_ALLOWED_NEW.has(t)).map(fxStem);
    if (!rt.length) continue;
    const fromBlame = rt.filter((t) => blameStems.has(t) && !factStems.has(t));
    // Strike mode: what is left of a blame sentence after its blame is struck is the parent's own words, not repeated blame.
    if (fromBlame.length && !strike) {
      codes.add("reproach_kept"); notes.push(`Leave out "${rs}": it uses words only found in the draft's blame.`);
      continue;
    }
    const rsTell = told.length ? fxNegTell(rsToks) : [];
    if (rsTell.length) {
      // "No me avisaste." states the not-told fact; "de nada" / "anything" around it is blame.
      // "Ninguém me disse nada" / "Nadie me dijo nada" / "Nobody told me anything" is the plain way to say it, so it may stay.
      if (rsTell.some(([i, k]) => !/^(?:nobody|noone|ninguém|ninguem|nadie)$/.test(rsToks[k]) && rsToks.slice(i + 1, i + 4).some((t) => /^(?:anything|nothing|nada|ever|never|nunca|whatsoever|nadinha)$/.test(t)))) {
        codes.add("reproach_kept"); notes.push(`Leave "anything" / "nada" out of "${rs}": say only that you were not told.`);
      }
      // "Claro que ninguém me disse", "Of course nobody told me": the wrapper is blame.
      if (rsTell.some(([, k]) => rsToks.slice(0, k).some((t) => /^(?:claro|course|supuesto|naturalmente|obviamente|obviously|typical|típico|típica|tipico)$/.test(t)))) {
        codes.add("reproach_kept"); notes.push(`Leave out the blame wrapper in "${rs}" ("claro que", "of course", "típico"): say only that you were not told.`);
      }
      continue;
    }
    const covering = dSents.filter((ds) => rt.every((t) => ds.st.has(t)));
    if (!strike && covering.length && covering.every((ds) => ds.blame || (!fxAnchored(ds.x) && !textHasAsk(ds.x) && fxToks(ds.x).some((t) => FX_NEG.has(t))))) {
      codes.add("reproach_kept"); notes.push(`Leave out "${rs}": it only repeats blame from the draft.`);
    }
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
    if (told.length && (FX_TELL.test(w) || FX_TOLD_NEG.test(w))) continue; // "não me dizeres" -> "não me disseste"
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
const checkRewrite = (draft: string, rewrite: string, c: SendCheck, strike = false) => {
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
  const fx = codeFactCheck(draft, rewrite, plainDraftAsk, strike);
  for (const x of fx.codes) codes.add(x);
  notes.push(...fx.notes);
  return { codes: [...codes], notes };
};

// ---- strike-only: the model marks blame spans; code deletes them and keeps every other character ----
type Strike = { ok: true; text: string; struck: string[]; ranges: [number, number][] } | { ok: false; reason: string };
const strikeSpans = (draft: string, spans: string[], codeRanges: [number, number][] = []): Strike => {
  const ranges: [number, number][] = [];
  const fold = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  const fd = fold(draft), fdl = fd.toLowerCase();
  const struck: string[] = [];
  for (const raw of spans) {
    if (typeof raw !== "string") continue;
    const sp = fold(raw).trim();
    if (!sp) continue;
    let at = -1, from = 0;
    // First occurrence that does not overlap an earlier strike (exact, then case-insensitive).
    for (const [hay, needle] of [[fd, sp], [fdl, sp.toLowerCase()]] as const) {
      from = 0;
      while ((at = hay.indexOf(needle, from)) >= 0 && ranges.some(([a, b]) => at < b && at + needle.length > a)) from = at + 1;
      if (at >= 0) break;
    }
    if (at < 0) return { ok: false, reason: "span_not_found" };
    let end = at + sp.length;
    // A question stays a question: when the strike takes the tail of a question but its start stays, keep the "?".
    if (sp.endsWith("?")) {
      const head = draft.slice(0, at);
      const sentStart = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf("\n")) + 1;
      if (/[\p{L}\p{N}]/u.test(head.slice(sentStart).replace(/[¿¡]/g, ""))) end -= 1;
    }
    ranges.push([at, end]);
    struck.push(draft.slice(at, end));
  }
  // Code strikes (fixed reproach phrases, jab "again") join after the model's spans are found; overlaps merge below.
  for (const [a, b] of codeRanges) { ranges.push([a, b]); struck.push(draft.slice(a, b)); }
  if (!ranges.length) return { ok: true, text: draft, struck, ranges: [] };
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of ranges) {
    const m = merged[merged.length - 1];
    if (m && a <= m[1]) m[1] = Math.max(m[1], b); else merged.push([a, b]);
  }
  let out = "", last = 0;
  for (const [a, b] of merged) {
    // v6: a cut that takes the end of a sentence ("..., it's not hard.") but not its start keeps that sentence's full stop.
    let keptHead = draft.slice(last, a);
    // v6b: a parenthetical cut with its closing comma ("The £60[, which you forgot,] is due") takes the opening comma too.
    if (/,\s*$/.test(draft.slice(a, b)) && /^\s*(?:which|who|whom|que|quien|quem|o qual|a qual|el cual|la cual)(?![\p{L}])/iu.test(draft.slice(a, b)) && /,\s*$/.test(keptHead) && /^\s*\p{Ll}/u.test(draft.slice(b))) keptHead = keptHead.replace(/,(\s*)$/, "$1");
    const cutEnd = draft.slice(a, b).trimEnd();
    const headSent = (out.replace(/\u0000/g, "") + keptHead).split(/[.!?…]\s+/).pop() ?? "";
    const needStop = /[.!?…]["')\]]*$/u.test(cutEnd) && b < draft.length && /\p{L}/u.test(headSent) && !/[.!?…]["')\]]*\s*$/u.test(keptHead);
    out += keptHead + "\u0000" + (needStop ? (/^\s*¿/.test(headSent) ? "?" : ".") : "");
    last = b;
  }
  out += draft.slice(last);
  // Tidy each cut: a minimal joiner, punctuation and capitals only.
  let t = out;
  // A cut that ends a clause: drop a dangling joiner and comma before it ("..., so [cut]." -> "...").
  t = t.replace(/(?:[\s,;:–-]+(?:and|so|but|or|because|then|e|y|mas|pero|então|entao|entonces|porque|que|pois|por isso|así que|asi que))?[\s,;:–-]*\u0000(?=\s*(?:[.!?]|$))/giu, "\u0000");
  // A cut at the start of a sentence or clause: drop a joiner or comma left after it ("[cut], and she..." -> "she...").
  t = t.replace(/\u0000[\s,;:–-]*(?:(?:and|so|but|or|e|y|mas|pero|então|entao|entonces|pois|que)(?=\s))?/giu, (m, off: number) => {
    const before = t.slice(0, off).replace(/\u0000/g, "").trimEnd();
    return before === "" || /[.!?]$/.test(before) ? "\u0000" : m;
  });
  t = t.replace(/\u0000/g, " ");
  t = t.replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/([,;:])(\s*[,;:])+/g, "$1")
    .replace(/[,;:–-]+\s*([.!?])/g, "$1")
    .replace(/([.!?])(\s*[,;:–-])+/g, "$1")
    .replace(/([.!?])\s*\.(?!\.)/g, "$1")
    .replace(/(^|\n)[\s,;:.!?–-]+/g, "$1")
    .replace(/ *\n */g, "\n")
    .trim();
  // Spanish opening marks left without their closing mark.
  t = t.split(/(?<=[.!?])\s+/).map((s) => (/[¿]/.test(s) && !/[?]/.test(s) ? s.replace(/¿\s*/g, "") : s))
    .map((s) => (/[¡]/.test(s) && !/[!]/.test(s) ? s.replace(/¡\s*/g, "") : s)).join(" ");
  t = t.replace(/[\s,;:–-]+$/u, "");
  if (t && /[.!?]\s*$/.test(draft) && !/[.!?…)"']$/.test(t)) t += ".";
  // Capital at the start of every sentence that was capitalised in the draft style (first letter after a cut).
  t = t.replace(/(^|[.!?]\s+|\n)(["'(¿¡]?)(\p{Ll})/gu, (_m, a: string, q: string, c: string) => a + q + c.toUpperCase());
  return { ok: true, text: t, struck, ranges: merged };
};
// Nearly empty: fewer than two content words, or under a fifth of the draft's content words.
const strikeTooSmall = (draft: string, text: string) => {
  const cw = (s: string) => fxToks(s).filter((w) => !FX_STOP.has(w) && !/^(?:please|por|favor)$/.test(w)).length;
  const r = cw(text);
  return r < 2 || r < 0.2 * cw(draft);
};
// A struck span must carry no fact: no number, money, time, name, place, medicine or health word, rule, agreement,
// report, not-told fact, repetition, real ask or deed. Threat and blame spans may hold a deed or "again" (they go whole).
const STRIKE_FILL = /^(?:again|once|more|otra|outra|vez|novo|nuevo|mismo|mesmo|same|lo|o|the|y|e|and|de|yet|still|as|usual|always|never|sempre|siempre|nunca|it's|it|is|so|typical|típico|típica|like|always|this|time)$/;
// "sick of" / "sick and tired" is a jibe, not health; "your weekends" in general is not a date.
const STRIKE_FED_UP = /\bsick (?:of|and tired)\b/gu;
const STRIKE_GENERIC_TIME = /\b(?:weekends|fins de semana|fines de semana)\b/gu;
const STRIKE_JAB = /(?<![\p{L}])(?:this time|for once|esta vez|desta vez|dessa vez|por una vez|por uma vez|actually)(?![\p{L}])/u;
// A defensive "not me" may go whole (Jared's ruling); its negation is not a fact the reply must keep.
const STRIKE_NOT_ME = /\b(?:(?:wasn't|was not|isn't|it's not|not) me|não fui eu|nao fui eu|no fui yo|no he sido yo)\b/iu;
const strikeSpanProblem = (draft: string, span: string, sentence: string): string | null => {
  const n = normText(span);
  const ts = fxToks(span);
  if (/\d/.test(span)) return "number";
  if ((n.match(FX_MONEY_G) ?? []).length) return "money";
  const esDraft = langScore(normText(draft), "es") > langScore(normText(draft), "pt");
  for (const m of n.match(FX_NUM_WORDS_G) ?? []) if (!((m === "dos" || m === "doce") && !esDraft)) return "number_word";
  if (FX_TIMES.test(n.replace(STRIKE_GENERIC_TIME, " ")) && !/^(?:this time|esta vez|desta vez|dessa vez|for once|por una vez)$/.test((n.match(FX_TIMES_G) ?? [""])[0])) return "time";
  for (const [, re] of MONTHS) if (re.test(n)) return "time";
  const names = draftNames(draft);
  for (const nm of names) if (hasWord(n, nm)) return "name";
  if ((n.match(FX_PLACES_G) ?? []).length) return "place";
  if (fxMedNames(span).length) return "medicine";
  if (fxToks(n.replace(STRIKE_FED_UP, " ")).some((w) => HEALTH_WORDS.has(w))) return "health";
  if (fxRules(span.split(/[,;:]\s+/)).length) return "rule";
  if (fxNotTold(span).length) return "not_told";
  const blame = FX_REPROACH.test(n) || fxIsThreat(sentence);
  if (ts.some((t) => FX_AGREE.test(t))) return "agreement";
  if (!blame && ts.some((t) => FX_SAID.test(t))) return "report";
  if (!blame) {
    if (Object.values(FX_AGAIN).some((re) => re.test(n)) && !ts.every((t) => STRIKE_FILL.test(t) || FX_STOP.has(t))) return "count";
    if (fxDeeds(span, names).length) return "deed";
    if (clausesOf(expandContractions(span)).some(isAskClause) && !/\?\s*$/.test(span.trim())) return "ask";
  }
  // A negation struck from inside a sentence that stays flips its meaning ("You never tell me" -> "You tell me").
  const whole = normText(sentence).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const part = n.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (ts.some((t) => FX_NEG.has(t)) && part !== whole && !sentence.split(/[,;:]\s*/).some((c) => normText(c).replace(/[^\p{L}\p{N}]+/gu, " ").trim() === part)) return "negation";
  // v7.1: a negative pronoun ("nada", "nothing", "nadie") is the negation too: "no me dijeras nada" -> "no me dijeras" changes
  // the sentence.
  // Only a bare negative pronoun struck on its own; a whole clause ("because nobody washed it") is not this.
  if (/^(?:nada|nothing|nadie|nobody|ninguém|ninguem|nenhum|nenhuma|ninguno|ninguna|none|anything)$/u.test(part) && part !== whole) return "negation";
  return null;
};
const strikeGuard = (draft: string, spans: string[]): string[] => {
  const sents = fxSentences(draft);
  const out: string[] = [];
  const fx = strikeFixed(draft).ranges;
  const core = (t: string) => t.replace(/[\s,;:.!?¡¿]+/gu, "");
  for (const sp of spans) {
    // v5: a span that is only words the fixed list strikes anyway ("Da igual,", " Don't bother.") needs no guard.
    const at = draft.indexOf(sp);
    if (at >= 0 && core(sp) && fx.some(([a, b]) => at < b && at + sp.length > a && core(draft.slice(a, b)).includes(core(sp)))) continue;
    const sentence = sents.find((s) => s.includes(sp.trim())) ?? sp;
    const p = strikeSpanProblem(draft, sp, sentence);
    if (p) out.push(`${p}:${sp}`);
  }
  return out;
};
// Whole-result check: the full fact check, minus what a pure deletion cannot get wrong (asks are guarded per span).
// "language_changed" is moot too: a deletion cannot translate, and the blame may be the draft's only English (or Spanish) words.
const STRIKE_IGNORE = new Set(["repeat", "ask_changed", "ask_dropped", "ask_added", "question_added", "decision_as_question", "language_changed"]);
const strikeCheck = (draft: string, text: string, spans: string[] = [], jabRanges: [number, number][] = []) => {
  let base = draft;
  for (const [a, b] of [...jabRanges].sort((x, y) => y[0] - x[0])) base = base.slice(0, a) + " ".repeat(b - a) + base.slice(b);
  for (const sp of spans) if (STRIKE_NOT_ME.test(sp)) base = base.replace(sp, " ");
  const res = checkRewrite(base, text, { facts: [], has_ask: false, states_decision: false, languages: [] }, true);
  const codes = res.codes.filter((c) => !STRIKE_IGNORE.has(c));
  const notes = [...res.notes];
  // A jab such as "this time" / "for once" / "esta vez" left in a struck draft is reproach left in.
  const jab = normText(text).match(STRIKE_JAB);
  if (jab) { codes.push("reproach_kept"); notes.push(`"${jab[0]}" is still a jab; strike it with the blame.`); }
  return { codes, notes };
};

// ---- v3: code-side strikes that do not depend on the model ----
// Fixed reproach phrases, struck only when they are a whole clause (between the start or , ; : . ! ? and the end or
// , ; : . ! ?), so "a typical day" or "as usual, pickup is at 5" style facts inside a clause are never cut.
const STRIKE_FIXED_PHRASES = [
  // en
  "as usual", "as always", "same as always", "same as usual", "same as ever", "here we go again", "same again", "same old story", "same old",
  "typical", "typical of you", "so typical", "so typical of you", "how typical", "it's so typical of you", "it's typical of you",
  "it's always the same", "it's always the same with you", "always the same with you", "surprise surprise",
  // v5: brush-offs, only as a whole clause or sentence ("Don't bother." / ", don't bother.")
  "don't bother", "do not bother", "don't bother then", "don't even bother", "don't bother yourself", "never mind", "forget it",
  // pt
  "como sempre", "como de costume", "típico", "típico de ti", "típica", "sempre a mesma coisa", "sempre a mesma coisa contigo",
  "é sempre a mesma coisa", "é sempre a mesma coisa contigo", "de novo a mesma coisa", "outra vez a mesma coisa", "a mesma coisa de sempre",
  "lá estamos nós outra vez", "lá estamos outra vez", "lá vamos nós outra vez", 
  "não te incomodes", "não te incomodes mais", "não te dês ao trabalho", "não precisas de te incomodar", "deixa estar", "esquece", "esquece isso",
  // es
  "como siempre", "como de costumbre", "típico de ti", "otra vez lo mismo", "lo mismo de siempre", "siempre lo mismo",
  "siempre lo mismo contigo", "es siempre lo mismo", "ya estamos otra vez", 
  "no te molestes", "no te molestes más", "no hace falta que te molestes", "ni te molestes", "déjalo", "olvídalo", "da igual",
  // mixed
  "it's always the same contigo", "it's so typical contigo", "sempre a mesma coisa with you", "siempre lo mismo with you",
];
// v6: a sigh ("No worries", "Não faz mal", "No pasa nada", "It's fine") is struck only when the same or the next sentence is a
// martyr line or a "don't reply" dig (see STRIKE_SIGH_RE); a plain "No worries, see you at 5" stays.
const SIGH_WORDS = "no worries|no problem|it['’]s fine|that['’]s fine|fine|whatever|não faz mal|tudo bem|está bem|deixa|no pasa nada|vale|tranquilo|tranquila|está bien|da igual";
const SIGH_MARTYR = "(?:I['’]ll|I will|I['’]m the one|I always|I guess I['’]ll|myself|eu trato|eu faço|eu é que|eu resolvo|eu levo|trato eu|faço eu|trato disso|ya me encargo|me encargo yo|ya lo hago|lo hago yo|ya lo pago|lo pago yo|ya voy yo|like I always|like always|as usual|as always|como sempre|como siempre|don['’]t (?:reply|answer)|não respondas|no contestes|no respondas)";
const STRIKE_SIGH_RE = new RegExp(
  `(?<=^|[.!?]\\s+)((?:(?:oh|ok|okay|ah|pronto|bueno|vale),?\\s+)?(?:${SIGH_WORDS})(?:,?\\s+(?:honestly|really|a sério|de verdad|en serio))?(?:,?\\s+(?:${SIGH_WORDS}))?\\s*[,.!]\\s*(?:honestly,?\\s+(?:it['’]s fine|fine)[.!]\\s*)?)(?=[^.!?]{0,80}?${SIGH_MARTYR})`,
  "giu",
);
// v6b: a sigh said twice ("It's fine. Honestly, it's fine." / "Tudo bem. Tudo bem.") is a sigh whatever follows.
const STRIKE_SIGH_REPEAT_RE = new RegExp(
  `(?<=^|[.!?]\\s+)((?:${SIGH_WORDS})\\s*[.!…]+\\s+(?:(?:honestly|really|a sério|de verdad|en serio),?\\s+)?(?:${SIGH_WORDS})\\s*[.!…]+\\s*)`,
  "giu",
);
// v6: "don't reply" digs as a whole clause, with an optional sigh in front ("Tudo bem, não respondas." / "Vale, tranquilo, no contestes.").
const STRIKE_NOREPLY_RE = new RegExp(
  `(?<=^|[.!?]\\s+)(?:(?:${SIGH_WORDS}|ok|okay|sure),\\s+)*(?:don['’]t (?:reply|answer)(?: then)?|don['’]t bother replying|não respondas|não precisas de responder|no contestes|no respondas)\\s*[.!]\\s*`,
  "giu",
);
// v6: reproach "even" (only as "didn't even / did you even ..." before a verb, never before a number) and its PT/ES
// "sequer" / "siquiera" (the "nem" / "ni" stays: it is the negation).
const STRIKE_EVEN_RE = /(?<=(?<![\p{L}])(?:didn['’]?t|did not|don['’]?t|do not|doesn['’]?t|does not|can['’]?t|cannot|couldn['’]?t|wouldn['’]?t|won['’]?t|haven['’]?t|hasn['’]?t|did you|do you|have you|nem|ni|não))(\s+(?:even|sequer|siquiera))(?=\s+(?![\d£€$]|one|two|three|four|five|six|seven|eight|nine|ten|um|uma|dois|duas|uno|una|dos)[\p{L}])/giu;
// v6: a sentence that is only "Again?!" / "Otra vez." / "¿Otra vez?" / "De novo?" / "Yet again." (pure reproach, no count).
const STRIKE_AGAIN_ALONE_RE = /(?<=^|[.!?]\s+)(?:¡|¿)?(?:again|yet again|once again|otra vez|outra vez|de novo|de nuevo|mais uma vez|una vez más|otra vez más)(?:[.!?…]+)\s*/giu;
const STRIKE_BRUSH_RE = /^(?:don['’]t (?:even )?bother|do not bother|never mind|forget it|não te (?:incomodes|dês)|não precisas de te incomodar|deixa estar|esquece|(?:no|ni) te molestes|no hace falta que te molestes|déjalo|olvídalo|da igual)/iu;
const STRIKE_FIXED_RE = new RegExp(
  `(?<=^|[.!?,;:]\\s*)(?:${[...STRIKE_FIXED_PHRASES].sort((a, b) => b.length - a.length).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]").replace(/ /g, "\\s+")).join("|")})(?=\\s*(?:[.!?,;:]|$))`,
  "giu",
);
// "Típico que ..." / "Typical, ..." open a not-told sentence: the wrapper goes, the fact stays (guarded downstream).
const STRIKE_FIXED_LEAD_RE = /(?<=^|[.!?]\s+)(?:típico|tipico|típica)\s+que(?=\s)/giu;
// A bare "again" is usually a count fact ("he was sick again"). It is struck only in a pure jab clause: a negative
// imperative about forgetting or being late, with at most a short object, ending at "again" ("Don't forget otra vez",
// "Não te esqueças outra vez", "No te olvides la mochila otra vez"). Never after a name, a verb in the past, or an event.
const STRIKE_JAB_AGAIN_RE = new RegExp(
  "(?<=^|[.!?,;:]\\s*)(?:please,?\\s+|por favor,?\\s+)?" +
  "(?:(?:don['’]?t|do not)\\s+(?:forget|be late|miss it)|(?:não|nao)\\s+te\\s+(?:esqueças|esquecas|atrases)|(?:não|nao)\\s+(?:faltes|falhes)|no\\s+te\\s+(?:olvides|retrases)|no\\s+(?:llegues\\s+tarde|faltes))" +
  "(?:\\s+(?:it|this|that|isso|eso|lo|la|o|a)|\\s+(?:the|her|his|their|o|a|os|as|la|el|los|las|de\\s+la|del|da|do|de)\\s+[\\p{L}-]+)?" +
  "(\\s+(?:again|once again|otra vez|outra vez|de novo|de nuevo|novamente|nuevamente))(?=\\s*(?:[.!?,;:]|$))",
  "giu",
);
// v7: "what I am not / what it is not" digs ("the school isn't a babysitting service", "I'm not a taxi", "não sou tua
// empregada", "no soy tu chófer"). Struck by code as a whole short clause; left in a result they are blame (null).
const DIG_NOUNS =
  "babysitting service|babysitting|babysitter|childminder|childcare service|taxi service|taxi|cab|chauffeur|driver|maid|cleaner|servant|slave|" +
  "skivvy|secretary|pa|personal assistant|bank|cash machine|cashpoint|atm|nanny|hotel|creche|crèche|daycare|nursery|butler|mum|mother|" +
  "empregada|empregada doméstica|criada|motorista|taxista|táxi|secretária|ama|banco|multibanco|infantário|creche|atl|escrava|escravo|mãe|" +
  "chófer|chofer|chacha|asistenta|niñera|canguro|cajero|cajero automático|guardería|madre|esclava|esclavo|secretaria";
const DIG_RE = new RegExp(
  "(?<![\\p{L}])(?:(?:(?:i['’]m|i am|we['’]re|we are)\\s+not|(?:this|that|it|here|(?:the|my|our)\\s+[\\p{L}-]+)\\s*(?:isn['’]t|is not|['’]s not|ain['’]t)|(?<=(?:^|[,;:.!?]\\s*))not)\\s+(?:a|an|your|some)|" +
  "(?:(?:não|nao)\\s+(?:sou|somos)|(?:isto|isso|aqui|(?:a|o)\\s+(?:escola|casa|colégio|minha casa|nossa casa|creche|atl))\\s+(?:não|nao)\\s+(?:é|e))\\s+(?:(?:o\\s+)?teu|(?:a\\s+)?tua|nenhum|nenhuma|um|uma)|" +
  "(?:no\\s+(?:soy|somos)|(?:esto|eso|aquí|aqui|(?:el|la)\\s+(?:colegio|escuela|casa|guardería))\\s+no\\s+es)\\s+(?:tu|ningún|ninguna|un|una))" +
  "\\s+(?:(?:free|personal|private|24-hour|grátis|gratuito|gratuita|gratis|privado|privada|particular|pessoal|personal)\\s+)?" +
  `(?:${DIG_NOUNS})(?:\\s+(?:service|serviço|servicio|de táxis|de taxis|grátis|gratis))?` +
  "(?=\\s*(?:[,;:.!?…)]|$)|\\s+(?:for you|here|mate|you know|para ti|aqui|aquí|sabes)(?![\\p{L}]))",
  "giu",
);
// Left in a result: the same dig with anything after it ("I'm not your taxi so ...") is still blame.
const DIG_LEFT_RE = new RegExp(DIG_RE.source.slice(0, DIG_RE.source.lastIndexOf("(?=")) + "(?![\\p{L}])", "iu");
// The clause around a dig, if it is only the dig: at most 3 words before it in its clause and 2 after.
const digClauses = (draft: string): [number, number][] => {
  const out: [number, number][] = [];
  for (const m of draft.matchAll(DIG_RE)) {
    const at = m.index ?? 0, end = at + m[0].length;
    const head = draft.slice(0, at);
    const cs = Math.max(head.search(/[^,;:.!?\n]*$/u), 0);
    const tailM = draft.slice(end).match(/^[^,;:.!?\n]*/u)?.[0] ?? "";
    const pre = draft.slice(cs, at).trim(), post = tailM.trim();
    if (pre.split(/\s+/).filter(Boolean).length > 3 || post.split(/\s+/).filter(Boolean).length > 2) continue;
    let a = cs, b = end + tailM.length;
    const before = draft.slice(0, a);
    if (/,\s*$/.test(before)) a = before.replace(/,\s*$/, "").length; // ", the school isn't a babysitting service"
    else if (/^\s*[.!?]/.test(draft.slice(b))) b += (draft.slice(b).match(/^\s*[.!?]+\s*/)?.[0].length ?? 0); // whole sentence
    else if (/^\s*,\s*/.test(draft.slice(b))) b += (draft.slice(b).match(/^\s*,\s*/)?.[0].length ?? 0); // opening clause
    out.push([a, b]);
  }
  return out;
};
// v7: a grudging tail on a statement ("It's at 2pm next Friday if you can fit it in."). Struck only when something
// else in the draft is struck too (see strikeFixed().tail), and never on an ask ("Can you take her, if you've got time?").
const DIG_TAIL_RE = /,?\s+(?:if you can (?:fit (?:it|us|him|her|them|that) in|be bothered|spare the time|make (?:the )?time)|if you(?:['’]ve| have) (?:got )?(?:the )?time|if it['’]s not too much (?:trouble|to ask)|if your (?:busy )?schedule allows|se tiveres tempo|se conseguires arranjar tempo|se te der jeito|se não for pedir muito|se não for muito incómodo|si te viene bien|si tienes tiempo|si encuentras (?:un )?hueco|si no es mucho pedir|si te da la vida)(?=\s*(?:[.!…]|$))/giu;
const isAskSentence = (s: string) => {
  const b = s.trim().replace(/^[¿¡"'(]+/, "");
  const first = (b.match(/^[\p{L}'’-]+/u)?.[0] ?? "").toLowerCase().replace("’", "'");
  return /\?\s*$/.test(s) || PLEASE_EN_REQ.test(b) || PLEASE_PTES_REQ.test(b) || HAS_PLEASE.test(b) || PLEASE_EN_VERBS.has(first) || PLEASE_PTES_VERBS.has(first) || PLEASE_PTES_LEAD.test(b);
};
const digTails = (draft: string): [number, number][] => {
  const out: [number, number][] = [];
  for (const m of draft.matchAll(DIG_TAIL_RE)) {
    const at = m.index ?? 0;
    const head = draft.slice(0, at);
    const sent = head.slice(Math.max(head.search(/[^.!?\n]*$/u), 0)) + m[0];
    // "if it's not too much to ask" / "si no es mucho pedir" / "if you can be bothered" are sarcasm on an ask too.
    if (!/too much|be bothered|pedir muito|mucho pedir|muito incómodo/iu.test(m[0]) && isAskSentence(sent.replace(/^\s*(?:and|so|e|y|mas|pero)\s+/iu, ""))) continue;
    out.push([at, at + m[0].length]);
  }
  return out;
};
const strikeFixed = (draft: string) => {
  const ranges: [number, number][] = [];
  const jab: [number, number][] = [];
  for (const m of draft.matchAll(STRIKE_FIXED_RE)) {
    let a = m.index ?? 0;
    // Take the comma that joins a trailing phrase (", as usual.") with it.
    const pre = draft.slice(0, a).match(/,\s*$/);
    if (pre) a -= pre[0].length;
    ranges.push([a, (m.index ?? 0) + m[0].length]);
    // v5: a struck brush-off's "don't" / "não" / "no" is not a fact the result must keep.
    if (STRIKE_BRUSH_RE.test(m[0])) jab.push([a, (m.index ?? 0) + m[0].length]);
  }
  for (const m of draft.matchAll(STRIKE_FIXED_LEAD_RE)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  // v6: sighs before a martyr line, "don't reply" digs, standalone "Again?!", reproach "even" / "sequer" / "siquiera".
  for (const re of [STRIKE_SIGH_RE, STRIKE_SIGH_REPEAT_RE, STRIKE_NOREPLY_RE, STRIKE_AGAIN_ALONE_RE]) {
    for (const m of draft.matchAll(re)) {
      const g = m[1] ?? m[0];
      const at = (m.index ?? 0) + m[0].indexOf(g);
      const r: [number, number] = [at, at + g.length];
      ranges.push(r);
      jab.push(r);
    }
  }
  for (const m of draft.matchAll(STRIKE_EVEN_RE)) {
    const at = (m.index ?? 0) + m[0].lastIndexOf(m[1]);
    ranges.push([at, at + m[1].length]);
    jab.push([at, at + m[1].length]);
  }
  for (const m of draft.matchAll(STRIKE_JAB_AGAIN_RE)) {
    const end = (m.index ?? 0) + m[0].length;
    const r: [number, number] = [end - m[1].length, end];
    ranges.push(r);
    jab.push(r);
  }
  // v4: martyr "just" / trailing "as usual" after "I'll do it myself" style clauses.
  for (const r of strikeMartyr(draft)) { ranges.push(r); jab.push(r); }
  // v7: "isn't a babysitting service" digs (their "not" is not a fact the result must keep).
  for (const r of digClauses(draft)) { ranges.push(r); jab.push(r); }
  // v7: grudging tails go only alongside another strike (the caller adds them; a calm draft keeps its "if you've got time").
  const tail = digTails(draft);
  return { ranges, jab, tail };
};

// v7: the code strikes for one candidate: grudging tails join only when the model or the fixed list strikes something else.
const fixedWith = (fixed: { ranges: [number, number][]; jab: [number, number][]; tail: [number, number][] }, spans: string[]) =>
  fixed.tail.length && (fixed.ranges.length || spans.some((s) => typeof s === "string" && s.trim()))
    ? { ranges: [...fixed.ranges, ...fixed.tail], jab: [...fixed.jab, ...fixed.tail] }
    : { ranges: fixed.ranges, jab: fixed.jab };

// ---- v6: log reasons are codes from this fixed set only; never draft text, spans or snippets ----
const REASON_CODES = new Set([
  "pass", "rewrite", "please_added", "timeout", "parse", "error", "no_time_for_retry", "retry_timeout", "retry_parse", "retry_error",
  "retry_none", "retry_cand", "span_not_found", "too_small", "no_subject", "hanging_conditional", "dangling", "no_verb", "actor_dropped",
  "blame_left", "sarcasm_left", "shout_left", "name", "number", "time", "place", "medicine", "health", "rule", "not_told", "agreement",
  "report", "count", "deed", "ask", "negation", "reproach_kept", "threat_kept", "added_content", "dropped_number", "new_time_word",
  "tense_changed", "actor_changed", "action_dropped", "stance_changed", "rule_changed", "missing_fact", "new_number", "banned_word",
  "health_word_missing", "not_told_dropped", "partial_translation", "language_changed", "negation_dropped", "ask_added", "ask_changed",
  "ask_dropped", "question_added", "decision_as_question", "repeat", "count_dropped", "deed_dropped", "medication_dropped",
  "money_dropped", "name_dropped", "number_dropped", "place_dropped", "time_dropped", "empty", "other",
]);
const reasonCode = (p: string) => {
  const c = (p.match(/^[a-z_]+/)?.[0] ?? "other");
  return REASON_CODES.has(c) ? c : "other";
};
const reasonCodes = (ps: string[]) => [...new Set(ps.map(reasonCode))];
// ---- v3: the one word code may add: "Please" / "Por favor" in front of an ask the parent already wrote ----
const PLEASE_EN_VERBS = new Set([
  "bring", "take", "pack", "give", "send", "pick", "drop", "stop", "keep", "call", "text", "tell", "remember", "pay", "put", "check",
  "sign", "return", "let", "make", "get", "leave", "collect", "book", "buy", "help", "try", "be", "come", "wait", "ask", "answer",
  "reply", "read", "write", "swap", "change", "stay", "don't", "dont", "do", "ensure", "confirm", "sort", "find", "transfer", "update",
]);
const PLEASE_EN_REQ = /^(?:can|could|will|would)\s+you\b/i;
const PLEASE_PTES_VERBS = new Set([
  "leva", "traz", "dá", "manda", "envia", "liga", "paga", "põe", "deixa", "vem", "lembra", "avisa", "diz", "compra", "busca", "apanha",
  "confirma", "transfere", "devolve", "trata", "verifica", "arranja", "pára",
  "dale", "dame", "lleva", "trae", "envía", "llama", "pon", "deja", "ven", "dile", "recuerda", "acuérdate", "recoge", "confirma", "avísame",
  "paga", "compra", "devuelve", "mira", "revisa", "trata", "manda", "dime", "llévalo", "llévala", "tráelo", "tráela", "avisa",
]);
const PLEASE_PTES_LEAD = /^(?:(?:não|nao)\s+te\s+(?:esqueças|esquecas|atrases)|(?:não|nao)\s+(?:faltes|falhes|deixes)|no\s+te\s+(?:olvides|retrases)|no\s+(?:llegues|faltes|dejes)|para\s+de|pára\s+de|deja\s+de|tens\s+de|tienes\s+que)\b/iu;
const PLEASE_PTES_REQ = /^(?:podes|pode|podias|consegues|puedes|podrías|podrias|me\s+puedes|me\s+podrías|transferes-me|mandas-me|envias-me|me\s+mandas|me\s+avisas)\b/iu;
const HAS_PLEASE = /(?<![\p{L}])(?:please|pls|por favor|porfa|se faz favor|por favorzinho)(?![\p{L}])/iu;
// Brush-offs are not asks: "Don't bother." / "Forget it." / "Deixa estar." / "Da igual." never get a "Please".
const PLEASE_SKIP = /^(?:don['’]t bother|don['’]t worry|forget it|never mind|deixa estar|esquece|deja estar|déjalo|olvídalo|da igual|não te preocupes|no te preocupes)\b/iu;
// v6: only an ask in or after the first struck span gets a "Please" (fromSent = that sentence's index); a curt draft with
// nothing struck ("Pay it.") is left as written.
const pleaseFrom = (draft: string, ranges: [number, number][]): number => {
  if (!ranges.length) return Infinity;
  const head = draft.slice(0, Math.min(...ranges.map(([a]) => a)));
  return head.trim() ? head.split(/(?<=[.!?])\s+/).length - 1 : 0;
};
const addPlease = (text: string, fromSent = 0): string => {
  if (HAS_PLEASE.test(text)) return text;
  const parts = text.split(/(?<=[.!?])(\s+)/);
  for (let i = 2 * Math.max(0, fromSent); i < parts.length; i += 2) {
    const sent = parts[i];
    const q = sent.startsWith("¿") ? "¿" : "";
    const body = sent.slice(q.length);
    const first = (body.match(/^[\p{L}'’-]+/u)?.[0] ?? "").toLowerCase().replace("’", "'");
    if (!first || PLEASE_SKIP.test(body)) continue;
    const isQ = /\?\s*$/.test(sent);
    let pre = "";
    if ((!q && !isQ && PLEASE_EN_VERBS.has(first)) || (isQ && PLEASE_EN_REQ.test(body))) pre = "Please ";
    else if ((!q && !isQ && (PLEASE_PTES_VERBS.has(first) || PLEASE_PTES_LEAD.test(body))) || (isQ && PLEASE_PTES_REQ.test(body))) pre = "Por favor, ";
    if (!pre) continue;
    // Lower-case only the first letter of the parent's first word (a verb here, never a name or "I").
    parts[i] = pre + q + body.charAt(0).toLowerCase() + body.slice(1);
    return parts.join("");
  }
  return text;
};

// ---- v4: martyr "just" / "I'll do it myself as usual", struck only in fixed patterns (same approach as the fixed list) ----
// Only the martyr word goes ("just", the trailing "as usual" / "como sempre" / "como siempre"); who will do it stays.
const STRIKE_MARTYR_RES: RegExp[] = [
  // "Fine, I'll just ..." / "Deixa estar, eu é que ..." / "Da igual, ya lo hago yo": the sigh in front of a martyr line.
  /(?<=^|[.!?]\s+)((?:fine|forget it|never mind|don['’]t worry|deixa estar|esquece|não faz mal|da igual|déjalo|olvídalo|no te preocupes),\s+)(?=(?:I['’]ll|I will|eu|ya\s+lo|yo|faço|lo\s+hago)(?![\p{L}]))/giu,
  // "I'll just do it myself" -> "I'll do it myself"
  /(?<![\p{L}])(?:I['’]ll|I will|I['’]d|let me)\s+(just)\s+(?=(?:do|sort|handle|deal|fix|pay|organise|organize|arrange|pick|take|bring|get|cancel|go|ask|tell|leave|buy|book|cover|collect|drop|call|text|send|sign|find|make|cook|wash|pack|stay|keep|look)\b)/giu,
  // "I'll do it myself as usual" / "I'll sort it myself, as always" (the comma form is the fixed list's)
  /(?<![\p{L}])I(?:['’]ll| will|['’]m going to| always| have to| had to)?\s+(?:just\s+)?[\p{L}' ]{2,40}?\bmyself(\s+(?:as usual|as always|like always|again as usual))(?=\s*(?:[.!?,;:]|$))/giu,
  // v5: "I'll do the forms myself" -> "I'll do the forms" (who does it stays in "I'll")
  /(?<![\p{L}])(?:I['’]ll|I will|I['’]m going to|I have to|I had to|I always)\s+(?:just\s+)?(?:do|sort|handle|deal|fix|pay|organise|organize|arrange|pick|take|bring|get|cancel|go|ask|tell|buy|book|cover|collect|drop|call|text|send|sign|find|make|cook|wash|pack|fill|look)\b[^.!?;:\n]{0,60}?(\s+myself)(?![\p{L}])/giu,
  // pt: "faço eu como sempre", "eu é que trato disso como sempre", "vou eu buscá-la como sempre"
  /(?<![\p{L}])(?:faço|trato|levo|pago|resolvo|vou|busco|apanho|organizo|compro|marco|ligo)\s+eu\b[^.!?,;:\n]{0,40}?(\s+como\s+(?:sempre|de costume))(?=\s*(?:[.!?,;:]|$))/giu,
  // "eu é que ..." only: a plain "Eu levo-a às 5 como sempre" is a routine, not a martyr line.
  /(?<![\p{L}])eu\s+é\s+que\s+(?:faço|trato|levo|pago|resolvo|vou|busco|apanho|organizo|compro|marco|ligo)\b[^.!?,;:\n]{0,40}?(\s+como\s+(?:sempre|de costume))(?=\s*(?:[.!?,;:]|$))/giu,
  // es: "ya lo hago yo como siempre", "me encargo yo como siempre", "lo pago yo, como siempre" (comma form is the fixed list's)
  /(?<![\p{L}])(?:(?:ya\s+)?(?:lo|la|los|las)\s+)?(?:hago|haré|recojo|llevo|pago|arreglo|organizo|busco|compro|llamo|encargo|me\s+encargo|voy)\s+yo\b[^.!?,;:\n]{0,40}?(\s+como\s+(?:siempre|de costumbre))(?=\s*(?:[.!?,;:]|$))/giu,
  // "siempre soy yo el que ..." style: only with the emphatic "soy yo" (a plain "Yo la recojo a las 5 como siempre" is a routine).
  /(?<![\p{L}])(?:soy|seré)\s+yo\s+(?:el|la)\s+que\b[^.!?,;:\n]{0,40}?(\s+como\s+(?:siempre|de costumbre))(?=\s*(?:[.!?,;:]|$))/giu,
  /(?<![\p{L}])sou\s+eu\s+que\b[^.!?,;:\n]{0,40}?(\s+como\s+(?:sempre|de costume))(?=\s*(?:[.!?,;:]|$))/giu,
];
const strikeMartyr = (draft: string): [number, number][] => {
  const out: [number, number][] = [];
  for (const re of STRIKE_MARTYR_RES) {
    for (const m of draft.matchAll(re)) {
      const g = m[1];
      if (!g) continue;
      const at = (m.index ?? 0) + m[0].lastIndexOf(g);
      out.push([at, at + g.length]);
    }
  }
  return out;
};

// ---- v4: shouted caps. ALL-CAPS words go to lower case (capital kept at a sentence start), except short acronyms
// (up to 4 letters, unless a common word), known names and brands, and words the draft also writes in normal case
// (those take the draft's own form, e.g. "LEO" -> "Leo" when the draft also says "Leo"). ----
const CAPS_BRANDS = ["EpiPen", "Calpol", "Piriton", "Ben-u-ron", "Nurofen", "Brufen", "Dalsy", "Apiretal", "Calpol", "Ventolin", "Clarityn", "Zirtek", "Benadryl", "Paracetamol", "Ibuprofen", "Ibuprofeno", "Calpol", "WhatsApp", "iPad", "iPhone", "PlayStation", "Xbox", "YouTube", "TikTok"];
const CAPS_BRAND_MAP = new Map([...CAPS_BRANDS, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January",
  "February", "March", "April", "June", "July", "August", "September", "October", "November", "December", "Christmas", "Easter"].map((b) => [b.toLowerCase(), b]));
const CAPS_KEEP = new Set(["gp", "er", "pe", "nhs", "a&e", "ae", "pta", "sen", "iep", "adhd", "asd", "sns", "ok", "am", "pm", "uk", "usa", "dbs", "mot", "id", "tv", "pc", "dvd", "pdf", "sms", "faq", "ceo", "hr", "bbc", "ikea", "pin", "cv", "dni", "nif", "iva", "ctt", "inem", "ess"]);
const CAPS_COMMON_SHORT = new Set([
  "not", "now", "stop", "late", "ever", "this", "that", "what", "why", "how", "you", "me", "my", "her", "his", "our", "your", "the", "and", "but",
  "yes", "no", "all", "one", "two", "get", "give", "take", "pay", "call", "text", "tell", "done", "back", "home", "time", "day", "here", "them",
  "they", "him", "she", "will", "must", "need", "have", "has", "had", "was", "were", "are", "did", "do", "does", "don't", "dont", "can't", "won't",
  "i'm", "it's", "just", "even", "only", "more", "much", "very", "so", "too", "be", "is", "am", "of", "to", "in", "on", "at", "for", "by", "up",
  "out", "off", "or", "if", "we", "us", "he", "an", "a", "go", "see", "say", "said", "told", "ask", "once", "last", "next", "again", "ffs", "omg",
  "não", "nao", "já", "ja", "nada", "nem", "ele", "ela", "tu", "eu", "yo", "tú", "el", "la", "lo", "que", "por", "para", "hoy", "hoje", "ya", "otra",
  "vez", "mais", "más", "mas", "muy", "sim", "sí", "isso", "eso", "esto", "aqui", "aquí", "todo", "tudo", "dia", "día", "hora", "ver", "dar", "sei",
  "sé", "foi", "fue", "es", "é", "está", "tem", "vai", "va", "sem", "sin", "com", "con", "pero", "se", "si", "de", "do", "da", "del", "al", "o", "e",
  "y", "os", "as", "los", "las", "um", "uma", "un", "una", "te", "ti", "nos", "sua", "seu", "tua", "teu", "tus", "tu", "fiz", "faz", "haz", "hace",
  "pois", "bem", "bien", "mal", "kit", "bag", "coat", "bus", "car", "food", "cash", "fee", "keys", "key", "book", "hat", "home", "work", "mum",
  "dad", "mom", "mãe", "pai", "papá", "mamá", "ropa", "casa", "late", "early", "sure", "fine", "busy", "sick", "ill", "hurt", "safe", "help",
  "cold", "hot", "wet", "tired", "rule", "rules", "sign", "form", "fees", "nope", "never", "nunca", "hoje", "logo", "cedo", "tarde", "aqui", "agora",
]);
const CAPS_WORD_RE = /(?<![\p{L}\p{N}])[\p{L}][\p{L}'’&-]*(?![\p{L}\p{N}])/gu;
const isShout = (w: string) => /\p{Lu}/u.test(w) && !/\p{Ll}/u.test(w) && (w.match(/\p{L}/gu) ?? []).length >= 2;
const shoutForm = (w: string, draft: string, inRun = false): string | null => {
  const low = w.toLowerCase().replace("’", "'");
  const brand = CAPS_BRAND_MAP.get(low);
  if (brand) return brand;
  // A word the draft also writes in normal case takes that form ("LEO" -> "Leo", "COAT" -> "coat").
  for (const m of draft.matchAll(CAPS_WORD_RE)) if (!isShout(m[0]) && m[0].toLowerCase() === w.toLowerCase()) return m[0];
  const letters = (w.match(/\p{L}/gu) ?? []).length;
  if (CAPS_KEEP.has(low)) return null;
  if (letters <= 4 && !CAPS_COMMON_SHORT.has(low) && !inRun) return null; // short acronym or name: GP, ER, PE, NHS
  return low;
};
const hasShout = (draft: string) => shoutLeft(draft, draft).length > 0;
// A short all-caps word next to another shouted word (of 5+ letters or a common word) is part of a shouted phrase
// ("TODOS LOS DÍAS", "SO HARD"), not an acronym.
const shoutRuns = (text: string, draft: string) => {
  const ws = [...text.matchAll(CAPS_WORD_RE)];
  const loud = ws.map((m) => isShout(m[0]) && (shoutForm(m[0], draft) !== null));
  const run = new Set<number>();
  ws.forEach((m, i) => {
    if (!isShout(m[0])) return;
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= ws.length || !loud[j]) continue;
      const gap = j < i ? text.slice(ws[j].index! + ws[j][0].length, m.index) : text.slice(m.index! + m[0].length, ws[j].index);
      if (/^[\s-]+$/.test(gap)) run.add(m.index!);
    }
  });
  return run;
};
const deShout = (text: string, draft: string): string => {
  const runs = shoutRuns(text, draft);
  const out = text.replace(CAPS_WORD_RE, (w: string, off: number) => {
    if (!isShout(w)) return w;
    if (/\d$/.test(text.slice(0, off))) return w; // "5PM"
    const f = shoutForm(w, draft, runs.has(off));
    if (f === null) return w;
    // "I'M" / "I'LL" keep their "I".
    if (/^i['’]/i.test(f)) return "I" + f.slice(1);
    return f;
  });
  // Capital at a sentence start (the first letter after a cut or of the text).
  return out.replace(/(^|[.!?]\s+|\n)(["'(¿¡]?)(\p{Ll})/gu, (_m, a: string, q: string, c: string) => a + q + c.toUpperCase());
};
// A shouted word left in a rewrite (one deShout would change).
const shoutLeft = (text: string, draft: string) => {
  const runs = shoutRuns(text, draft);
  return [...text.matchAll(CAPS_WORD_RE)].filter((m) => isShout(m[0]) && !/\d$/.test(text.slice(0, m.index ?? 0)) && shoutForm(m[0], draft, runs.has(m.index!)) !== null).map((m) => m[0]);
};

// ---- v4: shape guards on the struck result. Any hit rejects the whole candidate (-> retry, then null). ----
// Sentences of the draft with their offsets.
const sentRanges = (t: string): [number, number][] => {
  const out: [number, number][] = [];
  const re = /[^.!?\n]*(?:[.!?]+["')\]]*|\n|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) && m[0] !== "") {
    const a = m.index + (m[0].length - m[0].trimStart().length), b = m.index + m[0].trimEnd().length;
    if (b > a) out.push([a, b]);
    if (re.lastIndex >= t.length) break;
  }
  return out;
};
const SHAPE_COND = /^(?:(?:and|or|but|e|ou|mas|y|o|pero)\s+)?(?:if|unless|se|si|caso|a menos que|a no ser que|salvo que|en caso de que|no caso de)(?![\p{L}])/iu;
const SHAPE_COND_OK = /^(?:se\s+calhar|se\s+faz\s+favor|se\s+puderes|se\s+possível|if\s+possible|if\s+you\s+can|if\s+that's\s+ok|si\s+puedes|si\s+es\s+posible)\b/iu;
const SHAPE_ELSE_ONLY = /^(?:(?:or|ou|o)\s+)?(?:otherwise|or else|else|senão|senao|caso contrário|si no|sino|de lo contrario|de otro modo)$/iu;
const SHAPE_DANGLE = new Set([
  "and", "or", "but", "so", "because", "with", "to", "for", "of", "at", "from", "about", "than", "into", "the", "a", "an", "my", "your", "his",
  "her", "their", "our", "if", "unless", "when", "while", "until", "otherwise", "else", "which", "who", "that", "like",
  "e", "ou", "mas", "porque", "pois", "com", "para", "de", "do", "da", "dos", "das", "em", "na", "nas", "nos", "por", "pelo", "pela", "que", "se",
  "quando", "senão", "o", "os", "as", "um", "uma", "teu", "tua", "seu", "sua", "como",
  "y", "pero", "con", "del", "en", "si", "cuando", "sino", "el", "la", "los", "las", "un", "una", "al", "tus", "su", "sus", "mi", "mis",
]);
const SHAPE_SUBJ_EN = new Set(["i", "you", "he", "she", "they", "we", "you're", "you've", "you'll", "you'd", "i'm", "i've", "i'll", "he's", "she's", "they're", "we're"]);
const VERB_WORDS = new Set([
  // en
  "is", "are", "was", "were", "be", "been", "am", "has", "have", "had", "do", "does", "did", "will", "would", "can", "could", "should", "must",
  "may", "might", "shall", "need", "needs", "let", "get", "gets", "got", "go", "goes", "went", "come", "comes", "came", "take", "takes", "took",
  "bring", "brings", "brought", "forget", "forgets", "forgot", "leave", "leaves", "left", "miss", "misses", "pick", "picks", "drop", "pay", "pays",
  "paid", "send", "sent", "tell", "tells", "told", "say", "says", "said", "know", "knew", "make", "makes", "made", "give", "gives", "gave",
  "keep", "keeps", "kept", "put", "see", "saw", "think", "thought", "want", "wants", "lost", "broke", "starts", "ends", "finishes", "begins",
  "sat", "ran", "felt", "feels", "hurt", "hurts", "costs", "cost", "owe", "owes", "bother", "listen", "care", "remember", "help", "stop",
  // pt
  "é", "são", "está", "estás", "estão", "foi", "foram", "era", "eras", "tem", "tens", "têm", "tinha", "vai", "vais", "vou", "vão", "há",
  "fica", "ficas", "ficou", "pode", "podes", "posso", "precisa", "precisas", "preciso", "quer", "queres", "quero", "sabe", "sabes", "sei", "deve",
  "deves", "chega", "chegas", "começa", "acaba", "sai", "toma", "tomas", "faz", "fazes", "fiz", "fez", "disse", "dizes", "diz", "ligo", "liga",
  "levo", "leva", "trago", "traz", "pago", "paga", "volta", "voltou", "voltar", "esteve", "estive", "deixa", "custa", "dá", "dou",
  // es
  "es", "eres", "son", "fue", "fueron", "estás", "están", "tiene", "tienes", "tienen", "tenía", "va", "vas", "voy", "van", "hay", "puede",
  "puedes", "puedo", "necesita", "necesitas", "necesito", "quiere", "quieres", "quiero", "sé", "debe", "debes", "llega", "llegas", "empieza",
  "termina", "sale", "toca", "hace", "haces", "hice", "hizo", "dijo", "dices", "dice", "llamo", "llama", "llevo", "lleva", "traigo", "trae",
  "pago", "vuelve", "volvió", "estuvo", "deja", "cuesta", "doy", "da",
  // first person "I'll do it" forms (pt / es)
  "faço", "farei", "trato", "busco", "apanho", "compro", "resolvo", "organizo", "sou", "hago", "haré", "recojo", "arreglo", "encargo", "soy",
  "compro", "llevaré", "recogeré", "pagaré",
  // v7: reply verbs as imperatives ("E responde." / "Y contesta.")
  "responde", "respondes", "contesta", "contestas", "avisa", "avisas", "confirma", "confirmas", "reply", "answer", "confirm",
]);
const hasFiniteVerb = (s: string) => {
  const toks = s.toLowerCase().replace(/[’]/g, "'").split(/[^\p{L}']+/u).filter(Boolean);
  return toks.some((t) =>
    VERB_WORDS.has(t) || FX_KEY.some(([, re]) => re.test(t)) || /^(?:esque[çc]|olvid|atras|retras|falt|falh|lleg|cheg|lembr|acord|recuerd)\p{L}*$/u.test(t) || PLEASE_EN_VERBS.has(t) || PLEASE_PTES_VERBS.has(t) || /(?:n't|'ll|'re|'ve|'m|'d)$/.test(t) ||
    /^i'm$|^it's$|^that's$|^there's$|^he's$|^she's$/.test(t) ||
    (t.length >= 5 && /ed$/.test(t)) ||
    (t.length >= 4 && /(?:aste|este|iste|ou|eu|iu|ámos|aram|eram|iram|ava|avas|aba|abas|ió|aron|ieron|aremos|eremos|iremos|arás|erás|irás|ará|erá|irá)$/.test(t))
  );
};
const NOT_ME_OR_YOU = /(?<![\p{L}])(?:(?:wasn't|was not|isn't|it's not|not) me|it was you|you did|was you|não fui eu|nao fui eu|foste tu|foi você|tu é que|no fui yo|no he sido yo|fuiste tú|fuiste tu|has sido tú|tú eres (?:el|la) que)(?![\p{L}])/iu;
// Blame words that must not stay in a struck result (no "always" / "never": those also state not-told facts).
const STRIKE_BLAME_LEFT = wordRe(
  "typical|típico|típica|tipico|pathetic|patético|patética|obviously|clearly|as usual|como sempre|como siempre|useless|inútil|lazy|selfish|" +
  "irresponsible|irresponsável|irresponsable|do you even|did you even|you even|even bother|how hard|not that you|thanks so much|honestly|seriously|" +
  "ridiculous|ridículo|ridícula|don't care|do not care|doesn't care|não queres saber|não te importa|no te importa|te da igual|whatever|pretend|finges|" +
  "unbelievable|disgrace|vergonha|vergüenza|incompetent|incompetente|for once|por una vez|already told you|told you already|i've told you|" +
  "for the hundredth time|já te disse|como te disse|ya te lo dije|ya te dije|te lo he dicho|desastre|disaster|desleixado|desleixada|grow up|" +
  "get a grip|for god's sake|por amor de deus|por el amor de dios|é muito pedir|es mucho pedir|too much to ask|idiot|idiota|stupid|estúpido|" +
  "estúpida|parvo|parva|hopeless|a joke|uma piada|un chiste|great parenting|bom pai|boa mãe|buen padre|buena madre|como de costume|como de costumbre|" +
  "same old|sempre a mesma|siempre lo mismo|típico de ti|typical of you|you'll regret|vais arrepender|te arrepentirás|" +
  // v5: "nobody bothered to" style blame verbs and brush-offs (never left in; the strike is rejected -> null)
  "bothered to|bother to|bothering to|bothered telling|bothered letting|bothered checking|could be bothered|can't be bothered|" +
  "don't bother|do not bother|deu ao trabalho|deste ao trabalho|dês ao trabalho|dignou|dignaste|não te incomodes|" +
  "se molestó|te molestaste|te molestes|se dignó|te dignaste|tomó la molestia|tomaste la molestia|" +
  // v7: "which you'd know if you ever read the emails" and a snide "by the way" aside in a relative clause
  "which you'd know|which you would know|you'd know if|you would know if|if you ever read|if you ever checked|if you ever looked|" +
  "if you ever listened|if you ever opened|if you ever paid attention|saberias se|saberías si|se lesses os|se lesses as|si leyeras|si leyeses|" +
  "which by the way|which btw|que por cierto|que por sinal|que já agora|que a propósito|que por lo visto",
);
// v6: sarcasm left in a struck result (anywhere) or a sarcastic opener left at a sentence start.
const SARC_LEFT = wordRe(
  "love that for|gold star|well done|nice one|great job|good job|brilliant parenting|great parenting|parent of the year|father of the year|" +
  "dad of the year|mother of the year|mum of the year|thanks a lot|thanks for nothing|what a surprise|who knew|shocking|lol|lmao|🙄|" +
  "parabéns|grande ajuda|que surpresa|pai do ano|mãe do ano|obrigado por nada|obrigada por nada|muito obrigado mesmo|" +
  "qué sorpresa|que sorpresa|enhorabuena|campeón|campeona|padre del año|madre del año|gracias por nada|menuda ayuda|" +
  "work out great|that'll work|vai correr lindamente|saldrá genial|just a gentle reminder|gentle reminder|per my last message|como já disse|" +
  "como ya te dije|tão ocupado|tão ocupada|tan ocupado|tan ocupada|so busy|o pai do ano|el padre del año",
);
const SARC_OPENER = /^(?:¡|¿)?(?:oh\s+)?(?:great|wow|brilliant|fantastic|amazing|lovely|perfect|nice|cool|sure|bravo|genial|perfecto|perfeito|fantástico|fantástica|estupendo|ótimo|boa|claro|ah\s+claro|ah,\s+claro|muy bien|muito bem|vaya|olha)(?=[\s,.!?]|$)/iu;
// A fragment left after a cut: an EN sentence that now opens on a gerund, a past-tense verb, or a joiner/preposition with
// no subject ("[Great job] forgetting her bag." / "[Gold star] for remembering."); PT/ES: a gerund or a joiner.
const FRAG_EN_PAST = new Set(["forgot", "forgetting", "missed", "left", "sent", "lost", "broke", "ignored", "remembered", "turned", "came", "went", "showed", "managed", "decided", "let", "made", "gave", "took", "brought"]);
const FRAG_JOIN = new Set(["for", "to", "with", "because", "which", "who", "that", "and", "but", "so", "of", "by", "como", "para", "por", "com", "con", "que", "porque", "y", "e", "pero", "mas", "de"]);
const fragStart = (s: string) => {
  const w = (s.replace(/^[¿¡"'(\s]+/, "").match(/^[\p{L}'’-]+/u)?.[0] ?? "").toLowerCase().replace(/’/g, "'");
  if (!w) return "";
  if (FRAG_JOIN.has(w)) return w;
  if (/^[a-z]+ing$/.test(w) && w.length > 5 && !/^\S+\s+(?:is|was|are|were|has|isn't|wasn't|will|won't|can|can't|should|must|needs|takes|counts|helps|matters|starts|finishes|ends)\b/i.test(s.replace(/^[¿¡"'(\s]+/, "")) && !/^(?:morning|evening|thing|nothing|something|anything|everything|swimming|spring|king|ring|wedding|building|during|training|bring|sing)$/.test(w)) return w;
  if (FRAG_EN_PAST.has(w) || (/^[a-z]{4,}ed$/.test(w) && !/^(?:need|speed|bed|seed|feed|shed|red|wed)$/.test(w))) return w;
  // PT/ES gerunds; first-person verbs and names that end the same way are not fragments.
  if (/^\p{L}{4,}(?:ando|endo|indo)$/u.test(w) && !/^(?:fernando|orlando|armando|rolando|rosendo|entiendo|comprendo|pretendo|recomiendo|defiendo|aprendo|sorprendo|enciendo|desciendo|atiendo|extiendo|ofendo|dependo|recomendo|compreendo|surpreendo|estendo|acendo)$/.test(w)) return w;
  return "";
};
// v6b: only right after a cut that opens a sentence: a PT/ES infinitive ("[Achas normal] ela voltar ...", "[Gracias a tu
// idea de] dejarle el móvil ..."), a verbless "Another Monday where ..." / "Otra vez sin la mochila.".
const INF_NOT = /^(?:lugar|mar|par|bar|por|ser|ver|mujer|taller|alquiler|azúcar|hogar|mayor|menor|mejor|peor|amor|dolor|calor|color|favor|señor|senhor|doctor|doutor|motor|tutor|interior|exterior|anterior|posterior|superior|inferior|flor|mar|oscar|óscar|amir|ester|esther|pilar|edgar|baltasar|gaspar|cesar|césar|víctor|vitor|héctor|nestor|néstor|aitor|igor|leonor|lior|tamar|omar|samir|yasir|naomir)$/u;
const EN_ER = /^(?:never|remember|after|other|either|neither|whether|under|dinner|water|rather|later|sooner|together|their|clear|number|whatever|however|wherever|whenever|consider|deliver|register|order|enter|offer|answer|cover|gather|matter|wonder|summer|winter|similar|regular|particular|popular|dollar|sugar|calendar|grammar|seminar|chair|stair|repair|affair|unfair|teacher|mother|father|brother|sister|daughter|another|letter|better|monster|poster|charger|player|trainer|sweater|jumper|counter|corner|paper|super|member|partner|lawyer|doctor|mujer|jantar|almoçar|lanchar|colher|mulher|prazer|poder|haber|placer|deber)$/;
const fragAfterCut = (s: string) => {
  const t = s.replace(/^[¿¡"'(\s]+/, "");
  if (/^(?:another|yet another|otra vez sin|otro día (?:sin|más)|de novo sem|outra vez sem|mais um dia (?:sem|em que)|again without)(?![\p{L}])/iu.test(t)) return "another";
  const w = (t.match(/^[\p{L}]+/u)?.[0] ?? "").toLowerCase();
  if (w.length >= 5 && /^\p{Ll}/u.test(t) && /(?:ar|er|ir|ír)(?:le|la|lo|les|las|los|me|te|se|nos)?$/u.test(w) && !INF_NOT.test(w) && !EN_ER.test(w)) return w;
  if (w.length >= 5 && /(?:ar|er|ir)(?:-(?:lhe|lo|la|me|te|se|nos))$/u.test(t.match(/^[\p{L}-]+/u)?.[0]?.toLowerCase() ?? "")) return w;
  return "";
};
const CUT_COMPLEMENT = new Set(["que", "that", "whether", "if", "si", "se", "de", "normal"]);
// What follows a cut "que / that / normal" is only a tail when it opens on a bare verb ("vuelva con fiebre") or a pronoun
// plus an infinitive ("ela voltar com piolhos"); "A Matilde voltou ..." / "the bag is ..." is a whole clause and stays.
const DET_PRON = new Set(["a", "o", "as", "os", "el", "la", "los", "las", "the", "his", "her", "my", "your", "their", "our", "this", "that", "um", "uma", "un", "una", "meu", "minha", "mi", "tu", "tú", "you", "i", "he", "she", "they", "we", "it", "eu", "yo", "ele", "ela", "él", "ella", "eles", "elas", "ellos", "ellas", "ninguém", "nadie", "nobody", "no", "não", "isto", "esto", "eso", "isso"]);
const complementTail = (s: string) => {
  const ws = s.replace(/^[¿¡"'(\s]+/, "").split(/\s+/);
  const w0 = (ws[0] ?? "").replace(/[^\p{L}'’-]/gu, "");
  if (!w0 || /^\p{Lu}/u.test(w0) && !/^(?:Ela|Ele|Él|Ella|He|She|They|You)$/.test(w0)) return false;
  const l0 = w0.toLowerCase();
  if (SUBJ_PRON.has(l0)) return !!fragAfterCut(ws.slice(1).join(" "));
  return !DET_PRON.has(l0);
};
const REL_START = /^(?:which|who|that|que|quien|quem|o qual|a qual|el cual|la cual|lo cual)(?![\p{L}])/iu;
const CONNECTOR_ONLY = /^(?:so|and|then|and then|but|así que|asi que|entonces|por eso|y|e|pero|mas|então|por isso|portanto)$/iu;
const SUBJ_PRON = new Set(["you", "he", "she", "they", "we", "i", "tu", "tú", "ele", "ela", "él", "ella", "eles", "ellos", "nós", "nosotros"]);
// Who did what, for guard 2: each deed verb (FX_KEY) with its doer, found before it (skipping auxiliaries, "who/que/quien"
// pointing back to the doer), from a PT/ES person ending, or from "it was you / foste tu / fuiste tú" in the same sentence.
// Deeds inside an "If/Se/Si" clause or a threat are hypothetical and skipped.
const ACTOR_SKIP = new Set([...FX_SUBJ_SKIP, "who", "that", "que", "quien", "quem", "the", "one", "el", "la", "o", "a", "were", "was", "is", "are", "really", "actually", "completely", "it",
  // v5: "you've been late" / "he had forgotten": the auxiliary sits between the doer and the deed.
  "been", "be", "being", "have", "has", "had", "always", "often", "ever"]);
const ACTOR_ROLE: Record<string, string> = {
  you: "other", "você": "other", voce: "other", tu: "other", "tú": "other", usted: "other", ti: "other",
  i: "self", me: "self", eu: "self", yo: "self", mim: "self", "mí": "self",
  he: "third", she: "third", they: "third", ele: "third", ela: "third", eles: "third", elas: "third", "él": "third", ella: "third", ellos: "third", ellas: "third",
};
const IT_WAS = /(?:it was you|was you|you did|foste tu|foi você|fuiste tú|fuiste tu|has sido tú|it was me|fui eu|fui yo)(?![\p{L}])/iu;
const COMMIT_SELF = new Set(["faço", "farei", "hago", "haré", "encargo", "encarrego"]);
const COMMIT_PTES = new Set(["levo", "trato", "pago", "busco", "apanho", "resolvo", "llevo", "recojo", "arreglo", "organizo", "compro"]);
const COMMIT_EN = new Set(["do", "sort", "handle", "deal", "fix", "pay", "organise", "organize", "arrange", "pick", "take", "bring", "collect", "drop", "book", "buy", "cover", "fill", "sign"]);
const actorDeeds = (text: string, names: Set<string>) => {
  const out: { key: string; role: string }[] = [];
  for (const sent of fxSentences(text)) {
    if (fxIsThreat(sent)) continue;
    const itWas = sent.match(IT_WAS)?.[0].toLowerCase() ?? "";
    const wasRole = itWas ? (/(?:me|eu|yo)$/.test(itWas) ? "self" : "other") : "";
    for (const clause of sent.split(/\s*[,;:]\s*/)) {
      if (SHAPE_COND.test(clause.replace(/^[¿¡"'(]+/, ""))) continue;
      const raw = clause.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean);
      const toks = raw.map((w) => w.toLowerCase().replace(/[’]/g, "'").replace(/'(ve|ll|d|re|s|m)$/, ""));
      toks.forEach((t, i) => {
        let hit = FX_KEY.find(([, re]) => re.test(t));
        // v5: "ya lo hago yo" / "faço eu" / "I'll do it": a first-person commitment is a deed whose doer must stay.
        if (!hit && COMMIT_SELF.has(t)) { out.push({ key: "commit", role: "self" }); return; }
        if (!hit && COMMIT_PTES.has(t) && toks.some((w) => w === "eu" || w === "yo")) { out.push({ key: "commit", role: "self" }); return; }
        if (!hit && COMMIT_EN.has(t)) {
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            if (toks[j] === "i") { out.push({ key: "commit", role: "self" }); return; }
            if (!/^(?:just|will|always|then|also|have|had|going|to|am)$/.test(toks[j])) break;
          }
          return;
        }
        if (!hit || (i > 0 && toks[i - 1] === "to")) return;
        let role = "";
        for (let j = i - 1; !role && j >= Math.max(0, i - 6); j--) {
          if (ACTOR_SKIP.has(toks[j])) continue;
          if (ACTOR_ROLE[toks[j]]) role = ACTOR_ROLE[toks[j]];
          else if (names.has(toks[j]) || (/^\p{Lu}\p{Ll}+$/u.test(raw[j]) && !CAP_SKIP.has(toks[j]))) role = "name:" + toks[j];
          else break;
        }
        if (!role) {
          if (/(?:aste|iste|este)$/.test(stripAccents(t))) role = "other";
          else if (/(?:ei|é|í)$/.test(t) || /^(?:esqueci|perdi)$/.test(t)) role = "self";
        }
        if (wasRole && (!role || role === "self")) role = wasRole; // "It wasn't me who forgot it, it was you."
        if (role) out.push({ key: hit[0], role });
      });
    }
  }
  return out;
};
// Returns problem notes; empty = the shape is fine.
const strikeShape = (draft: string, ranges: [number, number][], text: string): string[] => {
  const out: string[] = [];
  const names = draftNames(draft);
  // v6: a clause ending on a number ("a las 9") ends on the number, not on the word before it.
  const lastTok = (s: string) => (s.toLowerCase().replace(/[’]/g, "'").match(/[\p{L}\p{N}'-]+(?=[^\p{L}\p{N}]*$)/u)?.[0] ?? "");
  // (1d) A subject struck right before its verb: "[You] forgot her bag" -> "Forgot her bag".
  for (const [a, b] of ranges) {
    const struckLast = lastTok(draft.slice(a, b));
    const after = draft.slice(b);
    // Only a strike that ends on the pronoun itself (no comma after it) and runs into a lower-case word.
    if ((SHAPE_SUBJ_EN.has(struckLast) || names.has(struckLast)) && /\p{L}$/u.test(draft.slice(a, b).trimEnd()) && /^\s*\p{Ll}/u.test(after) && !/^\s*(?:and|or|but|e|ou|y|o)\b/iu.test(after))
      out.push(`no_subject: the strike "${draft.slice(a, b).trim()}" takes the subject of "${after.trim().split(/\s+/).slice(0, 3).join(" ")}"`);
  }
  const touchedDeedsLost: { key: string; role: string }[] = [];
  let notMeStruck = false;
  for (const [s, e] of sentRanges(draft)) {
    const local = ranges.filter(([a, b]) => a < e && b > s).map(([a, b]) => [Math.max(a, s) - s, Math.min(b, e) - s] as [number, number]);
    if (!local.length) continue;
    const orig = draft.slice(s, e);
    for (const [a, b] of local) if (NOT_ME_OR_YOU.test(orig.slice(a, b))) notMeStruck = true;
    const r = strikeSpans(orig, [], local);
    const rem = r.ok ? r.text.trim() : "";
    // (2) deeds that lose who did them in this sentence
    const dOrig = actorDeeds(orig, names), dRem = rem ? actorDeeds(rem, names) : [];
    for (const d of dOrig) if (!dRem.some((x) => x.key === d.key && x.role === d.role)) touchedDeedsLost.push({ key: d.key, role: d.role });
    if (!rem) continue;
    const clauses = rem.replace(/[.!?…]+["')\]]*$/u, "").split(/\s*[,;:–]\s*|\s+-\s+/).map((c) => c.trim().replace(/^[¿¡"'(]+/, "")).filter(Boolean);
    // (1a) A hanging conditional: "If you're late again." / "..., and if you don't."
    const firstCond = clauses.length && SHAPE_COND.test(clauses[0]) && !SHAPE_COND_OK.test(clauses[0]);
    const lastAndIf = clauses.length > 1 && /^(?:and|or|e|ou|y|o)\s+(?:if|se|si|unless|caso)(?![\p{L}])/iu.test(clauses[clauses.length - 1]);
    if ((firstCond && clauses.length === 1) || (firstCond && clauses.slice(1).every((c) => SHAPE_COND.test(c) || !hasFiniteVerb(c))) || lastAndIf)
      out.push(`hanging_conditional: "${rem}" is an if-clause with no main clause; strike the whole threat sentence or nothing`);
    if (clauses.some((c) => SHAPE_ELSE_ONLY.test(c))) out.push(`dangling: "${rem}" keeps an "otherwise" with nothing after it`);
    // (1c) A cut that ends a clause right after a joiner, preposition or article: "... at 2pm with [cut]." -> "... with."
    for (const [a, b] of local) {
      const lt = lastTok(orig.slice(0, a).replace(/[\s,;:–-]+$/u, ""));
      if (!lt || !SHAPE_DANGLE.has(lt) || !/^\s*(?:[.!?;:,]|$)/u.test(orig.slice(b))) continue;
      if (clauses.some((c) => lastTok(c) === lt)) out.push(`dangling: "${rem}" now ends a clause on "${lt}"`);
    }
    // (1b) No finite verb left where the sentence had one.
    if (local.some(([a, b]) => hasFiniteVerb(orig.slice(a, b))) && !hasFiniteVerb(rem)) out.push(`no_verb: "${rem}" is left with no verb`);
  }
  // (2) Who did it: a deed whose doer was struck must still be said (same deed, same person) somewhere in the result.
  const dText = actorDeeds(text, names);
  for (const d of touchedDeedsLost) {
    if (!dText.some((x) => x.key === d.key && x.role === d.role))
      out.push(`actor_dropped: the strike removes who did "${d.key}" (${d.role}); keep who did it`);
  }
  // (2) A struck "not me / it was you" must not take the only mention of who did a deed the draft reports.
  if (notMeStruck && !dText.some((x) => x.role === "other"))
    out.push(`actor_dropped: the struck "not me / it was you" was the only mention of who did it`);
  // (1e) v6: a cut that leaves a kept sentence opening on a fragment (no subject): "[Great job] forgetting her bag."
  for (const [a, b] of ranges) {
    const before = draft.slice(0, a).replace(/[\s"'(]+$/u, "");
    const after = draft.slice(b);
    const cut = draft.slice(a, b).trim();
    // Only a cut that opens a sentence (or is a sarcastic opener) and stops mid-sentence.
    if (!(before === "" || /[.!?…]$/.test(before) || SARC_OPENER.test(cut))) continue;
    if (/[.!?…]["')\]]*$/u.test(cut)) continue;
    const nextSent = after.replace(/^[\s,;:–-]+/u, "");
    if (!nextSent || /^[.!?]/.test(nextSent)) continue;
    const f = fragStart(nextSent) || fragAfterCut(nextSent);
    if (f) out.push(`no_subject: the cut leaves a sentence opening on "${f}" with no subject`);
    // v6b: an opening cut that ends on "que / that / de": what is left is the tail of its sentence.
    else if (CUT_COMPLEMENT.has(lastTok(cut)) && complementTail(nextSent)) out.push(`no_subject: the cut ends on "${lastTok(cut)}" and leaves its clause`);
  }
  // v6b: mid-sentence cuts that break the clause around them.
  for (const [a, b] of ranges) {
    const cut = draft.slice(a, b).trim();
    const before = draft.slice(0, a), after = draft.slice(b);
    const midBefore = /[\p{L}\p{N}€£%)]["'’]?[,]?\s*$/u.test(before) && !/[.!?…]\s*$/.test(before);
    const midAfter = /^\s*[\p{L}\p{N}]/u.test(after);
    if (!midBefore || !midAfter) continue;
    // "..., which by the way still smells" -> "..., still smells": the relative pronoun was the subject.
    if (REL_START.test(cut) && !/[,.;:!?…]$/.test(cut)) out.push(`no_subject: the cut "${cut.split(/\s+/)[0]}" takes the subject of what follows`);
    // "... lo ignoraste [así que] necesito ...": only the joiner was cut, so two clauses run together.
    if (CONNECTOR_ONLY.test(cut.replace(/[,]+$/, ""))) out.push(`dangling: only the joiner "${cut}" was cut`);
    // "the ones you [somehow managed] not to give her": a subject pronoun now runs into "not / to / the".
    const prev = lastTok(before.replace(/[\s,]+$/u, ""));
    const next = (after.trim().match(/^[\p{L}'’]+/u)?.[0] ?? "").toLowerCase();
    if (SUBJ_PRON.has(prev) && /^(?:not|to|the|a|an|não|no|a|o|el|la)$/.test(next) && !/^(?:not|to)$/.test(lastTok(cut)))
      out.push(`no_verb: the cut leaves "${prev} ${next}" with no verb`);
  }
  // v7 (1): a cut inside a sentence must leave a complete clause. The words right after a cut that took a verb clause
  // must start a new clause (a joiner, punctuation or a verb); a tail such as "every single weekend" left hanging off
  // the clause before it is refused. And no comma clause may be left without a verb unless the draft had it as written.
  const JOIN_NEXT = /^(?:and|so|but|or|because|then|cause|e|ou|mas|porque|pois|então|entao|por isso|portanto|y|o|pero|así que|asi que|entonces|por eso|porque|que|which|who|when|while|until|before|after|if|unless|antes|depois|quando|cuando|hasta|até|se|si|please|por favor|can|could|will|would|podes|puedes)(?![\p{L}])/iu;
  for (const [a, b] of ranges) {
    const cut = draft.slice(a, b);
    const before = draft.slice(0, a), after = draft.slice(b);
    if (/[.!?…]\s*$/.test(before) || before.trim() === "" || !/^\s*[\p{L}\p{N}£€$]/u.test(after)) continue;
    if (/[.!?…]["')\]]*\s*$/u.test(cut)) continue;
    if (!hasFiniteVerb(cut)) continue;
    const nextSeg = after.trim().split(/[,;:.!?…]/u)[0].trim();
    if (!nextSeg || JOIN_NEXT.test(nextSeg)) continue;
    const segToJoin = nextSeg.split(new RegExp("\\s+(?=(?:and|so|but|or|because|e|ou|mas|porque|por isso|y|pero|así que|por eso)(?![\\p{L}]))", "iu"))[0];
    if (!hasFiniteVerb(segToJoin)) out.push(`dangling: the cut leaves "${segToJoin.split(/\s+/).slice(0, 3).join(" ")}" cut off from its verb`);
  }
  for (const [s, e] of sentRanges(draft)) {
    const local = ranges.filter(([a, b]) => a < e && b > s).map(([a, b]) => [Math.max(a, s) - s, Math.min(b, e) - s] as [number, number]);
    if (!local.length) continue;
    const orig = draft.slice(s, e);
    const r = strikeSpans(orig, [], local);
    const rem = r.ok ? r.text.trim() : "";
    if (!rem) continue;
    const seg = (t: string) => t.replace(/[.!?…]+["')\]]*$/u, "").split(/\s*[,;:–]\s*/).map((c) => normText(c).replace(/^[¿¡"'(]+/, "")).filter(Boolean);
    const origSegs = new Set(seg(orig));
    for (const c of seg(rem)) {
      if (origSegs.has(c) || hasFiniteVerb(c) || c.split(/\s+/).length < 2) continue;
      // A new verbless comma clause made by the cut: "..., every single weekend," / "..., and his."
      // the tail of a clause the draft had, whose verb was in the struck head: "[and I can't keep doing this] every single weekend,"
      if (/^(?:and|e|y|or|ou|o)\s/.test(c)) continue;
      if ([...origSegs].some((o) => o !== c && o.endsWith(" " + c) && hasFiniteVerb(o.slice(0, o.length - c.length))))
        out.push(`dangling: "${c.split(/\s+/).slice(0, 3).join(" ")}" is a comma clause left without its verb`);
    }
  }
  // v7.1 (1c): a relative clause is struck whole or not at all; cutting only its opener (", which by the way") leaves
  // its verb ("still smells") glued to the clause before it.
  for (const [a, b] of ranges) {
    const cut = draft.slice(a, b), before = draft.slice(0, a), after = draft.slice(b);
    if (!/^\s*,?\s*(?:which|who|whom|whose|que|quien|quienes|cuyo|cuya|onde|donde)(?![\p{L}])/iu.test(cut)) continue;
    if (!/,\s*$/.test(before) && !/^\s*,/.test(cut)) continue;
    if (!/^\s*[\p{L}\p{N}£€$]/u.test(after) || /[,;:.!?…]["')\]]*\s*$/u.test(cut) || JOIN_NEXT.test(after.trim())) continue;
    out.push(`dangling: the cut takes "${cut.trim().split(/\s+/).slice(0, 2).join(" ")}" but leaves the rest of its clause`);
  }
  // v7.1 (1d): a cut that leaves two joiners side by side that do not go together ("y así que", "and but", "e mas").
  const BAD_JOIN = /(?<![\p{L}])(?:y|e|and|o|or|ou)\s+(?:así que|asi que|pero|but|mas|porém|sin embargo|aunque|although|however)(?![\p{L}])/giu;
  const joinCount = (t: string) => (t.toLowerCase().match(BAD_JOIN) ?? []).length;
  if (joinCount(text) > joinCount(draft)) out.push(`dangling: the cut leaves two joiners side by side`);
  // v7 (2): a subject pronoun ("e tu", "and you", "y tú") left with no verb before the next clause.
  const SUBJ_ANY = new Set([...SUBJ_PRON, "eu", "yo", "nós", "nosotros", "vocês", "ustedes", "você", "usted", "elas", "ellas", "they"]);
  for (const [a, b] of ranges) {
    const before = draft.slice(0, a), after = draft.slice(b);
    if (/[.!?…]\s*$/.test(before) || before.trim() === "") continue;
    const prevM = before.replace(/\s+$/u, "").match(/(?:^|[^\p{L}'’])([\p{L}'’]+)$/u);
    const prev = (prevM?.[1] ?? "").toLowerCase();
    if (!SUBJ_ANY.has(prev) || /,\s*$/.test(before)) continue;
    // Only a pronoun that opens its clause ("..., e tu [cut]"); "ya lo hago yo [cut]" already has its verb.
    const clauseHead = before.replace(/\s+$/u, "").slice(0, -prev.length).split(/[,;:.!?…]/u).pop() ?? "";
    const afterJoin = clauseHead.split(/(?<![\p{L}])(?:and|so|but|or|because|e|ou|mas|porque|y|pero|que|that)(?![\p{L}])/iu).pop() ?? "";
    if (hasFiniteVerb(afterJoin) || /(?<![\p{L}])(?:fui|foste|foi|fomos|foram|fuiste|fue|fuimos|fueron|sou|és|soy|eres|somos|estás|estoy|estou)\s*$/iu.test(afterJoin)) continue;
    // "Did you [even] check" / "you [just] forgot": the verb is still right after the cut.
    const nextWords = after.trim().split(/[,;:.!?…]/u)[0].trim();
    const firstNext = (nextWords.match(/^[\p{L}'’]+/u)?.[0] ?? "").toLowerCase();
    if (nextWords && !JOIN_NEXT.test(nextWords) && hasFiniteVerb(firstNext)) continue;
    if (nextWords && !JOIN_NEXT.test(nextWords) && !hasFiniteVerb(draft.slice(a, b))) continue;
    out.push(`no_verb: the cut leaves the subject "${prev}" with no verb`);
  }
  // (1f) v6: any sentence of a struck result that opens on a subject-less verb ("Forgot the bag again.", "Leaving her
  // coat at yours, again.") is a fragment; the sarcasm it hung from is gone, so the result is refused.
  for (const sent of fxSentences(text)) {
    const f = fragStart(sent);
    if (f && !FRAG_JOIN.has(f)) out.push(`no_subject: a sentence opens on "${f}" with no subject`);
  }
  // (3) Blame words left in the result.
  for (const sent of fxSentences(text)) {
    const m = normText(sent).match(STRIKE_BLAME_LEFT);
    const sarc = normText(sent).match(SARC_LEFT);
    const sigh = new RegExp(`^(?:${SIGH_WORDS})\\b[^.!?]{0,80}?${SIGH_MARTYR}`, "iu").test(sent.trim());
    const dig = sent.match(DIG_LEFT_RE);
    if (m) out.push(`blame_left: "${sent}" still has "${m[0].trim()}"`);
    else if (dig) out.push(`blame_left: "${sent}" still has the dig "${dig[0].trim()}"`);
    else if (sarc) out.push(`sarcasm_left: "${sent}" still has "${sarc[0].trim()}"`);
    else if (SARC_OPENER.test(sent.trim()) && !/^(?:sure|claro|boa|ótimo|perfect|perfecto|perfeito|great|genial|lovely|cool|nice)[,.!]?\s+(?:thanks|thank you|obrigad[oa]|gracias|see you|até|hasta|that works|works for me|combinado|de acuerdo)/iu.test(sent.trim())) out.push(`sarcasm_left: "${sent}" opens on a sarcastic word`);
    else if (sigh) out.push(`blame_left: "${sent}" is a sigh before a martyr line`);
    else if (fxIsThreat(sent)) out.push(`blame_left: "${sent}" is still a threat`);
  }
  return [...new Set(out)];
};

// v6: "reason" / "reasons" carry only codes from REASON_CODES (never draft text, spans or snippets).
const logSend = (outcome: string, reasons: string[], attempts: number, started: number, timing: Record<string, number> = {}) => {
  const codes = reasonCodes(reasons);
  console.log(JSON.stringify({ fn: "chat-rewrite-strike", event: "calm_check", outcome, reason: codes[0] ?? outcome, reasons: codes, attempts, ms: Date.now() - started, ...timing }));
};
// v6: every await before the model calls is capped too, so nothing can hold a send past SEND_HARD_STOP_MS.
const capped = <T,>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p.finally(() => clearTimeout(t)), new Promise<T>((r) => { t = setTimeout(() => r(onTimeout), Math.max(0, ms)); })]);
};
const TIMED_OUT = Symbol("timed_out");
const NON_SEND_CAP_MS = 8000;

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
    // v6: the body read is capped; a body that does not arrive in time is treated as a send with nothing to check.
    const body = await capped(req.json().catch(() => ({})), SEND_HARD_STOP_MS - 300, { mode: "send", draft: null, _timeout: true });
    const { draft, mode } = body ?? {};
    const unavailable = () => json({ error: "entitlement_unavailable" }, 503);

    // Status mode: no draft, no AI call, no logging, no DB writes. Auth is always checked.
    if (mode === "status") {
      const denied = await capped(requirePremium(req, "rewrite"), NON_SEND_CAP_MS, unavailable());
      if (denied && (denied.status === 401 || denied.status === 503)) return denied;
      return json({
        requires_premium: CALM_CHECK_REQUIRES_PREMIUM,
        has_access: !CALM_CHECK_REQUIRES_PREMIUM || denied === null,
      });
    }

    // send: signed-in check first (no model call before the user is confirmed), then the Premium check runs
    // alongside the model calls; its answer is awaited before any response, so the 402 gate still comes first.
    // Any other mode: Premium first, then 400 (this prototype only serves status and send).
    const timing: Record<string, number> = {};
    let premiumCheck: Promise<Response | null> = Promise.resolve(null);
    if (mode === "send") {
      if ((body as { _timeout?: boolean })._timeout) { logSend("fallback", ["timeout"], 0, started); return json({ needs_rewrite: false, rewrite: null }); }
      // v6: sign-in is capped at the hard stop. A sign-in that does not answer in time gets the plain pass (no model call
      // was made, so nothing is shown or logged from a draft).
      const signedOut = await capped<Response | null | typeof TIMED_OUT>(requireSignedIn(req), started + SEND_HARD_STOP_MS - 150 - Date.now(), TIMED_OUT);
      timing.auth_ms = Date.now() - started;
      if (signedOut === TIMED_OUT) { logSend("fallback", ["timeout"], 0, started, timing); return json({ needs_rewrite: false, rewrite: null }); }
      if (signedOut) return signedOut;
      if (CALM_CHECK_REQUIRES_PREMIUM) {
        const p0 = Date.now();
        premiumCheck = requirePremium(req, "rewrite").then((d) => { timing.premium_ms = Date.now() - p0; return d; });
      }
    } else {
      const denied = await capped(requirePremium(req, "rewrite"), NON_SEND_CAP_MS, unavailable());
      if (denied) return denied;
      return json({ error: "Unsupported mode" }, 400);
    }
    // v6: from here on every wait on the Premium check is capped at the hard stop (it was awaited uncapped before the race).
    const premiumCapped = () => capped<Response | null | typeof TIMED_OUT>(premiumCheck, started + SEND_HARD_STOP_MS - Date.now(), TIMED_OUT);

    if (!draft || typeof draft !== "string" || draft.length > 4000) {
      const denied = await premiumCapped();
      if (denied === TIMED_OUT) return json({ needs_rewrite: false, rewrite: null });
      if (denied) return denied;
      return json({ error: "Missing draft" }, 400);
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      const denied = await premiumCapped();
      if (denied === TIMED_OUT) return json({ needs_rewrite: false, rewrite: null });
      if (denied) return denied;
      return json({ error: "AI not configured" }, 500);
    }

    const pass = { needs_rewrite: false, rewrite: null };
    const deadline = started + SEND_DEADLINE_MS;
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
      const messages = [
        { role: "system", content: STRIKE_SYSTEM },
        { role: "user", content: draft },
      ];
      type Got =
        | { kind: "timeout" | "parse" }
        | { kind: "error"; resp: Response }
        | { kind: "none" }
        | { kind: "cand"; raw: string; text: string; problems: string[]; codeOnly?: boolean; pleaseFrom?: number };
      // Code strikes: fixed reproach phrases and the jab "again", whatever the model returns.
      const fixed = strikeFixed(draft);
      // v4: shouted words are lower-cased by code (acronyms, names and brands kept).
      const shout = hasShout(draft);
      // Apply the strikes and run every guard. Any problem rejects the whole candidate; it is never partly applied.
      // The model's spans are guarded one by one; the fixed code strikes are not (they are whole reproach phrases),
      // but the whole result still goes through every check.
      const judge = (raw: string, strikes: string[]): Got => {
        const spans = strikes.filter((s) => typeof s === "string" && s.trim());
        if (!spans.length && !fixed.ranges.length && !shout) return { kind: "none" };
        // v7: grudging tails ("if you can fit it in") are struck only with another strike.
        const fw = fixedWith(fixed, spans);
        const st = strikeSpans(draft, spans, fw.ranges);
        if (!st.ok) return { kind: "cand", raw, text: "", problems: [st.reason ?? "span_not_found"] };
        const g = strikeGuard(draft, spans);
        if (g.length) return { kind: "cand", raw, text: st.text, problems: g };
        // Nothing (or almost nothing) left: the draft is all blame, so there is nothing to send in its place.
        if (st.ranges.length && strikeTooSmall(draft, st.text)) return { kind: "none" };
        const text = shout ? deShout(st.text, draft) : st.text;
        // v4 shape guards: no fragment, no lost doer, no blame left, no shouting left. Any hit rejects the candidate.
        const shape = strikeShape(draft, st.ranges, text);
        const loud = shoutLeft(text, draft);
        if (loud.length) shape.push(`shout_left: ${loud.join(", ")}`);
        if (shape.length) return { kind: "cand", raw, text, problems: shape };
        const c = strikeCheck(draft, text, spans, fw.jab);
        // codeOnly: the model struck nothing and only the fixed phrases / capitals changed; such a result never wins at once.
        // v6: the model gets the notes on a retry; the log gets only the codes (see logSend).
        return { kind: "cand", raw, text, problems: c.codes.length ? c.notes.length ? [...c.codes, ...c.notes] : c.codes : [], codeOnly: !spans.length, pleaseFrom: pleaseFrom(draft, st.ranges) };
      };
      const ask = async (msgs: unknown[], maxTokens: number, signal: AbortSignal): Promise<Got> => {
        if (signal.aborted) return { kind: "timeout" };
        let resp: Response;
        const m0 = Date.now();
        try {
          resp = await callGateway(apiKey, { ...sendModel(maxTokens), response_format: STRIKE_SCHEMA, messages: msgs }, signal);
          if (timing.model_ms === undefined) timing.model_ms = Date.now() - m0;
        } catch {
          return { kind: "timeout" };
        }
        const err = gatewayError(resp);
        if (err) return { kind: "error", resp: err };
        let raw = "";
        let parsed: { strikes?: unknown };
        try {
          const data = await resp.json();
          raw = data.choices?.[0]?.message?.content ?? "";
          parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
        } catch {
          return { kind: signal.aborted ? "timeout" : "parse" };
        }
        if (!Array.isArray(parsed?.strikes)) return { kind: "parse" };
        return judge(raw, parsed.strikes as string[]);
      };
      const ctrls = Array.from({ length: SEND_FIRST_CALLS }, () => new AbortController());
      const onAbort = () => ctrls.forEach((c) => c.abort());
      sendCtrl.signal.addEventListener("abort", onAbort);
      const isWin = (f: Got) => f.kind === "cand" && !f.problems.length && !f.codeOnly;
      const isCodeOnlyPass = (f: Got) => f.kind === "cand" && !f.problems.length && f.codeOnly === true;
      const all: Got[] = [];
      const first: Got = await new Promise<Got>((resolve) => {
        let done = 0;
        ctrls.forEach((c) => {
          ask(messages, 400, c.signal).then((f) => {
            all.push(f);
            done++;
            if (isWin(f)) {
              ctrls.forEach((o) => { if (o !== c) o.abort(); });
              resolve(f);
            } else if (done === ctrls.length) {
              // A code-only result is used only when every call struck nothing itself (the model saw no other blame).
              resolve((all.every(isCodeOnlyPass) ? all[0] : undefined) ?? all.find((x) => x.kind === "none") ?? all.find((x) => x.kind === "cand") ?? all.find((x) => x.kind === "parse") ?? all.find((x) => x.kind === "error") ?? all[0]);
            }
          });
        });
      });
      sendCtrl.signal.removeEventListener("abort", onAbort);
      if (first.kind === "timeout" || first.kind === "parse") {
        log("fallback", [first.kind], 1);
        return json(pass);
      }
      if (first.kind === "error") return first.resp;
      if (first.kind === "none") {
        log("pass", [], 1);
        return json(pass);
      }
      let got: Got = first;
      let attempts = 1;
      if (first.problems.length) {
        if (deadline - Date.now() < SEND_RETRY_MIN_LEFT_MS) {
          log("fallback", ["no_time_for_retry"], attempts);
          return json(pass);
        }
        attempts = 2;
        got = await ask([
          ...messages,
          { role: "assistant", content: first.raw },
          {
            role: "user",
            content: `Those strikes failed these checks:\n- ${first.problems.join("\n- ")}\nList the strikes again. Copy each one exactly from the draft. Never strike a fact, name, number, time, place, medicine, rule, agreement, repetition word, real request or who did something; strike only the blame around them, and never leave a broken sentence (strike a whole sentence or leave it). Return only JSON {"strikes":[...]}.`,
          },
        ], 300, sendCtrl.signal);
        if (got.kind !== "cand" || got.problems.length) {
          log("fallback", ["retry_" + got.kind, ...first.problems, ...(got.kind === "cand" ? got.problems : [])], attempts);
          return json(pass);
        }
      }
      if (got.kind !== "cand") return json(pass);
      // The one word code may add: "Please" / "Por favor" before an ask the parent already wrote, if none is there.
      // v6: "Please" only for an ask in or after the first struck span; nothing struck (capitals only) -> never.
      const rewrite = addPlease(got.text, got.pleaseFrom ?? Infinity);
      log("rewrite", rewrite === got.text ? [] : ["please_added"], attempts);
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
    let denied: Response | null | typeof TIMED_OUT;
    try {
      // v6: capped at the hard stop; before v6 this await sat outside the race, so a slow Premium lookup held the reply.
      denied = await premiumCapped();
    } catch (e) {
      settled = true; clearTimeout(hardTimer); clearTimeout(deadlineTimer); sendCtrl.abort();
      throw e;
    }
    if (denied === TIMED_OUT) {
      // Premium not confirmed in time: the model reply is thrown away and the plain pass goes back.
      settled = true; clearTimeout(hardTimer); clearTimeout(deadlineTimer); sendCtrl.abort();
      logSend("fallback", ["timeout"], 0, started, timing);
      return json(pass);
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
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});