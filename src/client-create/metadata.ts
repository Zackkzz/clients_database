import { DataError } from "../api";
import { asObject } from "./values";
import type { FormField } from "./types";
/** Normalize metadata without inventing labels or assuming an unknown type is text. */
export function parseFormFields(value: unknown): FormField[] {
  const body = asObject(value);
  if (Number(body.code) !== 3000)
    throw new DataError("Creator did not return field metadata.");
  if (!Array.isArray(body.fields) || !body.fields.length)
    throw new DataError("Creator did not return any form fields.");
  function parse(value: unknown, compound = false): FormField {
    const field = asObject(value);
    if (
      typeof field.link_name !== "string" ||
      !field.link_name ||
      (!compound && !Number.isFinite(Number(field.type)))
    )
      throw new DataError("Creator returned incomplete field metadata.");
    return {
      name: field.link_name,
      label:
        typeof field.display_name === "string"
          ? field.display_name
          : field.link_name,
      type: Number(field.type ?? 1),
      mandatory: field.mandatory === true,
      hidden: field.is_hidden === true,
      readOnly: field.is_read_only === true,
      lookup: field.is_lookup_field === true,
      ...(typeof field.ref_form === "string"
        ? { refForm: field.ref_form }
        : {}),
      ...(typeof field.max_char === "number"
        ? { maxLength: field.max_char }
        : {}),
      choices: Array.isArray(field.choices)
        ? field.choices.map((value) => {
            const choice = asObject(value);
            if (typeof choice.value !== "string")
              throw new DataError("Creator returned an invalid field choice.");
            return {
              value: typeof choice.key === "string" ? choice.key : choice.value,
              label: choice.value,
            };
          })
        : [],
      fields: Array.isArray(field.fields)
        ? field.fields.map((item) => parse(item))
        : Array.isArray(field.subfields)
          ? field.subfields.map((item) => parse(item, true))
          : [],
    };
  }
  return body.fields.map((item) => parse(item));
}
