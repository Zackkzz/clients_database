import { textEntries, textEntryLabel } from "./text-filter-values";
import { filterColumn, filterFields } from "./filter-fields";
export { filterFields } from "./filter-fields";
import {
  columnValue,
  displayValue,
  columns,
  priorityChoices,
  stateChoices,
  type Client,
} from "./model";

export type FilterField = (typeof filterFields)[number]["key"];
export const operators = {
  anyOf: "Is any of",
  noneOf: "Is none of",
  greater: "Greater than",
  less: "Less than",
  before: "Before",
  after: "After",
  contains: "Contains",
  is: "Is",
  isNot: "Is not",
  startsWith: "Starts with",
  endsWith: "Ends with",
  empty: "Is empty",
  notEmpty: "Is not empty",
} as const;
export type FilterOperator = keyof typeof operators;
export interface Condition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}
export interface FilterGroup {
  followUp?: "overdue" | "due-soon";
  columnCriteria?: Condition[];
  columnMatch?: "all" | "any";
  match: "all" | "any";
  criteria: Condition[];
}
export const emptyFilters: FilterGroup = { match: "all", criteria: [] };
export const needsValue = (operator: FilterOperator) =>
  operator !== "empty" && operator !== "notEmpty";

/** Match individual multi-select labels; "is not" excludes any matching selection. */
export function matchesCondition(
  client: Client,
  condition: Condition,
): boolean {
  return matchesSearch(
    columnValue(client, condition.field),
    condition.value,
    condition.field,
    condition.operator,
  );
}

/** Shared by demo and portal views, after complete report pagination. */
export function matchesFilters(client: Client, filters: FilterGroup): boolean {
  const columnCriteria = filters.columnCriteria ?? [];
  const columnMatches = (condition: Condition) =>
    matchesCondition(client, condition);
  if (
    columnCriteria.length &&
    !(filters.columnMatch === "any"
      ? columnCriteria.some(columnMatches)
      : columnCriteria.every(columnMatches))
  )
    return false;
  if (!filters.criteria.length) return true;
  const matches = (condition: Condition) => matchesCondition(client, condition);
  return filters.match === "any"
    ? filters.criteria.some(matches)
    : filters.criteria.every(matches);
}
export function validateFilters(filters: FilterGroup): string {
  return filters.criteria.some(
    (c) => !validSearchValue(c.field, c.operator, c.value),
  )
    ? "Enter a value for each condition, or remove the unused row."
    : "";
}
export function filterOptions(clients: Client[], field: FilterField): string[] {
  if (filterColumn(field)?.control === "boolean") return ["Yes", "No"];
  const configured =
    field === "priority"
      ? priorityChoices
      : field === "state"
        ? stateChoices
        : (filterColumn(field)?.options ?? []);
  return [
    ...new Set([
      ...configured,
      ...clients.flatMap((client) => {
        const value = columnValue(client, field);
        return (Array.isArray(value) ? value.flat(Infinity) : [value]).map(
          displayValue,
        );
      }),
    ]),
  ]
    .filter((v) => v.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function searchOperators(field: FilterField): FilterOperator[] {
  const column = filterColumn(field);
  if (column?.control === "multi")
    return ["anyOf", "noneOf", "empty", "notEmpty"];
  if (["select", "lookup", "boolean"].includes(column?.control ?? ""))
    return ["is", "isNot", "empty", "notEmpty"];
  const kind = column?.kind;
  return kind === "number"
    ? ["is", "isNot", "greater", "less", "empty", "notEmpty"]
    : kind === "date" || kind === "datetime-local"
      ? ["is", "isNot", "before", "after", "empty", "notEmpty"]
      : [
          "contains",
          "is",
          "isNot",
          "startsWith",
          "endsWith",
          "empty",
          "notEmpty",
        ];
}
function comparableDate(value: string): string {
  const match = /^(\d{2})[/-](\d{2})[/-](\d{4})(?: (\d{2}:\d{2}))?/.exec(value);
  if (match)
    return `${match[3]}-${match[2]}-${match[1]}${match[4] ? "T" + match[4] : ""}`;
  const named = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?: (\d{2}:\d{2}))?/.exec(
    value,
  );
  if (named) {
    const month =
      [
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
      ].indexOf(named[2].toLowerCase()) + 1;
    return `${named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}${named[4] ? "T" + named[4] : ""}`;
  }
  return value.slice(0, 16);
}
/** Column searches combine with AND; multi-value exclusions reject any matching item. */
export function matchesSearch(
  value: unknown,
  query: string,
  field: FilterField,
  operator: FilterOperator,
): boolean {
  if (operator === "anyOf" || operator === "noneOf") {
    const selected = selectedValues(query);
    const found = selected.some((term) =>
      matchesSearch(value, term, field, "is"),
    );
    return operator === "noneOf" ? !found : found;
  }
  const entries = textEntries(query);
  if (entries && !["empty", "notEmpty"].includes(operator)) {
    return operator === "isNot"
      ? entries.length > 0 && entries.every((term) => matchesSearch(value, term, field, operator))
      : entries.some((term) => matchesSearch(value, term, field, operator));
  }
  const bool = filterColumn(field)?.control === "boolean";
  const rawText = displayValue(value).trim().toLocaleLowerCase();
  const text = bool
    ? rawText === "true"
      ? "yes"
      : rawText === "false"
        ? "no"
        : rawText
    : rawText;
  const rawTerm = query.trim().toLocaleLowerCase();
  const term = bool
    ? rawTerm === "true"
      ? "yes"
      : rawTerm === "false"
        ? "no"
        : rawTerm
    : rawTerm;
  if (operator === "empty") return !text;
  if (operator === "notEmpty") return !!text;
  if (!term) return true;
  if (Array.isArray(value))
    return operator === "isNot"
      ? value.every((item) => matchesSearch(item, query, field, operator))
      : value.some((item) => matchesSearch(item, query, field, operator));
  const kind = filterColumn(field)?.kind;
  if (kind === "number" || kind === "date" || kind === "datetime-local") {
    if (!text) return operator === "isNot";
    const left =
      kind === "number" ? Number(text) : comparableDate(displayValue(value));
    const right = kind === "number" ? Number(term) : comparableDate(query);
    if (
      kind === "number" &&
      (!Number.isFinite(left) || !Number.isFinite(right))
    )
      return false;
    if (operator === "greater" || operator === "after") return left > right;
    if (operator === "less" || operator === "before") return left < right;
    return operator === "isNot" ? left !== right : left === right;
  }
  return operator === "is"
    ? text === term
    : operator === "isNot"
      ? text !== term
      : operator === "startsWith"
        ? text.startsWith(term)
        : operator === "endsWith"
          ? text.endsWith(term)
          : text.includes(term);
}

/** Multi-values are JSON encoded so commas in lookup labels round-trip without ambiguity. */
export function selectedValues(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string" && item.trim())
      ? parsed
      : [];
  } catch {
    return [];
  }
}
export function conditionText(operator: FilterOperator, value: string): string {
  return operator === "anyOf" || operator === "noneOf"
    ? selectedValues(value).join(", ")
    : textEntryLabel(value);
}
export function validSearchValue(
  field: FilterField,
  operator: FilterOperator,
  value: string,
): boolean {
  if (!needsValue(operator)) return true;
  if (operator === "anyOf" || operator === "noneOf")
    return selectedValues(value).length > 0;
  if (textEntries(value)) return textEntries(value)!.length > 0;
  if (!value.trim()) return false;
  const kind = filterColumn(field)?.kind;
  if (kind === "number") return Number.isFinite(Number(value));
  if (kind === "date" || kind === "datetime-local") {
    const date = comparableDate(value);
    const day = date.slice(0, 10);
    const parsed = new Date(day + "T00:00:00Z");
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(day) &&
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === day &&
      (kind === "date" ||
        /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(date))
    );
  }
  return true;
}
