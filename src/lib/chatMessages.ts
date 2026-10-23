/** Preserve original first-message chronology and deduplicate overlapping fetch/realtime results. */
export const pendingMessageDelivery = (
  senderId: string,
  recipientId: string,
  pending: { body: string; created_at: string },
) => ({ sender_id: senderId, recipient_id: recipientId, body: pending.body, created_at: pending.created_at });

export const mergeChatMessages = <T extends { id: string; created_at: string }>(current: T[], incoming: T[]): T[] => {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
};