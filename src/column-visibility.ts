import { internalClientFields } from "./internal-client-fields";
import type { ClientFormContext } from "./client-form-context";
import { clientColumns, type ColumnKey } from "./model";

const system = new Set<ColumnKey>([
  "field:Team",
  "field:Access",
  "field:Is_Subform",
  "field:Flag",
]);
const channelSales = new Set<ColumnKey>([
  "field:Main_Product_Used",
  "field:Follow_Up_Frequency",
  "field:Last_Meeting",
  "field:Installs_Per_Month",
  "field:Switch_to_Sungrow",
  "field:Used_Sungrow_Before",
]);

/** The grid displays existing Clients, so apply shared + edit load visibility.
 * State is offered when at least one loaded Client would show it on edit.
 * Undefined context is unresolved; null is a successful no-Staff match.
 * Disabled controls (e.g. Last_Meeting) remain selectable when visible.
 */
export function workflowClientColumns(
  context: ClientFormContext | null | undefined,
  hasSavedState: boolean,
) {
  return clientColumns.filter(({ key }) => {
    if (system.has(key) || internalClientFields.has(key)) return false;
    if (channelSales.has(key)) {
      if (context?.teamId !== "3932750000196993014") return false;
      if (key === "field:Follow_Up_Frequency" && !context.sales) return false;
    }
    if (key === "field:Service_Ticket_Default")
      return context === null || context?.sales === false;
    if (key === "state") return hasSavedState;
    return true;
  });
}
