/** Only an explicit premium denial opens the paywall; AI credit errors stay separate. */
export const isPremiumRequired = async (data: unknown, error: unknown): Promise<boolean> => {
  if (data && typeof data === "object" && "error" in data && data.error === "premium_required") return true;
  if (!error || typeof error !== "object" || !("context" in error)) return false;
  const response = error.context;
  if (!(response instanceof Response) || response.status !== 402) return false;
  const body = await response.clone().json().catch(() => null);
  return body?.error === "premium_required";
};