/** Creator's form metadata, preserving native field names and type identifiers. */
export interface FormField {
  name: string;
  label: string;
  type: number;
  mandatory: boolean;
  hidden: boolean;
  readOnly: boolean;
  lookup: boolean;
  refForm?: string;
  maxLength?: number;
  choices: { value: string; label: string }[];
  fields: FormField[];
}
export type RelatedForm =
  "Client" | "Site" | "Country" | "Project_Manager" | "Sales" | "Distributor";

export type Json = Record<string, unknown>;
export interface FormDefinition {
  fields: FormField[];
  initial: Json;
}
