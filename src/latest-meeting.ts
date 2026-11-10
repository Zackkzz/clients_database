import { calendarDay } from "./follow-ups";
import { DataError } from "./api";
/** Latest meeting is selected by meeting date, not creation order. Newest tied row wins. */
export function latestMeeting(
  rows: { id: string; date: string }[],
): string | null {
  let latest: { id: string; day: number } | undefined;
  for (const row of rows) {
    const day = calendarDay(row.date);
    if (day === undefined)
      throw new DataError(
        "Cannot update Last Meeting because a meeting date is unreadable.",
      );
    if (!latest || day >= latest.day) latest = { id: row.id, day };
  }
  return latest?.id ?? null;
}
