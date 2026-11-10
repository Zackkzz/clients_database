import { assertSuccess, creatorRequest, DataError, loadSdk } from "../api";
import { getCreatorFormFields } from "../form-metadata";
import { fetchClientFormContext } from "../client-form-context";
import { clientStaffContactPayload } from "../client-load-rules";
import { fetchCountryStates, fetchFollowUpFrequency } from "../form-rules";
import { customerFields } from "../client-fields";
import { subforms } from "../subform-schema";
import { decodeClient } from "../model";
import { applyCreateRules, prepareRelatedData } from "./rules";
import { parseFormFields } from "./metadata";
import { formPayload } from "./model";
import { asObject } from "./values";
import type { FormDefinition, Json } from "./types";

export class ClientCreateUnknownError extends DataError {}

export type Option = { id: string; label: string; states?: string[] };
const sources: Record<string, [string, string]> = {
  Country: ["Countries", "Country_Name"],
  "Leads.Country": ["Countries", "Country_Name"],
  Customer_Type: ["Customer_Types", "Customer_Type"],
  Distributors: ["Client_Legacy", "Business_Name"],
  Service_Ticket_Default: ["Staff_List", "Staff_name"],
  Main_Product_Used: ["Brands", "Name"],
  "Leads.Sales": ["Sales_List", "Name"],
};
export function hasLookup(path: string) {
  return !!sources[path];
}

/** Metadata and all data operations use the same signed-in portal SDK as the grid. */
export async function loadCreateDefinition(
  demo: boolean,
): Promise<FormDefinition> {
  const context = demo
    ? { teamId: "3932750000196993014", sales: true }
    : await fetchClientFormContext();
  const raw = demo
    ? customerFields.map((field) => {
        const child = subforms.find((s) => s.key === field.link_name);
        return child ? { ...field, fields: child.fields } : field;
      })
    : await getCreatorFormFields("Client");
  const fields = parseFormFields({ code: 3000, fields: raw });
  const team = context
    ? { id: context.teamId, label: context.sales ? "Sales" : "Service" }
    : undefined;
  let definition = applyCreateRules("Client", fields, team);
  const children: Record<string, string> = {
    Meeting_Note: "Meeting_Note",
    Staff: "Client_Staff",
    Site: "Site",
    Leads: "Lead",
  };
  const expanded = await Promise.all(
    definition.fields.map(async (field) => {
      if (
        !demo &&
        !field.hidden &&
        field.type === 21 &&
        !field.fields.length &&
        children[field.name]
      )
        return {
          ...field,
          fields: parseFormFields({
            code: 3000,
            fields: await getCreatorFormFields(children[field.name]),
          }),
        };
      return field;
    }),
  );
  definition = applyCreateRules("Client", expanded, team);
  definition.initial.Is_Subform = true;
  definition.fields = definition.fields.map((f) =>
    ["Business_Name", "Country"].includes(f.name)
      ? { ...f, mandatory: true }
      : f,
  );
  return definition;
}
export async function lookupCreateOptions(
  path: string,
  query: string,
  demo: boolean,
): Promise<Option[]> {
  if (demo)
    return path.endsWith("Country")
      ? [
          {
            id: "demo-au",
            label: "Australia",
            states: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"],
          },
          { id: "demo-nz", label: "New Zealand", states: [] },
        ]
      : [{ id: "demo-option", label: "Sample option" }];
  const source = sources[path];
  if (!source)
    throw new DataError("This lookup is not yet mapped to a report.");
  const api = await loadSdk();
  const response = await creatorRequest(
    api.getRecords({
      app_name: "sungrowauservice",
      report_name: source[0],
      field_config: "custom",
      fields: `ID,${source[1]}`,
      max_records: 200,
      ...(query.trim()
        ? { criteria: `${source[1]}.contains(${JSON.stringify(query.trim())})` }
        : {}),
    }),
  );
  if ([3100, 9280].includes(response.code)) return [];
  assertSuccess(response);
  if (!Array.isArray(response.data))
    throw new DataError("Invalid lookup response.");
  return response.data.map((row) => ({
    id: String(row.ID),
    label: String(row[source[1]] ?? ""),
  }));
}
export async function selectCreateOption(
  path: string,
  option: Option,
  demo: boolean,
) {
  return path.endsWith("Country") && !demo
    ? { ...option, states: await fetchCountryStates(option.id) }
    : option;
}
/** A single Client create carries new nested rows, leaving validation/success workflows enabled. */
export async function submitCreateClient(
  definition: FormDefinition,
  values: Json,
  demo: boolean,
) {
  const data = prepareRelatedData(
    "Client",
    formPayload(definition.fields, values),
    definition,
  );
  if (Array.isArray(data.Staff))
    data.Staff = data.Staff.map((row) =>
      clientStaffContactPayload(asObject(row)),
    );
  if (data.Priority && !demo && !values.Follow_Up_Frequency)
    data.Follow_Up_Frequency = await fetchFollowUpFrequency(
      String(data.Priority),
    );
  let id = `demo-${Date.now()}`;
  if (!demo) {
    const api = await loadSdk();
    const response = await creatorRequest(
      api.addRecords({
        app_name: "sungrowauservice",
        form_name: "Client",
        payload: { data },
      }),
      true,
    ).catch((error) => {
      if (error instanceof DataError && error.code !== undefined) throw error;
      throw new ClientCreateUnknownError(
        error instanceof Error ? error.message : "Save was not confirmed.",
      );
    });
    if (!response.code)
      throw new ClientCreateUnknownError("Save was not confirmed.");
    assertSuccess(response);
    const result = response.result?.[0]?.data ?? response.data;
    const record = Array.isArray(result) ? result[0] : result;
    if (typeof record?.ID !== "string")
      throw new ClientCreateUnknownError(
        "Save was not confirmed. Check the grid before creating this client again.",
      );
    id = record.ID;
  }
  // Preserve lookup labels in the grid immediately after saving; payload uses IDs only.
  const display: Json = { ...data, ID: id };
  for (const [key, value] of Object.entries(values)) {
    if (asObject(value).id)
      display[key] = {
        ID: asObject(value).id,
        display_value: asObject(value).label,
      };
    else if (Array.isArray(value) && value.some((v) => asObject(v).id))
      display[key] = value.map((v) => ({
        ID: asObject(v).id,
        display_value: asObject(v).label,
      }));
  }
  return decodeClient(display);
}

/** Add New writes the original lookup form; the new ID is selected only after confirmation. */
export async function createClientChoice(
  path: "Customer_Type" | "Main_Product_Used",
  name: string,
  demo: boolean,
): Promise<Option> {
  const label = name.trim();
  if (!label) throw new DataError("Enter a name.");
  if (demo) return { id: `demo-choice-${crypto.randomUUID()}`, label };
  const form = path === "Customer_Type" ? "Customer_Type" : "Brand";
  const key = path === "Customer_Type" ? "Customer_Type" : "Name";
  const fields = parseFormFields({
    code: 3000,
    fields: await getCreatorFormFields(form),
  });
  const nameField = fields.find((field) => field.name === key);
  if (!nameField || nameField.hidden || nameField.readOnly)
    throw new DataError("This form does not expose an editable name field.");
  const data = formPayload(fields, { [key]: label });
  const api = await loadSdk();
  const response = await creatorRequest(
    api.addRecords({
      app_name: "sungrowauservice",
      form_name: form,
      payload: { data },
    }),
    true,
  ).catch((error) => {
    if (error instanceof DataError && error.code !== undefined) throw error;
    throw new ClientCreateUnknownError(
      "The save was not confirmed. Check the dropdown before adding this option again.",
    );
  });
  if (!response.code)
    throw new ClientCreateUnknownError("The save was not confirmed.");
  assertSuccess(response);
  const result = response.result?.[0]?.data ?? response.data;
  const record = Array.isArray(result) ? result[0] : result;
  if (typeof record?.ID !== "string")
    throw new ClientCreateUnknownError(
      "The saved option ID was not returned. Check the dropdown before adding it again.",
    );
  return { id: record.ID, label };
}
