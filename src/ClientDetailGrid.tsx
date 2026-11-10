import { Children, isValidElement, type ReactNode } from "react";
const left = [
  "name",
  "ABN",
  "priority",
  "types",
  "Distributors",
  "Main_Product_Used",
  "Follow_Up_Frequency",
  "Last_Meeting",
  "PCS_Capacity",
  "BESS_Capacity",
  "Inverter_Capacity",
];
const right = [
  "country",
  "state",
  "address",
  "Postcode",
  "contact",
  "email",
  "phone",
  "note",
  "Installs_Per_Month",
  "Switch_to_Sungrow",
  "Used_Sungrow_Before",
];
/** Independent columns keep compact field flow and preserve DOM/tab order on mobile. */
export function ClientDetailGrid({ children }: { children: ReactNode }) {
  const fields = new Map<string, ReactNode>();
  const notices: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    const key = isValidElement<{ "data-detail-field"?: string }>(child)
      ? child.props["data-detail-field"]
      : undefined;
    if (key) fields.set(key, child);
    else notices.push(child);
  });
  return (
    <div className="client-detail-grid">
      {notices.length > 0 && <div className="detail-notices">{notices}</div>}
      <div className="detail-field-column">
        {left.map((key) => fields.get(key))}
      </div>
      <div className="detail-field-column">
        {right.map((key) => fields.get(key))}
      </div>
    </div>
  );
}
