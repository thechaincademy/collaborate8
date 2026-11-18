import { SHARED_PAUSE_NOTICE, SUITABILITY_QUESTIONS, type SuitabilityQuestionCopy } from "@/content/safeguarding";

export type AnswerValue = "yes" | "no" | "unsure" | "prefer_not";
export type AnswerMap = Partial<Record<"q1" | "q2" | "q3" | "q4" | "q5", string>>;

export interface AnswerOutcomes {
  pause: boolean;
  securityCheck: boolean;
  moneyGuidance: boolean;
}

/** Q1 no, Q2 yes, or Q3 yes pauses the family. Q4 yes offers a security check. Q5 yes offers money guidance. */
export function answerOutcomes(answers: AnswerMap): AnswerOutcomes {
  return {
    pause: answers.q1 === "no" || answers.q2 === "yes" || answers.q3 === "yes",
    securityCheck: answers.q4 === "yes",
    moneyGuidance: answers.q5 === "yes",
  };
}

export function answersAreComplete(answers: AnswerMap): boolean {
  return SUITABILITY_QUESTIONS.every((question) =>
    question.options.some((option) => option.key === answers[question.key]),
  );
}

export function sharedPauseNotice(): string {
  return SHARED_PAUSE_NOTICE;
}

const WHO_OR_WHY = [
  /\braised by\b/i,
  /\bbecause\b/i,
  /\breported\b/i,
  /\byour co-parent\b/i,
  /\bthe other parent\b/i,
  /\bwho\b/i,
  /\bwhy\b/i,
];

export function noticeLeaksWhoOrWhy(text: string): boolean {
  return WHO_OR_WHY.some((pattern) => pattern.test(text));
}

const FORBIDDEN = ["pol" + "ice", "vict" + "im"];

export function copyNeedsRevision(text: string): boolean {
  const folded = text.toLowerCase();
  if (FORBIDDEN.some((stem) => folded.includes(stem))) return true;
  return text.includes("\u2014") || text.includes("\u2013");
}

export function collectCopyStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectCopyStrings(item, out));
    return out;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectCopyStrings(item, out));
  }
  return out;
}

export function passwordIsStrong(password: string): boolean {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export function hideSenderReadAt<T extends { sender_id?: string | null; read_at?: string | null }>(row: T, me: string): T {
  if (row.sender_id === me) return { ...row, read_at: null };
  return row;
}

export function defaultQuestions(): readonly SuitabilityQuestionCopy[] {
  return SUITABILITY_QUESTIONS;
}
