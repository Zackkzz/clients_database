export interface LookupOption {
  id: string;
  label: string;
}

/** Build once per options response. Keep the first duplicate ID, matching Array.find. */
export function indexLookupOptions(
  options: readonly LookupOption[],
  locale = false,
) {
  const byId = new Map<string, LookupOption>();
  const searchable = options.map((option) => {
    if (!byId.has(option.id)) byId.set(option.id, option);
    return {
      option,
      text: locale
        ? option.label.toLocaleLowerCase()
        : option.label.toLowerCase(),
    };
  });
  return { byId, searchable, locale };
}

/** Retain source order, including duplicates, and apply the caller's existing case rules. */
export function filterLookupOptions(
  index: ReturnType<typeof indexLookupOptions>,
  query: string,
  excluded?: ReadonlySet<string>,
): LookupOption[] {
  const text = index.locale
    ? query.trim().toLocaleLowerCase()
    : query.trim().toLowerCase();
  return index.searchable
    .filter(
      ({ option, text: label }) =>
        !excluded?.has(option.id) && label.includes(text),
    )
    .map(({ option }) => option);
}
