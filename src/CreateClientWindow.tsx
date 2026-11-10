import { fetchFollowUpFrequency } from "./form-rules";
import { DiscardClientDialog } from "./DiscardClientDialog";
import { ClientChoiceDropdown } from "./ClientChoiceDropdown";
import { Icon } from "./Icon";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";
import { MeetingNoteWindow } from "./MeetingNoteWindow";
import { displayValue, type Client } from "./model";
import type { FormDefinition, FormField, Json } from "./client-create/types";
import { countryFields, formPayload } from "./client-create/model";
import { asObject } from "./client-create/values";
import {
  ClientCreateUnknownError,
  hasLookup,
  loadCreateDefinition,
  submitCreateClient,
} from "./client-create/service";

const groups = [
  [
    "Business_Name",
    "ABN",
    "Priority",
    "Customer_Type",
    "Distributors",
    "Service_Ticket_Default",
  ],
  [
    "Country",
    "State",
    "Office_Address",
    "Postcode",
    "Contact_Name",
    "Email",
    "Phone_Number",
    "Note",
  ],
  ["Main_Product_Used", "Follow_Up_Frequency", "Last_Meeting"],
  ["Installs_Per_Month", "Switch_to_Sungrow", "Used_Sungrow_Before"],
];
const shown = (f: FormField) => !f.hidden && ![9, 20, 24].includes(f.type);

type CreateFieldProps = {
  field: FormField;
  path: string;
  value: unknown;
  change: (v: unknown) => void;
  demo: boolean;
};

function rowCellValue(field: FormField, value: unknown): string {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (field.lookup) return displayValue(asObject(item).label);
      return (
        field.choices.find((choice) => choice.value === item)?.label ??
        displayValue(item)
      );
    })
    .filter(Boolean)
    .join(", ");
}

function CreateSubform({ field, path, value, change, demo }: CreateFieldProps) {
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const rows = Array.isArray(value) ? value.map(asObject) : [];
  const columns = field.fields.filter(shown);
  const valueColumns = `repeat(${columns.length},minmax(230px,1fr))`;
  return (
    <section className="create-subform" aria-label={field.label}>
      <h3>{field.label}</h3>
      {!columns.length ? (
        <p>Field definitions are unavailable for this subform.</p>
      ) : (
        <>
          <div
            className="create-subform-table"
            style={{ gridTemplateRows: `repeat(${rows.length + 2}, auto)` }}
          >
            <div
              className="create-subform-scroll"
              style={{
                gridTemplateColumns: `minmax(${columns.length * 250}px, 1fr)`,
              }}
            >
              <div
                className="create-subform-head"
                style={{
                  gridTemplateColumns: valueColumns,
                }}
              >
                {columns.map((f) => (
                  <span key={f.name}>
                    {f.label}
                    {f.mandatory ? " *" : ""}
                  </span>
                ))}
              </div>
              {rows.map((row, i) => (
                <div className="create-subform-row" key={i}>
                  <button
                    type="button"
                    className="create-subform-values"
                    style={{ gridTemplateColumns: valueColumns }}
                    aria-haspopup="dialog"
                    onClick={() => setEditorIndex(i)}
                  >
                    <span className="create-row-action-label">
                      Edit {field.label} row {i + 1}
                    </span>
                    {countryFields(columns, row).map((column) => (
                      <span className="create-subform-value" key={column.name}>
                        {column.hidden
                          ? ""
                          : rowCellValue(column, row[column.name])}
                      </span>
                    ))}
                  </button>
                </div>
              ))}
            </div>
            <div className="create-subform-actions">
              <div className="create-subform-head" aria-hidden="true" />
              {rows.map((_, i) => (
                <div className="create-subform-action" key={i}>
                  <IconButton
                    icon="close"
                    label={`Remove ${field.label} row ${i + 1}`}
                    onClick={() =>
                      change(rows.filter((_, index) => i !== index))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="create-add-row"
            aria-haspopup="dialog"
            aria-label={`Add new ${field.label}`}
            onClick={() => setEditorIndex(rows.length)}
          >
            <Icon name="plus" />
            Add new
          </button>
          {editorIndex !== null && (
            <CreateRowWindow
              field={field}
              path={`${path}.${editorIndex}`}
              initialRow={rows[editorIndex]}
              demo={demo}
              onClose={() => setEditorIndex(null)}
              onSave={(row) => {
                const next = [...rows];
                next[editorIndex] = row;
                change(next);
                setEditorIndex(null);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

/** Stage a single row locally and retain the original field values for Client submission. */
function CreateRowWindow({
  field,
  path,
  initialRow,
  demo,
  onClose,
  onSave,
}: {
  field: FormField;
  path: string;
  initialRow?: Json;
  demo: boolean;
  onClose: () => void;
  onSave: (row: Json) => void;
}) {
  const editing = initialRow !== undefined;
  const [draft, setDraft] = useState<Json>(() => initialRow ?? {});
  const [error, setError] = useState("");
  const fields = countryFields(field.fields, draft).map((child) =>
    child.name === "State" && !asObject(draft.Country).id
      ? { ...child, hidden: true }
      : child,
  );
  return (
    <MeetingNoteWindow
      heading={`${editing ? "Edit" : "Add"} ${field.label}`}
      editing={editing}
      busy={false}
      onClose={onClose}
    >
      <form
        className="subform-row-editor"
        onSubmit={(event) => {
          event.preventDefault();
          // Portal events still bubble to the New Client form in React.
          event.stopPropagation();
          try {
            formPayload(fields, draft);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Check the row fields.",
            );
            return;
          }
          onSave(draft);
        }}
      >
        <div className="subform-fields">
          {fields.filter(shown).map((child) => (
            <CreateField
              key={child.name}
              field={child}
              path={`${path}.${child.name}`}
              value={draft[child.name]}
              demo={demo}
              change={(value) => {
                setError("");
                setDraft((current) => ({
                  ...current,
                  [child.name]: value,
                  ...(child.name === "Country" ? { State: "" } : {}),
                }));
              }}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary orange-action">
            {editing ? "Save" : "Add"}
          </button>
        </footer>
      </form>
    </MeetingNoteWindow>
  );
}

function CreateField({ field, path, value, change, demo }: CreateFieldProps) {
  const id = `create-${path}`;
  if (field.type === 21)
    return <CreateSubform {...{ field, path, value, change, demo }} />;
  let control;
  if (field.readOnly)
    control = (
      <input
        id={id}
        disabled
        value={String(value ?? "")}
        placeholder="Set automatically"
      />
    );
  else if (path === "Customer_Type" || path === "Main_Product_Used")
    control = (
      <ClientChoiceDropdown
        field={field}
        path={path}
        value={value}
        change={change}
        demo={demo}
      />
    );
  else if (field.lookup)
    control = (
      <ClientChoiceDropdown
        field={field}
        path={path.replace(/\.\d+\./g, ".")}
        {...{ value, change, demo }}
      />
    );
  else if ([12, 13, 14, 15].includes(field.type) || field.choices.length) {
    const multiple = [14, 15].includes(field.type);
    control =
      field.type === 13 ? (
        <div className="create-radio">
          {field.choices.map((c) => (
            <label key={c.value}>
              <input
                type="radio"
                name={id}
                value={c.value}
                checked={value === c.value}
                onChange={() => change(c.value)}
              />
              {c.label}
            </label>
          ))}
        </div>
      ) : (
        <select
          id={id}
          multiple={multiple}
          value={multiple ? ((value as string[]) ?? []) : String(value ?? "")}
          onChange={(e) =>
            change(
              multiple
                ? [...e.target.selectedOptions].map((o) => o.value)
                : e.target.value,
            )
          }
        >
          <option value="">Select an option</option>
          {field.choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      );
  } else if ([2, 4].includes(field.type))
    control = (
      <textarea
        id={id}
        rows={4}
        value={String(value ?? "")}
        maxLength={field.maxLength}
        onChange={(e) => change(e.target.value)}
      />
    );
  else if (field.type === 16)
    control = (
      <input
        id={id}
        type="checkbox"
        checked={value === true}
        onChange={(e) => change(e.target.checked)}
      />
    );
  else if ([1, 3, 5, 6, 7, 8, 10, 11, 17, 27, 34].includes(field.type))
    control = (
      <input
        id={id}
        type={
          (
            {
              3: "email",
              5: "number",
              6: "number",
              7: "number",
              8: "number",
              10: "date",
              11: "datetime-local",
              17: "url",
              27: "tel",
              34: "time",
            } as Record<number, string>
          )[field.type] ?? "text"
        }
        step={[6, 7, 8].includes(field.type) ? "any" : undefined}
        value={String(value ?? "")}
        maxLength={field.maxLength}
        onChange={(e) => change(e.target.value)}
      />
    );
  else
    control = (
      <span className="create-hint">This field type is not supported yet.</span>
    );
  return (
    <div className="create-field">
      <label htmlFor={id}>
        {field.label}
        {field.mandatory ? " *" : ""}
      </label>
      {control}
    </div>
  );
}

/** A dedicated Client create modal keeps parent and new child rows in one draft and one save. */
export function CreateClientWindow({
  demo,
  onClose,
  onCreated,
}: {
  demo: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [definition, setDefinition] = useState<FormDefinition>();
  const [values, setValues] = useState<Json>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const priorityRequest = useRef(0);
  const [priorityPending, setPriorityPending] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  useEffect(
    () => () => {
      priorityRequest.current++;
    },
    [],
  );
  const [uncertain, setUncertain] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setError("");
    loadCreateDefinition(demo)
      .then((d) => {
        if (active) setDefinition(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [demo, attempt]);
  useEffect(() => {
    if (!Object.keys(values).length) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [values]);
  const close = () => {
    if (lock.current) return;
    if (Object.keys(values).length && !uncertain) setDiscard(true);
    else onClose();
  };
  const fields = countryFields(definition?.fields ?? [], values).map((f) =>
    f.name === "State" && !asObject(values.Country).id
      ? { ...f, hidden: true }
      : f,
  );
  const change = (name: string, value: unknown) => {
    setValues((old) => ({
      ...old,
      [name]: value,
      ...(name === "Country" ? { State: "" } : {}),
    }));
    if (name !== "Priority") return;
    const request = ++priorityRequest.current;
    setPriorityError("");
    setPriorityPending(!!value);
    if (!value) return;
    const result = demo
      ? Promise.resolve(
          (
            { "Tier 1": "30", "Tier 2": "60", "Tier 3": "90" } as Record<
              string,
              string
            >
          )[String(value)],
        )
      : fetchFollowUpFrequency(String(value));
    void result
      .then((frequency) => {
        if (request === priorityRequest.current)
          setValues((old) => ({ ...old, Follow_Up_Frequency: frequency }));
      })
      .catch((e) => {
        if (request === priorityRequest.current)
          setPriorityError(
            e instanceof Error
              ? e.message
              : "Could not update follow-up frequency. Select the priority again to retry.",
          );
      })
      .finally(() => {
        if (request === priorityRequest.current) setPriorityPending(false);
      });
  };
  const render = (list: FormField[]) =>
    list
      .filter(shown)
      .map((f) => (
        <CreateField
          key={f.name}
          field={f}
          path={f.name}
          value={values[f.name]}
          change={(v) => change(f.name, v)}
          demo={demo}
        />
      ));
  async function submit() {
    if (
      lock.current ||
      !definition ||
      uncertain ||
      priorityPending ||
      priorityError
    )
      return;
    setError("");
    try {
      formPayload(fields, values);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the form");
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      const client = await submitCreateClient(
        { ...definition, fields },
        values,
        demo,
      );
      onCreated(client);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save client");
      setUncertain(e instanceof ClientCreateUnknownError);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const grouped = new Set(groups.flat());
  return createPortal(
    <dialog
      ref={dialog}
      className="client-create-window"
      aria-labelledby="client-create-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="client-create-title">New client</h2>
        <IconButton
          icon="close"
          label="Close new client"
          disabled={saving}
          onClick={close}
        />
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="client-create-body">
          {!definition && !error && <p role="status">Loading Client fields…</p>}
          {definition && (
            <>
              {priorityPending && (
                <p role="status">Updating follow-up frequency…</p>
              )}
              {priorityError && (
                <p role="alert" className="error">
                  {priorityError}
                </p>
              )}
              <fieldset disabled={saving || uncertain || priorityPending}>
                <div className="create-columns">
                  {groups.map((names, i) => (
                    <div key={i} className="create-column">
                      {render(
                        names.flatMap((n) =>
                          fields.filter((f) => f.name === n),
                        ),
                      )}
                    </div>
                  ))}
                </div>
                {render(fields.filter((f) => !grouped.has(f.name)))}
              </fieldset>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
              {uncertain
                ? " Check the client grid before retrying to avoid a duplicate."
                : ""}
            </p>
          )}
          {!definition && error && (
            <button type="button" onClick={() => setAttempt((a) => a + 1)}>
              Retry
            </button>
          )}
        </div>
        <footer>
          <button type="button" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button
            className="primary orange-action"
            disabled={
              !definition ||
              saving ||
              uncertain ||
              priorityPending ||
              !!priorityError
            }
            type="submit"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </footer>
      </form>
      {discard && (
        <DiscardClientDialog
          onKeep={() => setDiscard(false)}
          onDiscard={onClose}
        />
      )}
    </dialog>,
    document.body,
  );
}
