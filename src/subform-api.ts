import { latestMeeting } from "./latest-meeting";
import { createToDoCreator, createDemoToDoCreator } from "./todo-create";
import { buildBomStack } from "./bom-stack";
import { clientEditDefaults } from "./client-load-rules";
import { clientStaffContactPayload } from "./client-load-rules";
import { fetchCountryStates, stateSelectionError } from "./form-rules";
import {
  assertSubformWritable,
  isVisibleSubformField,
} from "./subform-workflows";
import {
  creatorRequest,
  assertSuccess,
  DataError,
  loadSdk,
  type CreatorData,
} from "./api";
import {
  getCreatorFormFields,
  type CreatorFieldMetadata,
} from "./form-metadata";
import { subformSources, lookupSources } from "./subform-sources";
import { type SubformDefinition, type SubformField } from "./subform-schema";
import { displayValue } from "./model";
import {
  cleanSubformValues,
  subformDefinition,
  type SubformRow,
  type SubformSnapshot,
  type SubformStore,
  type SubformValue,
} from "./subforms";

const app_name = "sungrowauservice";
const systemFields = new Set([
  "ID",
  "Added_User",
  "Added_Time",
  "Modified_User",
  "Modified_Time",
  "Is_Subform",
]);
const supportedTypes = new Set([
  1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 19, 27,
]);
function id(value: unknown): string {
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw new DataError("Creator returned an invalid record ID.");
  return value;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/** The exported application uses dd/MM/yyyy and 24-hour local time. No UTC conversion. */
export function creatorDate(value: string, outbound: boolean): string {
  if (!value) return "";
  const match = outbound
    ? /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2})(?::\d{2})?)?$/.exec(value)
    : /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}:\d{2})(?::\d{2})?)?$/.exec(value);
  if (!match) return value;
  return outbound
    ? `${match[3]}/${match[2]}/${match[1]}${match[4] ? " " + match[4] + ":00" : ""}`
    : `${match[3]}-${match[2]}-${match[1]}${match[4] ? "T" + match[4] : ""}`;
}
function lookupLabel(row: Record<string, unknown>): string {
  const preferred = [
    "display_value",
    "Name",
    "Business_Name",
    "Staff_name",
    "Country",
    "Site_Address",
    "Project_ID",
    "C4_Number",
    "PO_Number",
    "Product_Model",
    "Model",
    "Subject_field",
    "Task",
  ];
  for (const field of preferred)
    if (row[field]) return displayValue(row[field]);
  return (
    displayValue(
      Object.entries(row).find(
        ([key, value]) =>
          !systemFields.has(key) &&
          key !== "Client" &&
          value &&
          !Array.isArray(value),
      )?.[1],
    ) || String(row.ID)
  );
}

export class SubformSaveUnknownError extends DataError {}
export class ParentWorkflowError extends SubformSaveUnknownError {}

/** Standard Creator APIs only. Lookup/report permissions remain those of the portal user. */
export function createPortalSubformStore(
  getApi: () => Promise<CreatorData> = loadSdk,
  uploadFile: (config: Record<string, unknown>) => Promise<unknown> = async (
    config,
  ) => {
    await loadSdk();
    const api = window.ZOHO?.CREATOR?.FILE;
    if (!api)
      throw new DataError(
        "File upload is unavailable in this Creator session.",
      );
    return api.uploadFile(config);
  },
  getFields: (
    form: string,
  ) => Promise<CreatorFieldMetadata[]> = getCreatorFormFields,
): SubformStore {
  const definitions = new Map<string, SubformDefinition>();
  // Do not retry a possibly committed create. Creator's form API has no idempotency key.
  const attempts = new Map<
    string,
    {
      fingerprint: string;
      result?: SubformRow;
      unknown?: boolean;
      parentError?: ParentWorkflowError;
    }
  >();
  async function records(report_name: string, criteria?: string) {
    const api = await getApi();
    const all: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    do {
      const result = await creatorRequest(
        api.getRecords({
          app_name,
          report_name,
          field_config: "all",
          max_records: 1000,
          ...(criteria ? { criteria } : {}),
          ...(cursor ? { record_cursor: cursor } : {}),
        }),
      );
      if ([3100, 9280].includes(result.code) && !cursor) return [];
      assertSuccess(result);
      if (!Array.isArray(result.data))
        throw new DataError("Creator returned invalid subform records.");
      all.push(...result.data);
      cursor = result.record_cursor;
      if ((result.more_records && !cursor) || (cursor && seen.has(cursor)))
        throw new DataError("Creator returned incomplete subform pagination.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return all;
  }
  async function definition(key: string) {
    const base = subformDefinition(key);
    if (definitions.has(key)) return definitions.get(key)!;
    const source = subformSources[key];
    const metadata = await getFields(source?.form ?? "Client");
    if (
      source &&
      !metadata.some(
        (field) => field.link_name === "Client" && field.is_lookup_field,
      )
    ) {
      throw new DataError(
        "The source form no longer exposes its Client lookup. Check the form configuration.",
      );
    }
    const embedded = metadata.find((field) => field.link_name === key);
    const fields = source ? metadata : embedded?.fields;
    if (!Array.isArray(fields))
      throw new DataError(
        "Creator did not return the subform field definitions.",
      );
    const result: SubformDefinition = {
      ...base,
      form: source?.form ?? base.form,
      fields: fields
        .filter(
          (field: SubformField) =>
            !systemFields.has(field.link_name) &&
            field.link_name !== "Client" &&
            isVisibleSubformField(key, field.link_name),
        )
        .map((field: SubformField) => ({ ...field })),
    };
    definitions.set(key, result);
    return result;
  }
  function decode(
    record: Record<string, unknown>,
    def: SubformDefinition,
  ): SubformRow {
    const values: Record<string, SubformValue> = {};
    const labels: Record<string, string> = {};
    for (const field of def.fields) {
      const raw = record[field.link_name];
      if (raw == null) continue;
      if (field.is_lookup_field) {
        const ids = (Array.isArray(raw) ? raw : [raw])
          .map((item) => (object(item) ? String(item.ID ?? "") : String(item)))
          .filter(Boolean);
        values[field.link_name] = [14, 15].includes(field.type)
          ? ids
          : (ids[0] ?? "");
        labels[field.link_name] = displayValue(raw);
      } else if ([14, 15].includes(field.type))
        values[field.link_name] = Array.isArray(raw)
          ? raw.map(String)
          : [String(raw)];
      else if (field.type === 16)
        values[field.link_name] = raw === true || raw === "true";
      else if ([10, 11].includes(field.type))
        values[field.link_name] = creatorDate(String(raw), false);
      else values[field.link_name] = displayValue(raw);
    }
    return {
      id: id(record.ID),
      revision: JSON.stringify(values),
      values,
      labels,
    };
  }
  async function verifyClient(clientId: string) {
    id(clientId);
    const parents = await records("Client_Legacy", `ID == ${clientId}`);
    if (parents.length !== 1)
      throw new DataError(
        "This Client is not accessible in your portal session.",
      );
    return parents[0];
  }
  async function syncParent(
    clientId: string,
    meeting?: SubformRow,
    deletedMeetingId?: string,
  ) {
    const api = await getApi();
    try {
      const data: Record<string, unknown> = clientEditDefaults();
      if (meeting?.values.Date_field || deletedMeetingId) {
        const notes = await records(
          "Meeting_Notes",
          `Client == ${id(clientId)}`,
        );
        // Include the confirmed row directly: report reads may lag behind creation.
        const candidates = notes
          .filter(
            (row) => row.ID !== meeting?.id && row.ID !== deletedMeetingId,
          )
          .map((row) => ({
            id: id(row.ID),
            date: displayValue(row.Date_field),
          }));
        if (meeting)
          candidates.push({
            id: meeting.id,
            date: String(meeting.values.Date_field),
          });
        // Report visibility can omit a linked note; retain a readable later parent
        // lookup rather than moving Last_Meeting backwards based on a partial list.
        const parent = await verifyClient(clientId);
        const previous = parent.Last_Meeting;
        if (
          previous &&
          typeof previous === "object" &&
          !Array.isArray(previous)
        ) {
          const lookup = previous as Record<string, unknown>;
          if (
            lookup.ID &&
            lookup.ID !== meeting?.id &&
            lookup.ID !== deletedMeetingId &&
            !candidates.some((row) => row.id === lookup.ID)
          )
            candidates.push({ id: id(lookup.ID), date: displayValue(lookup) });
        }
        data.Last_Meeting = latestMeeting(candidates);
      }
      assertSuccess(
        await creatorRequest(
          api.updateRecordById({
            app_name,
            report_name: "Client_Legacy",
            id: clientId,
            payload: { data },
          }),
          true,
        ),
      );
    } catch (reason) {
      throw new ParentWorkflowError(
        `The related row was saved, but the Client workflow update did not complete successfully. Refresh and check the Client before making another change. ${reason instanceof Error ? reason.message : ""}`,
      );
    }
  }
  async function dependentDefinition(clientId: string, key: string) {
    const def = structuredClone(await definition(key));
    if (key === "Staff") {
      const allStaff = await records("Client_Staffs");
      const roles = [
        ...new Set(
          allStaff.map((row) => String(row.Role ?? "")).filter(Boolean),
        ),
      ];
      const field = def.fields.find((field) => field.link_name === "Role");
      if (field) field.choices = roles.map((value) => ({ value, key: value }));
    }

    if (key === "Project_Documents" || key === "BOM") {
      const c4s = await records("C4_Report", `Client == ${id(clientId)}`);
      const values = [
        ...new Set(
          c4s.map((row) => String(row.C4_Number ?? "").trim()).filter(Boolean),
        ),
      ];
      const field = def.fields.find(
        (field) =>
          field.link_name ===
          (key === "BOM" ? "C4_Number_Project" : "C4_Project"),
      );
      if (field) field.choices = values.map((value) => ({ value, key: value }));
    }
    if (key === "BOM") {
      const sites = await records("Sites", `Client == ${id(clientId)}`);
      const values = [
        ...new Set(
          sites.map((row) => String(row.Site_Address ?? "")).filter(Boolean),
        ),
      ];
      const field = def.fields.find(
        (field) => field.link_name === "Site_Project",
      );
      if (field) field.choices = values.map((value) => ({ value, key: value }));
    }
    return def;
  }
  async function currentRow(
    clientId: string,
    key: string,
    existing: SubformRow,
  ) {
    const source = subformSources[key];
    const def = await definition(key);
    const rows = await records(
      source.report,
      `ID == ${id(existing.id)} && Client == ${id(clientId)}`,
    );
    if (
      rows.length !== 1 ||
      decode(rows[0], def).revision !== existing.revision
    )
      throw new DataError(
        "This row changed or is no longer available. Reload before saving.",
      );
  }
  const completedDeletes = new Map<string, ParentWorkflowError | null>();
  return {
    todoCreator: createToDoCreator(getApi, getFields, records),
    async list(clientId, key) {
      if (key === "BOM_Stack_View") {
        await verifyClient(clientId);
        const rows = await records("BOM_Record", `Client == ${id(clientId)}`);
        return {
          definition: subformDefinition(key),
          bomDetailAllowed: rows.length < 300,
          rows: buildBomStack(rows),
          options: {},
          readOnlyReason: "Generated BOM summary",
        };
      }
      const def = await dependentDefinition(clientId, key);
      const parent = await verifyClient(clientId);
      const source = subformSources[key];
      if (!source) {
        const raw = parent[key];
        return {
          definition: def,
          rows: Array.isArray(raw)
            ? raw.filter(object).map((record) => decode(record, def))
            : [],
          options: {},
          readOnlyReason:
            key === "BOM_Stack_View"
              ? "BOM Stack View is generated by the original Client workflow."
              : "This inline subform has no standalone form for Create Record. It remains read-only here.",
        };
      }
      const rawRows = await records(source.report, `Client == ${id(clientId)}`);
      if (key === "BOM" && rawRows.length >= 300)
        return {
          definition: def,
          rows: [],
          options: {},
          bomDetailAllowed: false,
          readOnlyReason:
            "This Client has 300 or more BOM records. Use BOM Stack View.",
        };
      const options: SubformSnapshot["options"] = {};
      const warnings: string[] = [];
      const lookupCache = new Map<string, Promise<Record<string, unknown>[]>>();
      await Promise.all(
        def.fields
          .filter((field) => field.is_lookup_field)
          .map(async (field) => {
            const target = lookupSources[source.form + "." + field.link_name];
            if (!target) {
              warnings.push(
                `Lookup choices for ${field.display_name} are unavailable.`,
              );
              return;
            }
            try {
              // Match the native Meeting Note lookup: this Client or unassigned tasks.
              const criteria =
                source.form === "Meeting_Note" && field.link_name === "To_Do"
                  ? `(Client == ${id(clientId)} || Client == null)`
                  : undefined;
              const cacheKey = target.report + (criteria ?? "");
              if (!lookupCache.has(cacheKey))
                lookupCache.set(cacheKey, records(target.report, criteria));
              const choices = await lookupCache.get(cacheKey)!;
              options[field.link_name] = choices.map((row) => ({
                id: id(row.ID),
                label:
                  source.form === "Meeting_Note" && field.link_name === "To_Do"
                    ? displayValue(row.Subject_field) || id(row.ID)
                    : lookupLabel(row),
              }));
            } catch {
              warnings.push(
                `Cannot load ${field.display_name} choices. Check access to ${target.report}.`,
              );
            }
          }),
      );
      const unsupported = def.fields.filter(
        (field) => field.mandatory && !supportedTypes.has(field.type),
      );
      return {
        rows: rawRows.map((record) => decode(record, def)),
        options,
        definition: {
          ...def,
          fields: def.fields.filter((field) => supportedTypes.has(field.type)),
        },
        warnings,
        ...(unsupported.length
          ? {
              readOnlyReason: `Required fields need controls not supported yet: ${unsupported.map((field) => field.display_name).join(", ")}.`,
            }
          : {}),
      };
    },
    async save(
      clientId,
      key,
      values,
      existing,
      requestId = crypto.randomUUID(),
    ) {
      const priorFailure = attempts.get(requestId)?.parentError;
      if (priorFailure) throw priorFailure;
      assertSubformWritable(key);
      const source = subformSources[key];
      if (!source)
        throw new DataError(
          "This inline subform has no standalone form for Create Record.",
        );
      if (
        key === "BOM" &&
        (await records("BOM_Record", `Client == ${id(clientId)}`)).length >= 300
      )
        throw new DataError(
          "This Client has 300 or more BOM records. Use BOM Stack View.",
        );
      const def = await dependentDefinition(clientId, key);
      let fields = def.fields;
      if (
        fields.some((field) => field.link_name === "Country") &&
        fields.some((field) => field.link_name === "State")
      ) {
        const country = String(values.Country ?? "");
        const states = await fetchCountryStates(country, getApi);
        const invalid = stateSelectionError(
          country,
          String(values.State ?? ""),
          states,
        );
        if (invalid) throw new DataError(invalid);
        fields = fields.map((field) =>
          field.link_name === "State"
            ? {
                ...field,
                choices: states.map((value) => ({ value, key: value })),
                mandatory: key === "Leads" && states.length > 0,
              }
            : field,
        );
      }
      for (const field of fields) {
        if (
          (key === "Project_Documents" && field.link_name === "C4_Project") ||
          (key === "BOM" &&
            ["C4_Number_Project", "Site_Project"].includes(field.link_name))
        ) {
          const value = values[field.link_name];
          if (
            value &&
            value !== existing?.values[field.link_name] &&
            !field.choices?.some((choice) => choice.value === value)
          )
            throw new DataError(
              `Choose ${field.display_name} from this Client's related records.`,
            );
          if (
            value &&
            value === existing?.values[field.link_name] &&
            !field.choices?.some((choice) => choice.value === value)
          )
            field.choices = [
              ...(field.choices ?? []),
              { key: String(value), value: String(value) },
            ];
        }
      }
      const cleaned = cleanSubformValues(key, values, fields);
      const fingerprint = JSON.stringify([
        clientId,
        key,
        existing?.id,
        cleaned,
      ]);
      const previous = attempts.get(requestId);
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new DataError("Start a new save after changing the draft.");
        if (previous.parentError) throw previous.parentError;
        if (previous.result) return structuredClone(previous.result);
        throw new SubformSaveUnknownError(
          "The previous save may have completed. Refresh and check the rows before creating again.",
        );
      }
      await verifyClient(clientId);
      if (existing) await currentRow(clientId, key, existing);
      const data: Record<string, unknown> = {
        ...(key === "Staff" ? clientStaffContactPayload(cleaned) : cleaned),
        Client: clientId,
      };
      if (key === "Meeting_Note") data.Is_Subform = true;
      for (const field of def.fields)
        if (
          [10, 11].includes(field.type) &&
          typeof data[field.link_name] === "string"
        )
          data[field.link_name] = creatorDate(
            data[field.link_name] as string,
            true,
          );
      const api = await getApi();
      attempts.set(requestId, { fingerprint, unknown: true });
      try {
        // Omit skip_workflow: Creator runs the form's supported validation/success workflows.
        const response = await creatorRequest(
          existing
            ? api.updateRecordById({
                app_name,
                report_name: source.report,
                id: existing.id,
                payload: { data },
              })
            : api.addRecords({
                app_name,
                form_name: source.form,
                payload: { data },
              }),
          true,
        );
        assertSuccess(response);
        const item = response.result?.[0]?.data ?? response.data;
        const record = Array.isArray(item) ? item[0] : item;
        const saved: SubformRow = {
          id: existing?.id ?? id(record?.ID),
          revision: JSON.stringify(cleaned),
          values:
            key === "Staff"
              ? (Object.fromEntries(
                  Object.entries(cleaned).map(([field, value]) => [
                    field,
                    data[field] ?? value,
                  ]),
                ) as Record<string, SubformValue>)
              : cleaned,
        };
        saved.revision = JSON.stringify(saved.values);
        attempts.set(requestId, { fingerprint, result: saved });
        try {
          await syncParent(
            clientId,
            key === "Meeting_Note" ? saved : undefined,
          );
        } catch (reason) {
          const failure = reason as ParentWorkflowError;
          attempts.set(requestId, {
            fingerprint,
            result: saved,
            parentError: failure,
          });
          throw failure;
        }
        return saved;
      } catch (error) {
        if (error instanceof ParentWorkflowError) throw error;
        if (
          error instanceof DataError &&
          typeof error.code === "number" &&
          error.code !== 3000
        ) {
          attempts.delete(requestId);
          throw error;
        }
        throw new SubformSaveUnknownError(
          `Save outcome is uncertain. Refresh and check before creating again. ${error instanceof Error ? error.message : ""}`,
        );
      }
    },
    async remove(clientId, key, existing) {
      const deleteKey = JSON.stringify([
        clientId,
        key,
        existing.id,
        existing.revision,
      ]);
      if (completedDeletes.has(deleteKey)) {
        const failure = completedDeletes.get(deleteKey);
        if (failure) throw failure;
        return;
      }
      assertSubformWritable(key);
      const source = subformSources[key];
      if (!source)
        throw new DataError(
          "Inline subform deletion is unavailable through a standalone form.",
        );
      await verifyClient(clientId);
      await currentRow(clientId, key, existing);
      const api = await getApi();
      assertSuccess(
        await creatorRequest(
          api.deleteRecordById({
            app_name,
            report_name: source.report,
            id: existing.id,
            payload: {},
          }),
          true,
        ),
      );
      completedDeletes.set(deleteKey, null);
      try {
        await syncParent(
          clientId,
          undefined,
          key === "Meeting_Note" ? existing.id : undefined,
        );
      } catch (reason) {
        const failure = new ParentWorkflowError(
          `The related row was deleted, but the Client workflow update failed. Refresh and check the Client. ${reason instanceof Error ? reason.message : ""}`,
        );
        completedDeletes.set(deleteKey, failure);
        throw failure;
      }
    },
    async upload(clientId, key, existing, field, file) {
      const def = await definition(key);
      const source = subformSources[key];
      if (
        !source ||
        !def.fields.some((item) => item.link_name === field && item.type === 19)
      )
        throw new DataError("Unknown file field.");
      if (file.size > 50 * 1024 * 1024)
        throw new DataError("The file must be 50 MB or smaller.");
      await verifyClient(clientId);
      const rows = await records(
        source.report,
        `ID == ${id(existing.id)} && Client == ${id(clientId)}`,
      );
      if (rows.length !== 1)
        throw new DataError("This row does not belong to the selected Client.");
      assertSuccess(
        await creatorRequest(
          uploadFile({
            app_name,
            report_name: source.report,
            id: existing.id,
            field_name: field,
            file,
          }) as Parameters<typeof creatorRequest>[0],
          true,
        ),
      );
    },
  };
}
/** Session-only demo store exercises identical draft validation without touching Creator. */
export function createDemoSubformStore(): SubformStore {
  const todos: { id: string; label: string }[] = [];
  const data = new Map<string, SubformSnapshot>();
  const responses = new Map<string, SubformRow | true>();
  function snapshot(client: string, form: string) {
    subformDefinition(form);
    const key = client + ":" + form;
    if (!data.has(key)) {
      const options: SubformSnapshot["options"] = {};
      for (const field of subformDefinition(form).fields) {
        if (field.is_lookup_field)
          options[field.link_name] =
            field.link_name === "Country"
              ? [
                  { id: "demo-au", label: "Australia" },
                  { id: "demo-nz", label: "New Zealand" },
                ]
              : [
                  { id: "demo-option-1", label: "Demo option 1" },
                  { id: "demo-option-2", label: "Demo option 2" },
                ];
      }
      data.set(key, { rows: [], options });
    }
    return data.get(key)!;
  }
  function check(rows: SubformRow[], current: SubformRow) {
    const found = rows.find((row) => row.id === current.id);
    if (!found || found.revision !== current.revision)
      throw new DataError("This row changed. Reload before saving.");
  }
  return {
    todoCreator: createDemoToDoCreator((option) => todos.push(option)),
    async list(client, form) {
      const result = structuredClone(snapshot(client, form));
      if (form === "Meeting_Note")
        result.options.To_Do = [...(result.options.To_Do ?? []), ...todos];
      return result;
    },
    async save(
      client,
      form,
      values,
      existing,
      requestId = crypto.randomUUID(),
    ) {
      assertSubformWritable(form);
      const cacheKey = client + ":" + form + ":" + requestId;
      if (responses.has(cacheKey))
        return structuredClone(responses.get(cacheKey) as SubformRow);
      const store = snapshot(client, form);
      if (existing) check(store.rows, existing);
      const saved = {
        id: existing?.id ?? crypto.randomUUID(),
        revision: crypto.randomUUID(),
        values: cleanSubformValues(form, values),
      };
      store.rows = existing
        ? store.rows.map((row) => (row.id === existing.id ? saved : row))
        : [...store.rows, saved];
      responses.set(cacheKey, saved);
      return structuredClone(saved);
    },
    async remove(client, form, existing, requestId = crypto.randomUUID()) {
      assertSubformWritable(form);
      const key = client + ":" + form + ":" + requestId;
      if (responses.has(key)) return;
      const store = snapshot(client, form);
      check(store.rows, existing);
      store.rows = store.rows.filter((row) => row.id !== existing.id);
      responses.set(key, true);
    },
    async upload(client, form, existing, field, file) {
      const store = snapshot(client, form);
      const saved = store.rows.find((row) => row.id === existing.id);
      if (!saved) throw new DataError("Row not found.");
      saved.values[field] = file.name;
      saved.revision = crypto.randomUUID();
    },
  };
}
