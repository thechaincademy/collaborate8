import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";

type Arrangement = {
  next_due_date?: string | null;
  frequency?: string | null;
};

/** Returns the upcoming due date, rolling a stored past date forward by frequency. */
export const getUpcomingDueDate = (a?: Arrangement | null): Date | null => {
  if (!a?.next_due_date) return null;
  let d = new Date(a.next_due_date);
  if (isNaN(d.getTime())) return null;
  const today = startOfDay(new Date());
  const step =
    a.frequency === "daily" ? (x: Date) => addDays(x, 1)
    : a.frequency === "weekly" ? (x: Date) => addWeeks(x, 1)
    : (x: Date) => addMonths(x, 1);
  let guard = 0;
  while (d < today && guard++ < 2000) d = step(d);
  return d;
};
