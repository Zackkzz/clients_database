const prefix = "@text-values:";
/** Explicit encoding preserves legacy literal searches, including commas. */
export function encodeTextValues(values: string[]): string {
  const entries = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  return entries.length ? prefix + JSON.stringify(entries) : "";
}
export function textEntries(value: string): string[] | undefined {
  if (!value.startsWith(prefix)) return;
  try {
    const values: unknown = JSON.parse(value.slice(prefix.length));
    return Array.isArray(values) &&
      values.every((v) => typeof v === "string" && v.trim())
      ? values
      : [];
  } catch {
    return [];
  }
}
export function textEntryLabel(value: string): string {
  const entries = textEntries(value);
  return entries
    ? entries
        .map((v) => (v.includes(",") ? '"' + v.replaceAll('"', '""') + '"' : v))
        .join(", ")
    : value;
}
