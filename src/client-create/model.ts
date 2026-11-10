import { asObject, creatorDate, creatorDateTime } from "./values";
import { lookupId } from "./rules";
import type { FormField, Json } from "./types";
const editable = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 21, 27, 29, 30, 34,
]);
export function isEditable(field: FormField): boolean {
  return !field.hidden && !field.readOnly && ![9, 20, 24].includes(field.type);
}
export function supportedField(field: FormField): boolean {
  return (
    editable.has(field.type) &&
    (![21, 29, 30].includes(field.type) || field.fields.length > 0)
  );
}
/** Validate and serialize only metadata-exposed, editable fields. */
export function formPayload(fields: FormField[], values: Json): Json {
  const data: Json = {};
  for (const field of countryFields(fields, values).filter(isEditable)) {
    const value = values[field.name];
    const blank =
      value == null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && !value.length);
    if (!supportedField(field)) {
      if (field.mandatory)
        throw new Error(
          `${field.label} is required but this field type is not supported in this dialog.`,
        );
      continue;
    }
    if (field.mandatory && (blank || (field.type === 16 && value !== true)))
      throw new Error(`Enter ${field.label}.`);
    if (blank) continue;
    if (field.lookup) {
      if ([14, 15].includes(field.type)) {
        if (!Array.isArray(value) || value.some((item) => !lookupId(item)))
          throw new Error(`Select ${field.label}.`);
        data[field.name] = value.map(lookupId);
      } else {
        if (!lookupId(value)) throw new Error(`Select ${field.label}.`);
        data[field.name] = lookupId(value);
      }
    } else if (field.type === 21) {
      if (!Array.isArray(value)) throw new Error(`Invalid ${field.label}.`);
      data[field.name] = value.map((row) =>
        formPayload(field.fields, asObject(row)),
      );
    } else if ([29, 30].includes(field.type)) {
      data[field.name] = formPayload(field.fields, asObject(value));
    } else if ([5, 6, 7, 8].includes(field.type)) {
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        (field.type === 5 && !Number.isSafeInteger(number))
      )
        throw new Error(`Enter a valid number for ${field.label}.`);
      data[field.name] = number;
    } else if (field.type === 10) data[field.name] = creatorDate(String(value));
    else if (field.type === 11)
      data[field.name] = creatorDateTime(String(value));
    else {
      if (field.maxLength && String(value).length > field.maxLength)
        throw new Error(
          `${field.label} exceeds ${field.maxLength} characters.`,
        );
      if ([12, 13, 14, 15].includes(field.type)) {
        const selected = Array.isArray(value) ? value : [value];
        if (
          selected.some(
            (item) => !field.choices.some((choice) => choice.value === item),
          )
        )
          throw new Error(`Select an available ${field.label}.`);
      }
      data[field.name] = value;
    }
  }
  return data;
}

/** Country lookup options carry their own state choices, including inside Client lead rows. */
export function countryFields(fields: FormField[], values: Json): FormField[] {
  const country = asObject(values.Country);
  if (!Array.isArray(country.states)) return fields;
  return fields.map((field) =>
    field.name === "State"
      ? {
          ...field,
          hidden: (country.states as unknown[]).length === 0,
          choices: (country.states as unknown[]).map((state: unknown) => ({
            value: String(state),
            label: String(state),
          })),
        }
      : field,
  );
}
