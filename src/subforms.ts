import {
  isVisibleSubformField,
  isWritableSubformField,
} from "./subform-workflows";
import { displayValue } from "./model";
import {
  subforms,
  type SubformField,
  type SubformDefinition,
} from "./subform-schema";

export type SubformValue = string | boolean | string[];
export interface SubformRow {
  id: string;
  revision: string;
  values: Record<string, SubformValue>;
  labels?: Record<string, string>;
}
export interface SubformOption {
  id: string;
  label: string;
}
export interface SubformSnapshot {
  rows: SubformRow[];
  options: Record<string, SubformOption[]>;
  definition?: SubformDefinition;
  readOnlyReason?: string;
  warnings?: string[];
  bomDetailAllowed?: boolean;
}
export interface SubformStore {
  todoCreator?: import("./todo-create").ToDoCreator;
  list(clientId: string, subform: string): Promise<SubformSnapshot>;
  save(
    clientId: string,
    subform: string,
    values: Record<string, SubformValue>,
    existing?: SubformRow,
    requestId?: string,
  ): Promise<SubformRow>;
  remove(
    clientId: string,
    subform: string,
    row: SubformRow,
    requestId?: string,
  ): Promise<void>;
  upload(
    clientId: string,
    subform: string,
    row: SubformRow,
    field: string,
    file: File,
  ): Promise<void>;
}
export function subformDefinition(key: string) {
  const form = subforms.find((form) => form.key === key);
  if (!form) throw new Error("Unknown Client subform.");
  return form;
}
export function editableSubformFields(key: string, fields?: SubformField[]) {
  return (fields ?? subformDefinition(key).fields).filter(
    (field) =>
      ![9, 20, 21, 24, 26].includes(field.type) &&
      field.link_name !== "Client" &&
      isWritableSubformField(key, field.link_name),
  );
}
export function subformLabel(field: SubformField) {
  // Several fields have duplicate labels; distinguish encrypted and legacy variants.
  return (
    (field.display_name || field.link_name).replace(/\s*\*$/, "") +
    (field.link_name.endsWith("_Encrypted")
      ? " (encrypted)"
      : field.link_name.endsWith("_Legacy")
        ? " (legacy)"
        : "")
  );
}
export function initialSubformValues(
  key: string,
  fields?: SubformField[],
): Record<string, SubformValue> {
  const values = Object.fromEntries(
    editableSubformFields(key, fields)
      .filter((field) => field.type !== 19)
      .map((field) => [
        field.link_name,
        field.type === 16
          ? false
          : field.type === 14 || field.type === 15
            ? []
            : "",
      ]),
  );
  if (key === "Meeting_Note" && Object.hasOwn(values, "Date_field")) {
    const today = new Date();
    values.Date_field = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  return values;
}
/** Validate only allowlisted, writable fields; record IDs, file values and server fields never enter normal writes. */
export function validateSubformValues(
  key: string,
  values: Record<string, SubformValue>,
  fields?: SubformField[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of editableSubformFields(key, fields)) {
    if (field.type === 19) continue;
    const value = values[field.link_name];
    const text = typeof value === "string" ? value.trim() : "";
    if (
      field.mandatory &&
      (value == null || value === "" || (Array.isArray(value) && !value.length))
    ) {
      errors[field.link_name] = "Required";
      continue;
    }
    if (
      value == null ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    )
      continue;
    if (field.type === 16) {
      if (typeof value !== "boolean")
        errors[field.link_name] = "Choose Yes or No";
      continue;
    }
    if (field.type === 14 || field.type === 15) {
      if (
        !Array.isArray(value) ||
        !value.every((item) => typeof item === "string" && item.trim())
      )
        errors[field.link_name] = "Choose valid values";
    } else if (typeof value !== "string")
      errors[field.link_name] = "Enter a valid value";
    if (field.is_lookup_field) {
      if (
        !(Array.isArray(value) ? value : [value]).every(
          (id) => typeof id === "string" && id.trim(),
        )
      )
        errors[field.link_name] = "Choose a record";
      continue;
    }
    if (field.max_char && text.length > field.max_char)
      errors[field.link_name] = `Maximum ${field.max_char} characters`;
    if (
      field.choices?.length &&
      !(Array.isArray(value) ? value : [value]).every((item) =>
        field.choices!.some((choice) => choice.value === item),
      )
    )
      errors[field.link_name] = "Choose a configured option";
    if (
      [5, 6, 7, 8].includes(field.type) &&
      (!Number.isFinite(Number(text)) ||
        (field.type === 5 && !Number.isInteger(Number(text))))
    )
      errors[field.link_name] =
        field.type === 5 ? "Enter a whole number" : "Enter a number";
    if (field.type === 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      errors[field.link_name] = "Enter a valid email";
    if (field.type === 10 || field.type === 11) {
      const day = text.slice(0, 10);
      const date = new Date(day + "T00:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== day ||
        (field.type === 11 &&
          !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(text))
      )
        errors[field.link_name] = "Choose a valid date";
    }
  }
  return errors;
}
export function cleanSubformValues(
  key: string,
  values: Record<string, SubformValue>,
  fields?: SubformField[],
) {
  const errors = validateSubformValues(key, values, fields);
  if (Object.keys(errors).length)
    throw new Error("Correct the highlighted fields before saving.");
  return Object.fromEntries(
    editableSubformFields(key, fields)
      .filter(
        (field) => field.type !== 19 && Object.hasOwn(values, field.link_name),
      )
      .map((field) => [
        field.link_name,
        typeof values[field.link_name] === "string"
          ? (values[field.link_name] as string).trim()
          : values[field.link_name],
      ]),
  );
}
export function subformRowLabel(
  key: string,
  row: SubformRow,
  fields?: SubformField[],
) {
  const field = (fields ?? subformDefinition(key).fields).find(
    (field) =>
      isVisibleSubformField(key, field.link_name) &&
      ![9, 16, 19, 24].includes(field.type) &&
      displayValue(row.values[field.link_name]),
  );
  return field
    ? row.labels?.[field.link_name] || displayValue(row.values[field.link_name])
    : "Untitled row";
}
