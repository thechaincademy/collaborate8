// Reference hashing for Solana payment memos.
// No personal data is ever placed on chain - only this hash.
// The same canonical string + algorithm is used by the verify-payment edge function.

export interface ReferenceFields {
  arrangementId?: string | null;
  payerId: string;
  receiverId: string;
  period?: string | null;
  paymentType: "maintenance" | "expense";
  expenseId?: string | null;
  amountUsdc: number | string;
  salt: string;
}

export function canonicalReferenceString(f: ReferenceFields): string {
  return [
    f.arrangementId ?? "",
    f.payerId,
    f.receiverId,
    f.period ?? "",
    f.paymentType,
    f.expenseId ?? "",
    Number(f.amountUsdc).toFixed(6),
    f.salt,
  ].join("|");
}

export async function computeReferenceHash(f: ReferenceFields): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalReferenceString(f));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
