import { columns, type Column, type ColumnKey } from "./model";

// Client report search fields approved by the user; independent of grid visibility
// and deliberately excludes individual fields inside related-record subforms.
const approved: [ColumnKey, string][] = [
  ["name", "Business Name"],
  ["priority", "Priority"],
  ["types", "Customer Type"],
  ["field:Project", "Project"],
  ["field:Last_Meeting", "Last Meeting"],
  ["field:Distributors", "Distributors"],
  ["field:C4", "C4"],
  ["field:BOM", "BOM"],
  ["contact", "Contact Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["address", "Office Address"],
  ["field:Postcode", "Postcode"],
  ["state", "State"],
  ["country", "Country"],
  ["field:Leads", "Leads"],
  ["field:Main_Product_Used", "Main Product Used"],
  ["field:Installs_Per_Month", "Installs Per Month"],
  ["field:Switch_to_Sungrow", "% Switch to Sungrow"],
  ["field:Used_Sungrow_Before", "Used Sungrow Before?"],
  ["field:ABN", "ABN"],
  ["field:PCS_Capacity", "PCS Capacity (MV)"],
  ["field:BESS_Capacity", "BESS Capacity (MVh)"],
  ["field:Inverter_Capacity", "Inverter Capacity"],
  ["note", "Note"],
  ["field:Service_Ticket_Default", "Service Ticket Default"],
  ["field:Follow_Up_Frequency", "Follow-Up Frequency (per N days)"],
  ["field:Meeting_Note", "Meeting Note"],
  ["field:Team", "Team"],
  ["field:Added_User", "Added User"],
  ["field:Added_Time", "Added Time"],
];
export const filterColumns: Column[] = approved.map(([key, label]) => ({
  width: 190,
  ...columns.find((column) => column.key === key),
  ...(key === "field:Added_Time"
    ? { kind: "datetime-local" as const, control: "input" as const }
    : {}),
  key,
  label,
}));
export const filterFields = filterColumns.map(({ key, label }) => ({
  key,
  label,
}));
/** Column search shares type handling with report filters, including audit fields. */
export function filterColumn(key: ColumnKey): Column | undefined {
  return (
    filterColumns.find((column) => column.key === key) ??
    columns.find((column) => column.key === key)
  );
}
export function retiredFilterField(key: string): boolean {
  return (
    columns.some((column) => column.key === key) &&
    !filterFields.some((field) => field.key === key)
  );
}
