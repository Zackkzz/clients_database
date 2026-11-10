import { customerFields } from "./client-fields";
export const states = [
  "QLD",
  "NSW",
  "VIC",
  "SA",
  "WA",
  "ACT",
  "NT",
  "TAS",
  "NZ",
] as const;

export const priorityChoices = ["Tier 1", "Tier 2", "Tier 3"];
export const stateChoices = states.filter((state) => state !== "NZ");
export const textLimits: Partial<Record<EditableKey, number>> = {
  name: 255,
  contact: 255,
  address: 255,
  email: 80,
  note: 65535,
};
export interface LookupOption {
  id: string;
  label: string;
  code?: string;
}
export interface ClientLookups {
  countries: LookupOption[];
  customerTypes: LookupOption[];
}

export interface Client {
  id: string;
  raw?: Record<string, unknown>;
  detailChanges?: Record<string, unknown>;
  name: string;
  priority: string;
  types: string[];
  contact: string;
  address: string;
  phone: string;
  email: string;
  state: string;
  note: string;
  countryId?: string;
  country?: string;
  countryCode?: string;
  typeIds?: string[];
}

export type ColumnKey =
  | "name"
  | "priority"
  | "types"
  | "contact"
  | "address"
  | "phone"
  | "email"
  | "state"
  | "country"
  | "note"
  | `field:${string}`;
export interface Column {
  key: ColumnKey;
  label: string;
  width: number;
  kind?: "text" | "number" | "date" | "datetime-local";
  options?: string[];
  control?: "input" | "select" | "lookup" | "multi" | "boolean";
}
interface Field {
  link_name: string;
  display_name: string;
  type: number;
  is_lookup_field?: boolean;
  choices?: readonly { value: string }[];
  fields?: readonly Field[];
}
const aliases: Record<string, ColumnKey> = {
  Business_Name: "name",
  Priority: "priority",
  Customer_Type: "types",
  Contact_Name: "contact",
  Office_Address: "address",
  Phone_Number: "phone",
  Email: "email",
  State: "state",
  Country: "country",
  Note: "note",
};
/** Keep existing cache keys while exposing all data fields and nested subform paths. */
function fieldColumns(
  fields: readonly Field[],
  prefix = "",
  labelPrefix = "",
): Column[] {
  return fields.flatMap((field) => {
    if ([24, 28].includes(field.type)) return [];
    const path = prefix + field.link_name;
    const label = labelPrefix + field.display_name;
    return [
      {
        key: aliases[path] ?? (`field:${path}` as ColumnKey),
        label,
        width: 190,
        kind:
          !field.is_lookup_field && [5, 6, 7, 8, 9].includes(field.type)
            ? ("number" as const)
            : field.type === 10
              ? ("date" as const)
              : field.type === 11
                ? ("datetime-local" as const)
                : ("text" as const),
        control:
          field.type === 16
            ? ("boolean" as const)
            : field.choices?.some((choice) =>
                  /^(Please input|State not available)/i.test(choice.value),
                )
              ? ("input" as const)
              : field.type === 14
                ? ("multi" as const)
                : field.is_lookup_field
                  ? ("lookup" as const)
                  : field.choices?.length
                    ? ("select" as const)
                    : ("input" as const),
        options: field.choices?.map((choice) => choice.value),
      },
      ...fieldColumns(field.fields ?? [], path + ".", label + " · "),
    ];
  });
}
const originalColumns: Column[] = [
  { key: "name", label: "Business name", width: 230 },
  { key: "priority", label: "Priority tier", width: 185 },
  { key: "types", label: "Customer type", width: 190 },
  { key: "contact", label: "Contact name", width: 175 },
  { key: "address", label: "Office address", width: 255 },
  { key: "phone", label: "Phone number", width: 155 },
  { key: "email", label: "Email address", width: 235 },
  { key: "state", label: "State", width: 110 },
];
const schemaColumns = fieldColumns(customerFields);
export const columns: Column[] = [
  ...originalColumns.map((column) => ({
    ...schemaColumns.find((item) => item.key === column.key),
    ...column,
  })),
  ...schemaColumns.filter(
    (column) => !originalColumns.some((item) => item.key === column.key),
  ),
];
// Only direct Client data fields belong in the grid's Visible fields picker.
const clientFieldKeys = new Set(
  customerFields
    .filter((field) => ![21, 24, 28].includes(field.type))
    .map((field) => aliases[field.link_name] ?? `field:${field.link_name}`),
);
export const clientColumns = columns.filter((column) =>
  clientFieldKeys.has(column.key),
);

function pathValue(value: unknown, path: string[]): unknown {
  if (!path.length) return value;
  if (Array.isArray(value)) return value.map((item) => pathValue(item, path));
  if (!value || typeof value !== "object") return undefined;
  return pathValue((value as Record<string, unknown>)[path[0]], path.slice(1));
}
/** Mapped editable fields use current values; extra fields retain the report's original data. */
export function columnValue(client: Client, key: ColumnKey): unknown {
  return key.startsWith("field:")
    ? pathValue(client.raw, key.slice(6).split("."))
    : client[key as keyof Client];
}
export type EditableKey =
  "name" | "contact" | "address" | "phone" | "email" | "note";
export const editableKeys: EditableKey[] = [
  "name",
  "contact",
  "address",
  "phone",
  "email",
  "note",
];
const fieldMap: Record<EditableKey, string> = {
  name: "Business_Name",
  contact: "Contact_Name",
  address: "Office_Address",
  phone: "Phone_Number",
  email: "Email",
  note: "Note",
};

export function displayValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value))
    return value.map(displayValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return item.zc_display_value != null || item.display_value != null
      ? String(item.zc_display_value ?? item.display_value)
      : Object.entries(item)
          .filter(([key]) => key !== "ID")
          .map(([, value]) => displayValue(value))
          .filter(Boolean)
          .join(", ");
  }
  return String(value);
}

/** Retain Zoho IDs as strings: numeric conversion can lose precision. */
export function decodeClient(row: Record<string, unknown>): Client {
  if (typeof row.ID !== "string" || !row.ID)
    throw new Error("A client record is missing its ID.");
  return {
    id: row.ID,
    raw: row,
    name: displayValue(row.Business_Name),
    priority: displayValue(row.Priority),
    types: Array.isArray(row.Customer_Type)
      ? row.Customer_Type.map(displayValue).filter(Boolean)
      : [displayValue(row.Customer_Type)].filter(Boolean),
    contact: displayValue(row.Contact_Name),
    address: displayValue(row.Office_Address),
    phone: displayValue(row.Phone_Number),
    email: displayValue(row.Email),
    state: displayValue(row.State),
    note: displayValue(row.Note),
    countryId:
      typeof row.Country === "object" && row.Country
        ? String((row.Country as Record<string, unknown>).ID ?? "")
        : "",
    country: displayValue(row.Country),
    typeIds: Array.isArray(row.Customer_Type)
      ? row.Customer_Type.flatMap((value) =>
          typeof value === "object" && value && typeof value.ID === "string"
            ? [value.ID]
            : [],
        )
      : [],
  };
}

export function encodePatch(
  patch: Partial<Client>,
): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  for (const key of editableKeys) {
    const value = patch[key];
    if (value !== undefined) {
      const trimmed =
        key === "name" ? value.trim().replaceAll("\t", "") : value.trim();
      const limit = textLimits[key];
      if (limit && trimmed.length > limit)
        throw new Error(
          `${key === "name" ? "Business name" : key} must be ${limit} characters or fewer.`,
        );
      data[fieldMap[key]] = trimmed;
    }
  }
  if ("Business_Name" in data && !data.Business_Name)
    throw new Error("Business name is required.");
  if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.Email)))
    throw new Error("Enter a valid email address.");
  if (patch.priority !== undefined) {
    if (patch.priority && !priorityChoices.includes(patch.priority))
      throw new Error("Choose a valid priority tier.");
    data.Priority = patch.priority;
  }
  if (patch.state !== undefined) {
    if (patch.state.length > 255) throw new Error("Choose a valid state.");
    data.State = patch.state;
  }
  if (patch.countryId !== undefined) {
    if (!patch.countryId) throw new Error("Country is required.");
    data.Country = patch.countryId;
  }
  if (patch.typeIds !== undefined)
    data.Customer_Type = [...new Set(patch.typeIds)];
  // Only the explicit detail fields can enter an update; never resend raw report data.
  for (const [name, value] of Object.entries(patch.detailChanges ?? {})) {
    if (
      ![
        "ABN",
        "Postcode",
        "Distributors",
        "Main_Product_Used",
        "Follow_Up_Frequency",
        "Installs_Per_Month",
        "Switch_to_Sungrow",
        "Used_Sungrow_Before",
      ].includes(name)
    )
      throw new Error(`Cannot edit ${name}.`);
    const id = (v: unknown) =>
      String(
        v && typeof v === "object"
          ? ((v as Record<string, unknown>).id ??
              (v as Record<string, unknown>).ID ??
              "")
          : (v ?? ""),
      );
    if (["Distributors", "Main_Product_Used"].includes(name))
      data[name] = Array.isArray(value) ? value.map(id) : id(value);
    else {
      const text = String(value ?? "").trim();
      if (
        [
          "Follow_Up_Frequency",
          "Installs_Per_Month",
          "Switch_to_Sungrow",
        ].includes(name) &&
        text &&
        !Number.isFinite(Number(text))
      )
        throw new Error(`${name} must be a number.`);
      data[name] = text;
    }
  }
  return data;
}

export function encodeCreate(
  client: Client,
): Record<string, string | string[]> {
  if (!client.countryId) throw new Error("Country is required.");
  return encodePatch(client);
}

export interface ViewQuery {
  search: string;
  state: string;
  priority: string;
  type: string;
  sort: ColumnKey;
  direction: "asc" | "desc" | "default";
}
// Reuse the locale configuration instead of constructing it for each comparison.
const clientSortCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const groupSortCollator = new Intl.Collator(undefined, { numeric: true });
export function queryClients(clients: Client[], query: ViewQuery): Client[] {
  const search = query.search.trim().toLocaleLowerCase();
  return clients
    .filter(
      (client) =>
        (!query.state ||
          (query.state === "NZ"
            ? /^(NZ|New Zealand)$/i.test(
                client.countryCode || client.country || "",
              )
            : client.state.toUpperCase() === query.state)) &&
        (!query.priority || client.priority === query.priority) &&
        (!query.type || client.types.includes(query.type)) &&
        (!search ||
          columns.some(({ key }) =>
            displayValue(columnValue(client, key))
              .toLocaleLowerCase()
              .includes(search),
          )),
    )
    .sort((a, b) => {
      // Stable sorting preserves the report order when no explicit sort is selected.
      if (query.direction === "default") return 0;
      const compared = clientSortCollator.compare(
        displayValue(columnValue(a, query.sort)),
        displayValue(columnValue(b, query.sort)),
      );
      return (
        (query.direction === "asc" ? compared : -compared) ||
        a.id.localeCompare(b.id)
      );
    });
}

export type GroupKey = "priority" | "state" | "region" | "";

/** Region follows the former regional views: NZ uses Country; other clients use State. */
export function clientRegion(client: Client): string {
  if (
    /^(NZ|New Zealand)$/i.test(
      (client.countryCode || client.country || "").trim(),
    )
  )
    return "NZ";
  return client.state.trim().toUpperCase() || "Unassigned";
}

export function groupClients(
  clients: Client[],
  key: GroupKey,
): [string, Client[]][] {
  if (!key) return [["", clients]];
  const groups = new Map<string, Client[]>();
  for (const client of clients) {
    const value =
      key === "region" ? clientRegion(client) : client[key] || "Unassigned";
    // Buckets are local to this call; appending preserves order without copying
    // every existing member again (quadratic for large, single-tier groups).
    const members = groups.get(value);
    if (members) members.push(client);
    else groups.set(value, [client]);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    groupSortCollator.compare(a, b),
  );
}

/** Derive selectable lookup identities from accessible Client records, never separate reports. */
export function clientLookups(clients: Client[]): ClientLookups {
  const countries = new Map<string, LookupOption>();
  const customerTypes = new Map<string, LookupOption>();
  for (const client of clients) {
    if (client.countryId && client.country?.trim())
      countries.set(client.countryId, {
        id: client.countryId,
        label: client.country,
        ...(client.countryCode ? { code: client.countryCode } : {}),
      });
    // Do not pair filtered IDs with a different label if a returned lookup lacks its ID.
    if (client.typeIds?.length === client.types.length) {
      client.typeIds.forEach((id, index) => {
        if (id && client.types[index]?.trim())
          customerTypes.set(id, { id, label: client.types[index] });
      });
    } else if (Array.isArray(client.raw?.Customer_Type)) {
      for (const item of client.raw.Customer_Type) {
        if (
          item &&
          typeof item === "object" &&
          typeof item.ID === "string" &&
          displayValue(item).trim()
        )
          customerTypes.set(item.ID, {
            id: item.ID,
            label: displayValue(item),
          });
      }
    }
  }
  const sorted = (options: Map<string, LookupOption>) =>
    [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { countries: sorted(countries), customerTypes: sorted(customerTypes) };
}
