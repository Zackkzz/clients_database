import {
  assertSuccess,
  creatorRequest,
  DataError,
  type CreatorData,
} from "./api";
import type { CreatorFieldMetadata } from "./form-metadata";
import { parseFormFields } from "./client-create/metadata";
import { formPayload } from "./client-create/model";
import type { SubformField } from "./subform-schema";
import type { SubformOption, SubformValue } from "./subforms";

export class ToDoCreateUnknownError extends DataError {}
const visible = [
  "Subject_field",
  "Due_Date",
  "Detail",
  "Staff",
  "Access",
  "Colour_Group",
];
export const todoDefaults = { Access: "My Team", Colour_Group: "Green" };
export interface ToDoCreator {
  load(): Promise<{
    fields: SubformField[];
    staff: SubformOption[];
    warning?: string;
  }>;
  save(
    fields: SubformField[],
    values: Record<string, SubformValue>,
  ): Promise<SubformOption>;
}
/** Mirrors To_Do Create Load for a Meeting Note; the parent note establishes the link on save. */
export function createToDoCreator(
  getApi: () => Promise<CreatorData>,
  getFields: (form: string) => Promise<CreatorFieldMetadata[]>,
  records: (report: string) => Promise<Record<string, unknown>[]>,
): ToDoCreator {
  return {
    async load() {
      const metadata = await getFields("To_Do");
      const fields = visible.flatMap((name) =>
        metadata.filter((f) => f.link_name === name),
      ) as SubformField[];
      if (!fields.some((f) => f.link_name === "Subject_field"))
        throw new DataError("To-Do Subject metadata is unavailable.");
      let staff: SubformOption[] = [];
      let warning: string | undefined;
      try {
        staff = (await records("Staff_List")).map((row) => ({
          id: String(row.ID),
          label: String(row.Staff_name ?? row.ID),
        }));
      } catch {
        warning =
          "Staff choices could not be loaded. You can create an unassigned To-Do or reopen this window to retry.";
      }
      return { fields, staff, warning };
    },
    async save(fields, values) {
      const parsed = parseFormFields({ code: 3000, fields });
      const normalized = {
        ...values,
        Staff: Array.isArray(values.Staff)
          ? values.Staff.map((id) => ({ id }))
          : [],
      };
      const data = {
        ...formPayload(parsed, normalized),
        Status: "Pending",
        Is_Subform_Meeting_Note: false,
      };
      const api = await getApi();
      // Do not skip validation/success workflows: Creator populates Created_by on success.
      const response = await creatorRequest(
        api.addRecords({
          app_name: "sungrowauservice",
          form_name: "To_Do",
          payload: { data },
        }),
        true,
      ).catch((error) => {
        if (error instanceof DataError && error.code !== undefined) throw error;
        throw new ToDoCreateUnknownError(
          "Creation was not confirmed. Check To-Do records before creating it again.",
        );
      });
      if (!response.code)
        throw new ToDoCreateUnknownError(
          "Creation was not confirmed. Check To-Do records before creating it again.",
        );
      assertSuccess(response);
      const result = response.result?.[0]?.data ?? response.data;
      const row = Array.isArray(result) ? result[0] : result;
      if (typeof row?.ID !== "string")
        throw new ToDoCreateUnknownError(
          "Creator did not return the new ID. Check To-Do records before creating it again.",
        );
      return { id: row.ID, label: String(values.Subject_field).trim() };
    },
  };
}

/** Demo metadata follows the exported form and never calls Creator. */
export function createDemoToDoCreator(
  onCreated: (option: SubformOption) => void,
): ToDoCreator {
  const fields: SubformField[] = [
    {
      link_name: "Subject_field",
      display_name: "Subject",
      type: 1,
      mandatory: true,
    },
    { link_name: "Due_Date", display_name: "Due Date", type: 10 },
    { link_name: "Detail", display_name: "Detail", type: 2 },
    {
      link_name: "Staff",
      display_name: "Staff",
      type: 14,
      is_lookup_field: true,
    },
    ...(
      [
        ["Access", "Access", ["My Team", "Only Me"]],
        [
          "Colour_Group",
          "Colour Group",
          ["Green", "Blue", "Red", "Purple", "Orange"],
        ],
      ] as const
    ).map(([link_name, display_name, choices]) => ({
      link_name,
      display_name,
      type: 12,
      mandatory: true,
      choices: choices.map((value) => ({ key: value, value })),
    })),
  ];
  return {
    async load() {
      return { fields, staff: [{ id: "demo-staff", label: "Demo Staff" }] };
    },
    async save(fields, values) {
      formPayload(parseFormFields({ code: 3000, fields }), {
        ...values,
        Staff: Array.isArray(values.Staff)
          ? values.Staff.map((id) => ({ id }))
          : [],
      });
      const option = {
        id: `demo-todo-${crypto.randomUUID()}`,
        label: String(values.Subject_field).trim(),
      };
      onCreated(option);
      return option;
    },
  };
}
