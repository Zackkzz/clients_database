import { displayValue } from "./model";
import type { SubformRow } from "./subforms";

function dateKey(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}
function range(values: string[]) {
  const dates = [...new Set(values.filter(Boolean))].sort((a, b) =>
    dateKey(a).localeCompare(dateKey(b)),
  );
  return dates.length > 1 ? `${dates[0]} to ${dates.at(-1)}` : (dates[0] ?? "");
}
/** Client stack groups C4 and product; large datasets use record counts per original workflow. */
export function buildBomStack(
  records: Record<string, unknown>[],
): SubformRow[] {
  const groups = new Map<
    string,
    {
      rows: Record<string, unknown>[];
      c4: string;
      model: string;
      modelLabel: string;
    }
  >();
  for (const row of records) {
    const c4 = displayValue(row.C4_Number_Project);
    const lookup = row.Original_Product_Model;
    const model =
      lookup && typeof lookup === "object" && "ID" in lookup
        ? String(lookup.ID)
        : String(lookup ?? "");
    const key = JSON.stringify([c4, model]);
    if (!groups.has(key))
      groups.set(key, {
        rows: [],
        c4,
        model,
        modelLabel: displayValue(lookup),
      });
    groups.get(key)!.rows.push(row);
  }
  return [...groups].map(([key, group]) => {
    const values = {
      C4_Number: group.c4,
      Original_Product_Model: group.model,
      Original_Product_Code: displayValue(group.rows[0].Original_Product_Code),
      Quantity: String(
        records.length >= 300
          ? group.rows.length
          : group.rows.reduce(
              (sum, row) => sum + (Number(row.Original_Quantity) || 0),
              0,
            ),
      ),
      Warranty_Start_Date: range(
        group.rows.map((row) => displayValue(row.Warranty_Start_Date)),
      ),
      Dispatch_Date: range(
        group.rows.map((row) => displayValue(row.Dispatch_Date)),
      ),
    };
    return {
      id: key,
      revision: JSON.stringify(values),
      values,
      labels: { Original_Product_Model: group.modelLabel },
    };
  });
}
