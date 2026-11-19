import { MeetingToDoField } from "./MeetingToDoField";
import { useConfirmation } from "./useConfirmation";
import { DiscardClientDialog } from "./DiscardClientDialog";
import { FieldInput } from "./SubformFieldInput";
import { ToDoCreateWindow } from "./ToDoCreateWindow";
import { MeetingNoteWindow } from "./MeetingNoteWindow";
import { useCountryStates } from "./useCountryStates";
import { stateSelectionError } from "./form-rules";
import { ParentWorkflowError, SubformSaveUnknownError } from "./subform-api";
import type { ClientFormContext } from "./client-form-context";
import {
  isVisibleClientSubform,
  isVisibleSubformField,
} from "./subform-workflows";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { subforms, type SubformField } from "./subform-schema";
import { displayValue, type Client } from "./model";
import {
  editableSubformFields,
  initialSubformValues,
  subformDefinition,
  subformLabel,
  subformRowLabel,
  validateSubformValues,
  type SubformRow,
  type SubformSnapshot,
  type SubformStore,
  type SubformValue,
} from "./subforms";

/** Each row has an isolated draft; Save is the only write boundary. Failed file uploads resume without recreating rows. */
export function SubformEditor({
  client,
  store,
  onClose,
  onChanged,
  loadCountryStates,
  loadFormContext,
  inlineMeetingNote = false,
  onEditingChange,
}: {
  inlineMeetingNote?: boolean;
  onEditingChange?: (editing: boolean) => void;
  client: Client;
  loadFormContext: () => Promise<ClientFormContext | null>;
  store: SubformStore;
  loadCountryStates: (id: string) => Promise<string[]>;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { confirm, confirmation } = useConfirmation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState(
    inlineMeetingNote ? "Meeting_Note" : "Staff",
  );
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const discardDecision = useRef<((discard: boolean) => void) | null>(null);
  useEffect(() => () => discardDecision.current?.(false), []);
  const [creatingToDo, setCreatingToDo] = useState(false);
  const [showBom, setShowBom] = useState(false);
  const [bomDetailAllowed, setBomDetailAllowed] = useState(false);
  const [snapshot, setSnapshot] = useState<SubformSnapshot>({
    rows: [],
    options: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Record<string, SubformValue> | null>(null);
  const [original, setOriginal] = useState<SubformRow>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [savedRow, setSavedRow] = useState<SubformRow>();
  const [attempt, setAttempt] = useState<{ id: string; fingerprint: string }>();
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  const [formContext, setFormContext] = useState<ClientFormContext | null>();
  const [contextError, setContextError] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  useEffect(() => {
    onEditingChange?.(busy || !!draft);
  }, [busy, draft, onEditingChange]);
  const visibleSubforms = subforms.filter(
    (form) =>
      isVisibleClientSubform(form.key, formContext) ||
      (showBom &&
        (form.key === "BOM_Stack_View" ||
          (form.key === "BOM" && bomDetailAllowed))),
  );
  useEffect(() => {
    let canceled = false;
    setContextLoading(true);
    setContextError("");
    loadFormContext()
      .then((value) => {
        if (!canceled) setFormContext(value);
      })
      .catch((reason) => {
        if (!canceled)
          setContextError(
            reason instanceof Error
              ? reason.message
              : "Cannot resolve Client form visibility.",
          );
      })
      .finally(() => {
        if (!canceled) setContextLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [loadFormContext, inlineMeetingNote]);
  const definition =
    snapshot.definition?.key === section
      ? snapshot.definition
      : subformDefinition(section);
  const hasCountryState =
    definition.fields.some((field) => field.link_name === "Country") &&
    definition.fields.some((field) => field.link_name === "State");
  const selectedCountry =
    hasCountryState && typeof draft?.Country === "string" ? draft.Country : "";
  const countryStates = useCountryStates(selectedCountry, loadCountryStates);
  const draftFields = definition.fields.map((field) =>
    field.link_name === "State" && hasCountryState
      ? {
          ...field,
          choices: countryStates.choices.map((value) => ({
            value,
            key: value,
          })),
          mandatory: section === "Leads" && countryStates.choices.length > 0,
        }
      : field,
  );
  useEffect(() => {
    if (!inlineMeetingNote) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let canceled = false;
    // Resolve edit-load visibility before requesting hidden Meeting Note records.
    if (
      inlineMeetingNote &&
      (contextLoading || !isVisibleClientSubform("Meeting_Note", formContext))
    )
      return;
    setLoading(true);
    setError("");
    store
      .list(client.id, section)
      .then((value) => {
        if (!canceled) {
          setSnapshot(value);
          if (value.bomDetailAllowed !== undefined)
            setBomDetailAllowed(value.bomDetailAllowed);
        }
      })
      .catch((reason) => {
        if (!canceled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load subform rows.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [
    client.id,
    section,
    store,
    reload,
    inlineMeetingNote,
    contextLoading,
    contextError,
    formContext,
  ]);
  const changed =
    !!draft &&
    (JSON.stringify(draft) !==
      JSON.stringify(
        original?.values ?? initialSubformValues(section, definition.fields),
      ) ||
      Object.keys(files).length > 0);
  async function abandon() {
    if (!draft || (!changed && !savedRow)) return true;
    if (discardDecision.current) return false;
    return new Promise<boolean>((resolve) => {
      discardDecision.current = resolve;
      setDiscardPrompt(true);
    });
  }
  function resolveDiscard(discard: boolean) {
    const resolve = discardDecision.current;
    discardDecision.current = null;
    setDiscardPrompt(false);
    resolve?.(discard);
  }
  function reset() {
    setDraft(null);
    setOriginal(undefined);
    setErrors({});
    setFiles({});
    setSavedRow(undefined);
    setAttempt(undefined);
  }
  async function close() {
    if (!busy && (await abandon())) onClose();
  }
  async function save() {
    if (!draft) return;
    const validation = validateSubformValues(section, draft, draftFields);
    if (hasCountryState) {
      const stateError =
        countryStates.error ||
        (countryStates.loading
          ? "Wait for country states to load."
          : stateSelectionError(
              selectedCountry,
              String(draft.State ?? ""),
              countryStates.choices,
            ));
      if (stateError) validation.State = stateError;
    }
    for (const [field, file] of Object.entries(files)) {
      if (file.size > 50 * 1024 * 1024)
        validation[field] = "Choose a file smaller than 50 MB.";
    }
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fingerprint = JSON.stringify(draft);
      const requestId =
        attempt?.fingerprint === fingerprint ? attempt.id : crypto.randomUUID();
      setAttempt({ id: requestId, fingerprint });
      const saved =
        savedRow ??
        (await store.save(client.id, section, draft, original, requestId));
      setSavedRow(saved);
      await onChanged();
      for (const [field, file] of Object.entries(files)) {
        await store.upload(client.id, section, saved, field, file);
        setFiles((old) => {
          const next = { ...old };
          delete next[field];
          return next;
        });
      }
      reset();
      setNotice(original ? "Row updated" : "Row added");
      setReload((value) => value + 1);
    } catch (reason) {
      if (reason instanceof ParentWorkflowError) await onChanged();
      if (!(reason instanceof SubformSaveUnknownError)) setAttempt(undefined);
      setError(
        reason instanceof Error ? reason.message : "Could not save the row.",
      );
    } finally {
      setBusy(false);
    }
  }
  const meetingColumns = definition.fields.filter(
    (field) =>
      isVisibleSubformField("Meeting_Note", field.link_name) &&
      ![24, 19].includes(field.type),
  );
  // Creator date fields are normalized to ISO dates by the subform adapter.
  const meetingRows = [...snapshot.rows].sort((a, b) =>
    String(b.values.Date_field ?? "").localeCompare(
      String(a.values.Date_field ?? ""),
    ),
  );
  const noteValue = (row: SubformRow, field: string) =>
    (row.labels?.[field] || displayValue(row.values[field])).trim() || "-";
  async function deleteMeeting(row: SubformRow) {
    if (
      !(await confirm({
        title: "Delete meeting note?",
        description: `Delete the meeting note for ${client.name} (${noteValue(row, "Date_field")})? It cannot be restored from this widget. Last Meeting and follow-up status will be recalculated from the remaining notes.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await store.remove(client.id, section, row);
      await onChanged();
      setNotice("Row deleted");
      setReload((value) => value + 1);
    } catch (reason) {
      if (reason instanceof ParentWorkflowError) await onChanged();
      setError(reason instanceof Error ? reason.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }
  const editorFields = editableSubformFields(section, draftFields).filter(
    (field) =>
      field.link_name !== "State" ||
      !hasCountryState ||
      (!!selectedCountry && countryStates.choices.length > 0),
  );
  const originalRenderEditorField = (field: SubformField) => (
    <div className="subform-field" key={field.link_name}>
      <span>
        {subformLabel(field)}
        {field.mandatory ? " *" : ""}
      </span>
      <FieldInput
        meetingNote={inlineMeetingNote}
        onAddNew={
          section === "Meeting_Note" &&
          field.link_name === "To_Do" &&
          store.todoCreator
            ? () => setCreatingToDo(true)
            : undefined
        }
        field={field}
        value={draft?.[field.link_name]}
        options={snapshot.options[field.link_name] ?? []}
        disabled={busy || !!savedRow || !!attempt}
        onChange={(value) => {
          setDraft((old) => ({
            ...old,
            [field.link_name]: value,
            ...(field.link_name === "Country" && hasCountryState
              ? { State: "" }
              : {}),
          }));
          setErrors((old) => ({
            ...old,
            [field.link_name]: "",
          }));
        }}
        onFile={(file) =>
          setFiles((old) => {
            const next = { ...old };
            if (file) next[field.link_name] = file;
            else delete next[field.link_name];
            return next;
          })
        }
      />
      {errors[field.link_name] && (
        <small className="error" role="alert">
          {errors[field.link_name]}
        </small>
      )}
    </div>
  );
  const renderEditorField = (field: SubformField) => {
    if (!inlineMeetingNote || field.link_name !== "To_Do")
      return originalRenderEditorField(field);
    return (
      <div key={field.link_name}>
        <MeetingToDoField
          value={draft?.To_Do}
          options={snapshot.options.To_Do ?? []}
          disabled={busy || !!savedRow || !!attempt}
          onAddNew={store.todoCreator ? () => setCreatingToDo(true) : undefined}
          onChange={(value) => {
            setDraft((old) => ({ ...old, To_Do: value }));
            setErrors((old) => ({ ...old, To_Do: "" }));
          }}
        />
        {errors.To_Do && (
          <small className="error" role="alert">
            {errors.To_Do}
          </small>
        )}
      </div>
    );
  };
  // Group presentation only; metadata still owns visibility, validation and values.
  const noteGroups = [
    {
      name: "Meeting essentials",
      className: "note-essentials",
      fields: ["Date_field", "Topic_Introduced"],
    },
    {
      name: "Meeting context",
      className: "note-context",
      fields: [
        "Market_Feedback_and_Expectations",
        "Opportunities_Strategies_to_Increase_Sungrow_Sales",
        "Current_Challenges",
        "Solutions",
      ],
    },
    {
      name: "Follow-up",
      className: "note-follow-up",
      fields: ["Follow_up_Actions", "To_Do"],
    },
  ];
  const rowEditor = draft ? (
    <form
      className="subform-row-editor"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void save();
      }}
    >
      {!inlineMeetingNote && (
        <h4>{original ? `Edit ${definition.label}` : "New row"}</h4>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {countryStates.loading && <p role="status">Loading states…</p>}
      {countryStates.error && (
        <p role="alert" className="error">
          {countryStates.error}
        </p>
      )}
      {errors.State && (
        <p role="alert" className="error">
          {errors.State}
        </p>
      )}
      {inlineMeetingNote ? (
        <div className="note-editor-sections">
          {noteGroups.map((group, index) => {
            const fields = group.fields.flatMap((key) =>
              editorFields.filter((field) => field.link_name === key),
            );
            return (
              fields.length > 0 && (
                <section
                  className={group.className}
                  key={group.name}
                  aria-label={group.name}
                >
                  {index > 0 && <h3>{group.name}</h3>}
                  <div className="subform-fields">
                    {fields.map(renderEditorField)}
                  </div>
                </section>
              )
            );
          })}
          <div className="subform-fields">
            {editorFields
              .filter(
                (field) =>
                  !noteGroups.some((group) =>
                    group.fields.includes(field.link_name),
                  ),
              )
              .map(renderEditorField)}
          </div>
        </div>
      ) : (
        <div className="subform-fields">
          {editorFields.map(renderEditorField)}
        </div>
      )}

      <footer>
        <IconButton
          label={
            inlineMeetingNote ? "Cancel note changes" : "Cancel row changes"
          }
          visibleText={inlineMeetingNote ? "Cancel" : undefined}
          icon="close"
          disabled={busy}
          onClick={async () => {
            if (await abandon()) {
              reset();
              setError("");
              setReload((value) => value + 1);
            }
          }}
        />
        <IconButton
          label={
            busy
              ? "Saving…"
              : savedRow
                ? "Retry file upload"
                : inlineMeetingNote
                  ? "Save note"
                  : "Save row"
          }
          icon="check"
          visibleText={
            inlineMeetingNote
              ? busy
                ? "Saving…"
                : savedRow
                  ? "Retry"
                  : "Save"
              : undefined
          }
          className={original || savedRow ? "primary" : "primary orange-action"}
          type="submit"
          disabled={busy}
        />
      </footer>
    </form>
  ) : null;
  async function cancelMeetingRow() {
    if (!busy && (await abandon())) {
      reset();
      setError("");
      setReload((value) => value + 1);
    }
  }
  const discardDialog = discardPrompt && (
    <DiscardClientDialog
      confirmLabel={savedRow ? "Leave" : "Discard"}
      title={
        savedRow
          ? "Leave unfinished upload?"
          : `Discard ${definition.label.toLowerCase()} changes?`
      }
      description={
        savedRow
          ? "This record is saved, but its file upload is unfinished. Leaving will not delete the saved record."
          : `Your unsaved ${definition.label.toLowerCase()} changes will be lost.`
      }
      onKeep={() => resolveDiscard(false)}
      onDiscard={() => resolveDiscard(true)}
    />
  );
  const content = (
    <>
      {discardDialog}
      {confirmation}
      {creatingToDo && store.todoCreator && (
        <ToDoCreateWindow
          creator={store.todoCreator}
          onClose={() => setCreatingToDo(false)}
          onCreated={(option) => {
            setSnapshot((old) => ({
              ...old,
              options: {
                ...old.options,
                To_Do: [...(old.options.To_Do ?? []), option],
              },
            }));
            setDraft((old) =>
              old
                ? {
                    ...old,
                    To_Do: [
                      ...(Array.isArray(old.To_Do)
                        ? old.To_Do
                        : old.To_Do
                          ? [String(old.To_Do)]
                          : []),
                      option.id,
                    ],
                  }
                : old,
            );
            setCreatingToDo(false);
          }}
        />
      )}
      {!inlineMeetingNote && (
        <header className="subform-header">
          <div>
            <h2 id="subform-title">
              {client.name} <span>· Related records</span>
            </h2>
          </div>
          <IconButton
            label="Close subforms"
            icon="close"
            disabled={busy}
            onClick={close}
          />
        </header>
      )}
      <div className="subform-layout">
        {!inlineMeetingNote && (
          <nav aria-label="Client subforms">
            <label className="check-option">
              <input
                type="checkbox"
                checked={showBom}
                disabled={busy}
                onChange={async (event) => {
                  const checked = event.target.checked;
                  if (!(await abandon())) return;
                  reset();
                  setShowBom(checked);
                  setSnapshot({ rows: [], options: {} });
                  setSection(checked ? "BOM_Stack_View" : "Staff");
                }}
              />{" "}
              Show BOM
            </label>
            {visibleSubforms.map((form) => (
              <button
                key={form.key}
                type="button"
                aria-current={section === form.key ? "page" : undefined}
                disabled={busy}
                onClick={async () => {
                  if (form.key === section || !(await abandon())) return;
                  reset();
                  setSnapshot({ rows: [], options: {} });
                  setNotice("");
                  setSection(form.key);
                }}
              >
                {form.label}
              </button>
            ))}
          </nav>
        )}
        <section className="subform-content">
          {contextLoading && (
            <p role="status">Checking team-dependent sections…</p>
          )}
          {contextError && (
            <p role="alert" className="error">
              {contextError} Reopen this dialog after checking staff report
              access.
            </p>
          )}
          <div className="subform-section-heading">
            <h3>{definition.label}</h3>
            <span>
              {!loading && !error
                ? `${snapshot.rows.length} ${snapshot.rows.length === 1 ? "note" : "notes"}`
                : ""}
            </span>
            <IconButton
              label={`Refresh ${definition.label}`}
              icon="refresh"
              disabled={busy || !!draft}
              onClick={() => setReload((value) => value + 1)}
            />
            {!inlineMeetingNote && (
              <IconButton
                label={
                  inlineMeetingNote
                    ? "Add Meeting Note"
                    : `Add ${definition.label}`
                }
                icon="plus"
                className={`primary orange-action${inlineMeetingNote ? " meeting-add-button" : ""}`}
                disabled={
                  loading ||
                  busy ||
                  !!error ||
                  !!draft ||
                  !!snapshot.readOnlyReason ||
                  section === "BOM_Stack_View"
                }
                onClick={() => {
                  reset();
                  setDraft(initialSubformValues(section, definition.fields));
                  setNotice("");
                }}
              />
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {savedRow ? "Row saved. File upload is unfinished. " : ""}
              {error}
            </p>
          )}
          {snapshot.readOnlyReason && (
            <p className="muted">{snapshot.readOnlyReason}</p>
          )}
          {snapshot.warnings?.map((warning) => (
            <p key={warning} className="muted">
              {warning}
            </p>
          ))}
          {notice && (
            <p role="status" className="subform-notice">
              {notice}
            </p>
          )}
          {loading ? (
            <p role="status">Loading {definition.label}…</p>
          ) : draft && !inlineMeetingNote ? (
            rowEditor
          ) : inlineMeetingNote ? (
            !error && (
              <>
                {meetingRows.length ? (
                  <ol className="meeting-timeline">
                    {meetingRows.map((row) => (
                      <li key={row.id} className="meeting-timeline-entry">
                        <article>
                          <div className="meeting-timeline-heading">
                            <div>
                              <time
                                className="meeting-timeline-date"
                                dateTime={String(row.values.Date_field ?? "")}
                              >
                                {noteValue(row, "Date_field")}
                              </time>
                              <h4>{noteValue(row, "Topic_Introduced")}</h4>
                            </div>
                            <div className="meeting-row-actions">
                              <IconButton
                                label={`Edit Meeting Note ${subformRowLabel(section, row, definition.fields)}`}
                                icon="edit"
                                disabled={
                                  busy || !!draft || !!snapshot.readOnlyReason
                                }
                                onClick={() => {
                                  reset();
                                  setOriginal(row);
                                  setDraft(structuredClone(row.values));
                                  setNotice("");
                                }}
                              />
                              <IconButton
                                label={`Delete Meeting Note ${subformRowLabel(section, row, definition.fields)}`}
                                icon="trash"
                                className="danger"
                                disabled={
                                  busy || !!draft || !!snapshot.readOnlyReason
                                }
                                onClick={() => void deleteMeeting(row)}
                              />
                            </div>
                          </div>
                          <div className="meeting-timeline-followup">
                            <strong>Follow-up actions</strong>
                            <p>{noteValue(row, "Follow_up_Actions")}</p>
                          </div>
                          <details className="meeting-timeline-details">
                            <summary>Meeting details</summary>
                            <dl>
                              {meetingColumns
                                .filter(
                                  (field) =>
                                    ![
                                      "Date_field",
                                      "Topic_Introduced",
                                      "Follow_up_Actions",
                                    ].includes(field.link_name),
                                )
                                .map((field) => (
                                  <div key={field.link_name}>
                                    <dt>{subformLabel(field)}</dt>
                                    <dd>{noteValue(row, field.link_name)}</dd>
                                  </div>
                                ))}
                            </dl>
                          </details>
                        </article>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="meeting-timeline-empty">
                    <p>No meeting notes yet.</p>
                    <span>
                      Add your first meeting to start this client’s history.
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="meeting-add-new"
                  disabled={busy || !!draft || !!snapshot.readOnlyReason}
                  onClick={() => {
                    reset();
                    setDraft(initialSubformValues(section, definition.fields));
                    setNotice("");
                  }}
                >
                  + Add New
                </button>
              </>
            )
          ) : (
            !error && (
              <div className="subform-row-list">
                {snapshot.rows.length ? (
                  snapshot.rows.map((row) => (
                    <article key={row.id}>
                      <div>
                        <strong>
                          {subformRowLabel(section, row, definition.fields)}
                        </strong>
                        <p>
                          {definition.fields
                            .filter(
                              (field) =>
                                isVisibleSubformField(
                                  section,
                                  field.link_name,
                                ) &&
                                field.type !== 24 &&
                                field.type !== 19,
                            )
                            .slice(
                              0,
                              section === "BOM_Stack_View" ? undefined : 4,
                            )
                            .map(
                              (field) =>
                                row.labels?.[field.link_name] ||
                                displayValue(row.values[field.link_name]),
                            )
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <IconButton
                        label={`Edit ${definition.label} row ${subformRowLabel(section, row, definition.fields)}`}
                        icon="edit"
                        disabled={
                          busy ||
                          !!snapshot.readOnlyReason ||
                          section === "BOM_Stack_View"
                        }
                        onClick={() => {
                          reset();
                          setOriginal(row);
                          setDraft(structuredClone(row.values));
                          setNotice("");
                        }}
                      />
                      <IconButton
                        label={`Delete ${definition.label} row ${subformRowLabel(section, row, definition.fields)}`}
                        icon="trash"
                        className="danger"
                        disabled={
                          busy ||
                          !!snapshot.readOnlyReason ||
                          section === "BOM_Stack_View"
                        }
                        onClick={async () => {
                          if (
                            !(await confirm({
                              title: `Delete ${definition.label.toLowerCase()} record?`,
                              description: `Delete this ${definition.label.toLowerCase()} record from ${client.name}? It cannot be restored from this widget.`,
                              confirmLabel: "Delete",
                              cancelLabel: "Cancel",
                            }))
                          )
                            return;
                          setBusy(true);
                          setError("");
                          try {
                            await store.remove(client.id, section, row);
                            await onChanged();
                            setNotice("Row deleted");
                            setReload((value) => value + 1);
                          } catch (reason) {
                            if (reason instanceof ParentWorkflowError)
                              await onChanged();
                            setError(
                              reason instanceof Error
                                ? reason.message
                                : "Delete failed.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </article>
                  ))
                ) : (
                  <p>No rows yet.</p>
                )}
              </div>
            )
          )}
        </section>
      </div>
    </>
  );
  if (inlineMeetingNote) {
    if (contextLoading) return <p role="status">Loading form visibility…</p>;
    if (contextError)
      return (
        <p className="error" role="alert">
          {contextError}
        </p>
      );
    if (!isVisibleClientSubform("Meeting_Note", formContext)) return null;
    return (
      <section className="inline-meeting-notes" aria-label="Meeting Note">
        {content}
        {draft && (
          <MeetingNoteWindow
            editing={!!original}
            busy={busy}
            onClose={cancelMeetingRow}
          >
            {rowEditor}
          </MeetingNoteWindow>
        )}
      </section>
    );
  }
  return (
    <dialog
      ref={dialog}
      className="subform-dialog"
      aria-labelledby="subform-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {content}
    </dialog>
  );
}
