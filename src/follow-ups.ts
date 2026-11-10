import { displayValue, type Client } from "./model";
export type FollowUpStatus = "overdue" | "due-soon" | "later" | "unknown";
export type FollowUpDays = Record<string, number>;
const dayMs = 86400000;
/** Calendar-day arithmetic avoids DST changing the seven-day boundary. */
export function calendarDay(value: string): number | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value.trim());
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:$| )/.exec(value.trim());
  const named = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:$| )/.exec(value.trim());
  const year = Number(iso?.[1] ?? local?.[3] ?? named?.[3]);
  const month = iso
    ? Number(iso[2])
    : local
      ? Number(local[2])
      : named
        ? [
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
          ].indexOf(named[2].toLowerCase()) + 1
        : 0;
  const day = Number(iso?.[3] ?? local?.[1] ?? named?.[1]);
  const stamp = Date.UTC(year, month - 1, day);
  const date = new Date(stamp);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? stamp / dayMs
    : undefined;
}
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/** Empty Last_Meeting is overdue even without a tier; missing report fields are unknown. */
export function followUpStatus(
  client: Client,
  days: FollowUpDays,
  today: string,
): FollowUpStatus {
  if (!client.raw || !Object.hasOwn(client.raw, "Last_Meeting"))
    return "unknown";
  const raw = client.raw.Last_Meeting;
  const text = displayValue(raw).trim();
  if (!text) {
    if (raw && typeof raw === "object" && "ID" in raw) return "unknown";
    return "overdue";
  }
  const meeting = calendarDay(text);
  const current = calendarDay(today);
  const frequency = days[client.priority];
  if (
    meeting === undefined ||
    current === undefined ||
    !Number.isSafeInteger(frequency) ||
    frequency < 0
  )
    return "unknown";
  const remaining = meeting + frequency - current;
  return remaining < 0 ? "overdue" : remaining <= 7 ? "due-soon" : "later";
}
export const followUpLabels: Record<FollowUpStatus, string> = {
  overdue: "Overdue follow-up",
  "due-soon": "Follow-up due within 7 days",
  later: "Follow-up due later",
  unknown: "Follow-up date unavailable",
};
