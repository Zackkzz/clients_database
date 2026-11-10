export interface LookupSelection {
  id: string;
  label: string;
  states?: string[];
}

/** Creator can represent an empty lookup as null, an empty object, or an empty array. */
export function lookupSelection(
  value: unknown,
  multiple: boolean,
): LookupSelection[] {
  const values = Array.isArray(value) ? value : [value];
  const options = values.flatMap((item) => {
    if (item == null || item === "") return [];
    const record =
      typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = String(
      record.ID ?? record.id ?? (typeof item === "string" ? item : ""),
    ).trim();
    if (!id) return [];
    const label =
      String(
        record.display_value ?? record.zc_display_value ?? record.label ?? "",
      ).trim() || id;
    return [
      {
        id,
        label,
        ...(Array.isArray(record.states)
          ? { states: record.states as string[] }
          : {}),
      },
    ];
  });
  return multiple ? options : options.slice(0, 1);
}
