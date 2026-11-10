import { retiredFilterField } from "./filter-fields";
import { clientColumns, type ColumnKey } from "./model";
import {
  emptyFilters,
  filterFields,
  operators,
  validateFilters,
  type FilterGroup,
} from "./filters";

export interface Preferences {
  columnOrder: ColumnKey[];
  hiddenColumns?: ColumnKey[];
  filters: FilterGroup;
}
export const defaultOrder = clientColumns.map((column) => column.key);

/** Preserve known saved fields once, then append newly introduced columns. */
export function normalizeOrder(value: unknown): ColumnKey[] {
  const saved = Array.isArray(value) ? value : [];
  return [
    ...new Set([
      ...saved.filter((key): key is ColumnKey => defaultOrder.includes(key)),
      ...defaultOrder,
    ]),
  ];
}

/** Move the dragged column to the target's position, including hidden columns. */
export function moveColumn(
  order: ColumnKey[],
  source: ColumnKey,
  target: ColumnKey,
): ColumnKey[] {
  if (source === target || !order.includes(source) || !order.includes(target))
    return order;
  const next = order.filter((key) => key !== source);
  next.splice(order.indexOf(target), 0, source);
  return next;
}

/** Reject damaged filter payloads instead of silently overwriting saved preferences. */
export function decodePreferences(
  orderText: string,
  filterText: string,
): Preferences {
  const stored = orderText ? JSON.parse(orderText) : [];
  const order: unknown = Array.isArray(stored)
    ? stored
    : stored?.version === 2
      ? stored.columnOrder
      : undefined;
  let hiddenColumns: ColumnKey[] | undefined;
  if (!Array.isArray(stored) && stored?.version === 2) {
    if (
      !Array.isArray(stored.hiddenColumns) ||
      stored.hiddenColumns.some((key: unknown) => typeof key !== "string")
    )
      throw new Error("Saved visible fields have an invalid format.");
    hiddenColumns = [
      ...new Set<ColumnKey>(
        stored.hiddenColumns.filter((key: ColumnKey) =>
          defaultOrder.includes(key),
        ),
      ),
    ];
  }
  if (!Array.isArray(order))
    throw new Error("Saved column order has an invalid format.");
  const filters: FilterGroup = filterText
    ? JSON.parse(filterText)
    : structuredClone(emptyFilters);
  // Retire only the known fields removed from the approved filter list, preserving other saved
  // conditions and continuing to reject genuinely invalid cache contents.
  if (Array.isArray(filters?.criteria))
    filters.criteria = filters.criteria.filter(
      (row) => !retiredFilterField(row?.field),
    );
  if (
    !filters ||
    !["all", "any"].includes(filters.match) ||
    (filters.followUp !== undefined &&
      !["overdue", "due-soon"].includes(filters.followUp)) ||
    !Array.isArray(filters.criteria) ||
    filters.criteria.some(
      (row) =>
        !row ||
        typeof row.id !== "string" ||
        typeof row.value !== "string" ||
        !filterFields.some((field) => field.key === row.field) ||
        !Object.hasOwn(operators, row.operator),
    ) ||
    new Set(filters.criteria.map((row) => row.id)).size !==
      filters.criteria.length ||
    validateFilters(filters)
  ) {
    throw new Error("Saved filters have an invalid format.");
  }
  if (
    filters.columnMatch !== undefined &&
    !["all", "any"].includes(filters.columnMatch)
  )
    throw new Error("Saved column filter combination has an invalid format.");
  if (filters.columnCriteria !== undefined) {
    if (!Array.isArray(filters.columnCriteria))
      throw new Error("Saved column searches have an invalid format.");
    // Validate column searches using the same schema as global filters, without recursion.
    filters.columnCriteria = decodePreferences(
      "[]",
      JSON.stringify({ match: "all", criteria: filters.columnCriteria }),
    ).filters.criteria;
  }
  return {
    columnOrder: normalizeOrder(order),
    filters,
    ...(hiddenColumns === undefined ? {} : { hiddenColumns }),
  };
}

/** Keep legacy array support while storing visibility in the existing Cols_Order field. */
export function encodeColumns(preferences: Preferences): string {
  return JSON.stringify(
    preferences.hiddenColumns === undefined
      ? preferences.columnOrder
      : {
          version: 2,
          columnOrder: preferences.columnOrder,
          hiddenColumns: preferences.hiddenColumns,
        },
  );
}
