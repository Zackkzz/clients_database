import type { FormDefinition, RelatedForm, FormField, Json } from "./types";
import { asObject } from "./values";
/** Native create-load rules that metadata alone does not include. */
export function applyCreateRules(
  form: RelatedForm,
  fields: FormField[],
  team?: { id: string; label: string },
): FormDefinition {
  const hidden = new Set([
    "ID",
    "Added_Time",
    "Modified_Time",
    "Added_User",
    "Modified_User",
  ]);
  const initial: Json = {};
  if (form === "Project_Manager" || form === "Sales")
    ["Name", "Projects", "Project", "Lead"].forEach((name) => hidden.add(name));
  if (form === "Distributor") {
    [
      "Username",
      "System_Section",
      "Tier",
      "Dummy",
      "Promotion",
      "Upstream_Distributor",
      "Upstream_Distributor_ABN",
      "Project",
    ].forEach((name) => hidden.add(name));
    initial.Tier = 2;
  }
  if (form === "Country")
    [
      "Projects",
      "Issues",
      "PCS_Capacity",
      "BESS_Capacity",
      "Inverter_Capacity",
    ].forEach((name) => hidden.add(name));
  if (form === "Site")
    ["BOM", "Site_Address_CMP"].forEach((name) => hidden.add(name));
  if (form === "Client") {
    [
      "plain_BOM",
      "Accounts", // Excluded from the widget Add Client form for every team.
      "BOM_Stack_View",
      "Show_BOM",
      "BOM_Display",
      "PCS_Capacity",
      "BESS_Capacity",
      "Inverter_Capacity",
      "Business_Name_Upper",
      "C4",
      "Project_Documents",
      "PO",
      "BOM",
      "Project",
      "Is_Subform",
      "Team",
      "Access",
      "Flag",
    ].forEach((name) => hidden.add(name));
    if (fields.some((field) => field.name === "Is_Subform"))
      initial.Is_Subform = true;
    if (team && fields.some((field) => field.name === "Team"))
      initial.Team = [14, 15].includes(
        fields.find((field) => field.name === "Team")!.type,
      )
        ? [team.id]
        : team.id;
    if (team?.label.includes("Sales"))
      ["Service_Ticket_Default", "Accounts"].forEach((name) =>
        hidden.add(name),
      );
    else if (team)
      ["Leads", "Follow_Up_Frequency"].forEach((name) => hidden.add(name));
    if (team?.id !== "3932750000196993014")
      [
        "Follow_Up_Frequency",
        "Last_Meeting",
        "Installs_Per_Month",
        "Switch_to_Sungrow",
        "Used_Sungrow_Before",
      ].forEach((name) => hidden.add(name));
  }
  const childHidden: Record<string, string[]> =
    form === "Client"
      ? {
          Meeting_Note: ["Is_Subform", "Client"],
          Site: ["Site_Address_CMP", "Client_Name", "Client"],
          Staff: ["Contact_Number", "Contact_Email", "Client"],
          Leads: ["Client"],
          Accounts: ["Username"],
        }
      : {};
  return {
    initial,
    fields: fields.map((field) => ({
      ...field,
      hidden: field.hidden || hidden.has(field.name),
      readOnly:
        field.readOnly || (form === "Client" && field.name === "Last_Meeting"),
      fields: field.fields.map((child) => ({
        ...child,
        hidden:
          child.hidden ||
          Boolean(childHidden[field.name]?.includes(child.name)),
      })),
    })),
  };
}

/** Reproduce native text normalization before Creator's validation workflows run. */
export function prepareRelatedData(
  form: RelatedForm,
  values: Json,
  definition: FormDefinition,
): Json {
  const data = { ...definition.initial, ...values };
  if (
    form === "Site" &&
    !definition.fields.some((field) => field.name === "Site_Address_CMP")
  ) {
    throw new Error(
      "Site_Address_CMP must be available in the form metadata so the existing duplicate-address validation can run correctly.",
    );
  }

  if (form === "Client" && typeof data.Business_Name === "string") {
    // Match the native trim/remove-tab input rule.
    data.Business_Name = data.Business_Name.trim().split("\t").join("");
    if (Array.isArray(data.Meeting_Note))
      data.Meeting_Note = data.Meeting_Note.map((row) => ({
        ...asObject(row),
        Is_Subform: true,
      }));
    if (Array.isArray(data.Site)) {
      const siteFields =
        definition.fields.find((field) => field.name === "Site")?.fields ?? [];
      data.Site = data.Site.map((row) =>
        prepareRelatedData("Site", asObject(row), {
          fields: siteFields,
          initial: {},
        }),
      );
    }
  }
  if (
    form === "Site" &&
    typeof data.Site_Address === "string" &&
    definition.fields.some((f) => f.name === "Site_Address_CMP")
  )
    data.Site_Address_CMP = data.Site_Address.split(" ")
      .join("")
      .split(",")
      .join("");
  if (form === "Distributor") {
    for (const name of ["ABN", "Contact_Number"]) {
      if (typeof data[name] === "string")
        data[name] = data[name].trim().split(" ").join("").split("-").join("");
    }
  }
  return data;
}

/** Lookup IDs and ordinary data have deliberately different payload representations. */
export function lookupId(value: unknown): string {
  const id = asObject(value).id;
  return typeof id === "string" ? id : "";
}
