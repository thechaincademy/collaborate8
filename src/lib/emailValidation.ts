// Client-side checks that an email address looks real before sign-up.

export const RESERVED_DOMAINS = ["example.com", "example.org", "example.net"];
export const RESERVED_TLDS = ["test", "invalid", "localhost", "example", "local"];

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "mailinator.net", "mailinator.org", "yopmail.com", "yopmail.fr", "yopmail.net",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "guerrillamail.de",
  "guerrillamailblock.com", "grr.la", "sharklasers.com", "pokemail.net", "spam4.me",
  "10minutemail.com", "10minutemail.net", "10minutemail.co.uk", "10minemail.com", "20minutemail.com",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempmailo.com", "tempmail.dev",
  "tempmailaddress.com", "tempinbox.com", "tempr.email", "temp-mail.de", "tmpmail.org", "tmpmail.net",
  "tmail.ws", "trashmail.com", "trashmail.net", "trashmail.de", "trashmail.io", "trash-mail.com",
  "trashmail.me", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "fakemail.net", "fakemailgenerator.com", "emailondeck.com", "mintemail.com",
  "mohmal.com", "mytemp.email", "mailnesia.com", "mailcatch.com", "mailnull.com", "mailpoof.com",
  "moakt.com", "burnermail.io", "spamgourmet.com", "spambox.us", "spamex.com", "spamdecoy.net",
  "jetable.org", "getairmail.com", "airmail.cc", "anonbox.net", "byom.de", "discard.email",
  "discardmail.com", "dropmail.me", "emailfake.com", "emailtemporanea.com", "emltmp.com",
  "fakemail.fr", "harakirimail.com", "incognitomail.org", "inboxkitten.com", "mail-temp.com",
  "mail.tm", "mailforspam.com", "mailtemp.info", "meltmail.com", "mvrht.com", "nowmymail.com",
  "one-time.email", "onetimeemail.net", "owlymail.com", "rcpt.at", "receiveee.com", "spamfree24.org",
  "temporarymail.com", "throwam.com", "throwawayemail.com", "trbvm.com", "wegwerfmail.de",
  "wegwerfmail.net", "yepmail.net", "zetmail.com", "33mail.com", "emailnax.com", "linshiyouxiang.net",
  "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com",
  "superrito.com", "teleworm.us", "armyspy.com", "mailsac.com", "tempmail.plus", "1secmail.com",
  "1secmail.net", "1secmail.org", "minutemail.com", "inboxbear.com", "luxusmail.org",
]);

export const EMAIL_NOT_REAL = "That email address doesn't look real. Please use an address you can receive email at.";
export const EMAIL_DISPOSABLE = "Disposable email addresses can't be used with Collabor8.";

export const emailDomain = (email: string) => email.trim().toLowerCase().split("@").pop() ?? "";

export function isReservedDomain(domain: string): boolean {
  const d = domain.toLowerCase().replace(/\.$/, "");
  if (RESERVED_DOMAINS.some((r) => d === r || d.endsWith("." + r))) return true;
  const tld = d.split(".").pop() ?? "";
  return RESERVED_TLDS.includes(tld) || d === tld;
}

export function isDisposableDomain(domain: string): boolean {
  const parts = domain.toLowerCase().split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/** true = has MX, false = no MX, null = lookup failed (fail open). */
export async function hasMxRecord(domain: string, fetchImpl: typeof fetch = fetch, timeoutMs = 3000): Promise<boolean | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.Status === 0 && Array.isArray(data.Answer) && data.Answer.some((a: { type?: number }) => a.type === 15);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns an error message, or null when the address can be used. */
export async function validateSignupEmail(email: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const domain = emailDomain(email);
  if (!domain || !domain.includes(".") || isReservedDomain(domain)) return EMAIL_NOT_REAL;
  if (isDisposableDomain(domain)) return EMAIL_DISPOSABLE;
  const mx = await hasMxRecord(domain, fetchImpl);
  return mx === false ? EMAIL_NOT_REAL : null;
}
