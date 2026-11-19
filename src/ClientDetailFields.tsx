import { clientEditFieldVisible } from "./client-load-rules";
import type { ClientFormContext } from "./client-form-context";
import { lookupSelection } from "./lookup-selection";
import { ClientChoiceDropdown } from "./ClientChoiceDropdown";
import { customerFields } from "./client-fields";
import { parseFormFields } from "./client-create/metadata";
import { displayValue, type Client } from "./model";

export const detailFieldNames = [
  "ABN",
  "Distributors",
  "Postcode",
  "Main_Product_Used",
  "Follow_Up_Frequency",
  "Last_Meeting",
  "Installs_Per_Month",
  "Switch_to_Sungrow",
  "Used_Sungrow_Before",
  "PCS_Capacity",
  "BESS_Capacity",
  "Inverter_Capacity",
];
const fields = parseFormFields({ code: 3000, fields: customerFields }).filter(
  (f) => detailFieldNames.includes(f.name),
);
const readonly = new Set([
  "Last_Meeting",
  "PCS_Capacity",
  "BESS_Capacity",
  "Inverter_Capacity",
]);

/** Display workflow-derived values, and keep editable lookup values as Creator IDs. */
export function renderClientDetailFields({
  client,
  change,
  disabled,
  demo,
  context,
}: {
  client: Client;
  change: (name: string, value: unknown) => void;
  disabled: boolean;
  demo: boolean;
  context?: ClientFormContext | null;
}) {
  return fields
    .filter((field) => clientEditFieldVisible(field.name, context))
    .map((field) => {
      const value = client.raw?.[field.name];
      return (
        <div
          className="form-field"
          data-detail-field={field.name}
          key={field.name}
        >
          <label htmlFor={`detail-${field.name}`}>{field.label}</label>
          {field.lookup && !readonly.has(field.name) ? (
            <fieldset disabled={disabled} className="detail-lookup">
              <ClientChoiceDropdown
                field={field}
                path={field.name}
                demo={demo}
                value={lookupSelection(value, [14, 15].includes(field.type))}
                change={(v) => change(field.name, v)}
              />
            </fieldset>
          ) : field.choices.length ? (
            <select
              id={`detail-${field.name}`}
              disabled={disabled}
              value={String(value ?? "")}
              onChange={(e) => change(field.name, e.target.value)}
            >
              <option value="">Select an option</option>
              {field.choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`detail-${field.name}`}
              readOnly={readonly.has(field.name)}
              disabled={disabled}
              type={[5, 6, 7].includes(field.type) ? "number" : "text"}
              step={field.type === 5 ? "1" : "any"}
              value={displayValue(value)}
              onChange={(e) => change(field.name, e.target.value)}
            />
          )}
        </div>
      );
    });
}
