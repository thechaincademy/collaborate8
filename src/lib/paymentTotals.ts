// Home totals and payment statements count completed payments only.
// Pending, failed and disputed rows stay visible in history, but they are not
// part of the total (and a pending amount can be shown separately).

export const COMPLETED_PAYMENT_STATUS = "completed";
export const PENDING_PAYMENT_STATUS = "pending";

export type PaymentAmount = {
  amount: number | string;
  status?: string | null;
  created_at?: string;
};

const inWindow = (createdAt: string | undefined, since?: Date) =>
  !since || (!!createdAt && new Date(createdAt) >= since);

export const isCompletedPayment = (status: string | null | undefined) =>
  status === COMPLETED_PAYMENT_STATUS;

export const isPendingPayment = (status: string | null | undefined) =>
  status === PENDING_PAYMENT_STATUS;

export function sumPaymentsByStatus(
  payments: PaymentAmount[],
  status: string,
  since?: Date,
): number {
  return payments.reduce((sum, p) => {
    if (p.status !== status || !inWindow(p.created_at, since)) return sum;
    return sum + Number(p.amount);
  }, 0);
}

export const sumCompletedPayments = (payments: PaymentAmount[], since?: Date) =>
  sumPaymentsByStatus(payments, COMPLETED_PAYMENT_STATUS, since);

export const sumPendingPayments = (payments: PaymentAmount[], since?: Date) =>
  sumPaymentsByStatus(payments, PENDING_PAYMENT_STATUS, since);
