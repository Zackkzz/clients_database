export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function creatorDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (
    !match ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new Error("Enter a valid date.");
  return `${match[3]}/${match[2]}/${match[1]}`;
}
export function creatorDateTime(value: string): string {
  const [date, time] = value.split("T");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? ""))
    throw new Error("Enter a valid time.");
  return `${creatorDate(date)} ${time}:00`;
}
