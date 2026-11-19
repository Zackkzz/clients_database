import { BulkEditWindow } from "./BulkEditWindow";
import { applyBulkPatch } from "./bulk-edit";
import { useConfirmation } from "./useConfirmation";
import { clientWindowMotion } from "./client-window-motion";
import { ClientDetailGrid } from "./ClientDetailGrid";
import {
  followUpStatus,
  followUpLabels,
  todayKey,
  type FollowUpDays,
} from "./follow-ups";
import { customerTypeColors } from "./customer-type-colors";
import { ClientChoiceDropdown } from "./ClientChoiceDropdown";
import { parseFormFields } from "./client-create/metadata";
import { customerFields } from "./client-fields";
import { renderClientDetailFields } from "./ClientDetailFields";
import { CreateClientWindow } from "./CreateClientWindow";
import { groupClientLayers, groupingFields, type GroupField } from "./grouping";
import { workflowClientColumns } from "./column-visibility";
import type { ClientFormContext } from "./client-form-context";
import { clientStateVisible } from "./client-load-rules";
import { fetchClientFormContext } from "./client-form-context";
import {
  fetchCountryStates,
  fetchFollowUpFrequency,
  stateSelectionError,
} from "./form-rules";
import { useCountryStates } from "./useCountryStates";
import { SubformEditor } from "./SubformEditor";
import {
  createDemoSubformStore,
  createPortalSubformStore,
} from "./subform-api";
import { ColumnSearchPopover } from "./ColumnSearchPopover";
import { downloadCsv } from "./export";
import { ExportWindow, type ExportScope } from "./ExportWindow";
import { createDemoCache, createPortalCache } from "./cache";
import { usePreferences } from "./usePreferences";
import { defaultOrder, moveColumn } from "./preferences";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { FiltersPanel, FiltersSummary } from "./FilterBuilder";
import {
  emptyFilters,
  filterFields,
  filterOptions,
  operators,
  conditionText,
  matchesFilters,
  type FilterGroup,
} from "./filters";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRepository, loadSdk, type ClientLoadProgress } from "./api";
import {
  columns,
  clientColumns,
  columnValue,
  priorityChoices,
  stateChoices,
  textLimits,
  type ClientLookups,
  editableKeys,
  queryClients,
  displayValue,
  type Client,
  type ColumnKey,
  type EditableKey,
  type ViewQuery,
} from "./model";
import "./styles.css";

const params = new URLSearchParams(location.search);
// Demo must be explicitly requested. A deployed widget always starts with portal data.
const defaultHiddenColumns = clientColumns.slice(8).map((column) => column.key);
const mode = params.get("demo") === "1" ? "demo" : "zoho";
const repository = createRepository(mode);
const loadFormContext = () =>
  mode === "demo"
    ? Promise.resolve({ teamId: "3932750000196993014", sales: true })
    : fetchClientFormContext();
const loadCountryStates = (id: string) =>
  mode === "demo"
    ? Promise.resolve(id === "demo-au" ? [...stateChoices] : [])
    : fetchCountryStates(id);
const subformStore =
  mode === "demo" ? createDemoSubformStore() : createPortalSubformStore();
const preferenceStore =
  mode === "demo"
    ? createDemoCache({
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      })
    : createPortalCache(
        loadSdk,
        async () =>
          (await window.ZOHO?.CREATOR?.UTIL?.getInitParams())?.loginUser,
      );
const initialQuery: ViewQuery = {
  search: "",
  state: "",
  priority: "",
  type: "",
  sort: "name",
  direction: "default",
};

function matchingClients(
  clients: Client[],
  query: ViewQuery,
  conditions: FilterGroup,
  days: FollowUpDays,
  today: string,
): Client[] {
  return queryClients(clients, query).filter(
    (client) =>
      matchesFilters(client, conditions) &&
      (!conditions.followUp ||
        followUpStatus(client, days, today) === conditions.followUp),
  );
}

async function loadFollowUpIntervals() {
  const results = await Promise.allSettled(
    ["Tier 1", "Tier 2", "Tier 3"].map(
      async (tier) =>
        [
          tier,
          Number(
            mode === "demo"
              ? { "Tier 1": 30, "Tier 2": 60, "Tier 3": 90 }[tier]
              : await fetchFollowUpFrequency(tier),
          ),
        ] as const,
    ),
  );
  return {
    days: Object.fromEntries(
      results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      ),
    ),
    warning: results.some((result) => result.status === "rejected")
      ? "Some follow-up intervals could not be loaded from Meta_Data_Client. Refresh to retry; affected dated clients cannot be classified."
      : "",
  };
}

type Panel = "fields" | "filter" | "sort" | "group" | null;

function Tag({ value, type = false }: { value: string; type?: boolean }) {
  const tone =
    /1|weekly/i.test(value) && !/fortnight/i.test(value)
      ? "coral"
      : /2|fortnight/i.test(value)
        ? "green"
        : "purple";
  return (
    <span
      className={`tag ${type ? "customer-type-tag" : tone}`}
      style={type ? customerTypeColors(value) : undefined}
    >
      {value}
    </span>
  );
}

function CellEditor({
  client,
  field,
  onSave,
  onCancel,
}: {
  client: Client;
  field: EditableKey;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(client[field]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="cell-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setError("");
        try {
          await onSave(value);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed. Try again.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        autoFocus
        aria-label={`Edit ${field}`}
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !saving) onCancel();
        }}
      />
      <div className="editor-actions">
        <IconButton
          type="submit"
          disabled={saving}
          label={saving ? "Saving…" : "Save"}
          icon="check"
        />
        <IconButton
          type="button"
          disabled={saving}
          onClick={onCancel}
          label="Cancel"
          icon="close"
        />
      </div>
      {error && (
        <span role="alert" className="edit-error">
          {error}
        </span>
      )}
    </form>
  );
}

function RecordDrawer({
  clients,
  client,
  onClose: onClosed,
  opener,
  onSave,
  onDelete,
  onMeetingChanged,
  creating = false,
}: {
  client: Client;
  clients: Client[];
  onClose: () => void;
  opener: HTMLElement | null;
  onSave: (patch: Partial<Client>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onMeetingChanged: () => void | Promise<void>;
  creating?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const motion = useRef<ReturnType<typeof clientWindowMotion> | null>(null);
  const onClose = () => {
    if (motion.current) void motion.current.close(onClosed);
    else onClosed();
  };
  const [detailContext, setDetailContext] =
    useState<ClientFormContext | null>();
  const [detailContextError, setDetailContextError] = useState("");
  useEffect(() => {
    let canceled = false;
    loadFormContext()
      .then((context) => {
        if (!canceled) setDetailContext(context);
      })
      .catch((reason) => {
        if (!canceled)
          setDetailContextError(
            reason instanceof Error
              ? reason.message
              : "Could not load Client form visibility.",
          );
      });
    return () => {
      canceled = true;
    };
  }, []);
  const [meetingEditing, setMeetingEditing] = useState(false);
  const [draft, setDraft] = useState<Client>({
    ...client,
    detailChanges: undefined,
  });
  useEffect(() => {
    // Last_Meeting is workflow-owned; refresh it without discarding other draft fields.
    setDraft((current) => ({
      ...current,
      raw: { ...current.raw, Last_Meeting: client.raw?.Last_Meeting },
    }));
  }, [client.raw?.Last_Meeting]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    node.showModal();
    motion.current = clientWindowMotion(node, opener);
    return () => motion.current?.dispose();
  }, []);
  const [lookups, setLookups] = useState<ClientLookups | null>(null);
  const [lookupError, setLookupError] = useState("");
  async function loadOptions() {
    setLookupError("");
    try {
      setLookups(await repository.lookups(clients));
    } catch {
      setLookupError(
        "Could not read country and customer-type options from the loaded clients. Retry loading options.",
      );
    }
  }
  useEffect(() => {
    void loadOptions();
  }, []);
  const countryStates = useCountryStates(
    draft.countryId ?? "",
    loadCountryStates,
  );
  const priorityRequest = useRef(0);
  const [priorityPending, setPriorityPending] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  useEffect(
    () => () => {
      priorityRequest.current++;
    },
    [],
  );
  async function changePriority(priority: string) {
    const request = ++priorityRequest.current;
    setDraft((current) => ({ ...current, priority }));
    setPriorityError("");
    setPriorityPending(!!priority);
    if (!priority) return;
    try {
      const frequency =
        mode === "demo"
          ? ({ "Tier 1": "30", "Tier 2": "60", "Tier 3": "90" }[priority] ?? "")
          : await fetchFollowUpFrequency(priority);
      if (request !== priorityRequest.current) return;
      setDraft((current) => ({
        ...current,
        raw: { ...current.raw, Follow_Up_Frequency: frequency },
        detailChanges: {
          ...current.detailChanges,
          Follow_Up_Frequency: frequency,
        },
      }));
    } catch (e) {
      if (request === priorityRequest.current)
        setPriorityError(
          e instanceof Error
            ? e.message
            : "Could not update follow-up frequency. Select the priority again to retry.",
        );
    } finally {
      if (request === priorityRequest.current) setPriorityPending(false);
    }
  }
  const [countryInput, setCountryInput] = useState(false);
  const countryChanged = draft.countryId !== client.countryId;
  const needsStateCheck =
    creating || countryChanged || draft.state !== client.state;
  const stateBlocked =
    needsStateCheck && (countryStates.loading || !!countryStates.error);
  const dirty =
    !!Object.keys(draft.detailChanges ?? {}).length ||
    editableKeys.some((key) => draft[key] !== client[key]) ||
    draft.priority !== client.priority ||
    draft.state !== client.state ||
    draft.countryId !== client.countryId ||
    JSON.stringify(draft.typeIds) !== JSON.stringify(client.typeIds);
  const { confirm, confirmation } = useConfirmation();
  async function close() {
    if (saving || meetingEditing) return;
    if (
      !dirty ||
      (await confirm({
        title: creating ? "Discard new client?" : "Discard client changes?",
        description: creating
          ? "Your unsaved client details will be lost."
          : `Your unsaved changes to ${client.name} will be lost. Saved meeting notes and To-Dos will be kept.`,
        confirmLabel: "Discard",
      }))
    )
      onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="drawer client-detail-window client-create-window"
      aria-labelledby="record-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      {confirmation}
      <div
        className="client-detail-shell"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (meetingEditing || priorityPending || priorityError) return;
          if (needsStateCheck) {
            const invalid =
              countryStates.error ||
              (countryStates.loading
                ? "Wait for country states to load."
                : stateSelectionError(
                    draft.countryId ?? "",
                    draft.state,
                    countryStates.choices,
                  ));
            if (invalid) {
              setError(invalid);
              return;
            }
          }
          setSaving(true);
          const patch: Partial<Client> = draft.detailChanges
            ? { detailChanges: draft.detailChanges, raw: draft.raw }
            : {};
          for (const key of editableKeys)
            if (creating || draft[key] !== client[key])
              patch[key] = draft[key].trim();
          if (creating || draft.priority !== client.priority)
            patch.priority = draft.priority;
          if (creating || draft.state !== client.state)
            patch.state = draft.state;
          if (creating || draft.countryId !== client.countryId) {
            patch.countryId = draft.countryId;
            patch.country = draft.country;
            patch.countryCode = draft.countryCode;
          }
          if (
            creating ||
            JSON.stringify(draft.typeIds) !== JSON.stringify(client.typeIds)
          ) {
            patch.typeIds = draft.typeIds ?? [];
            patch.types = draft.types;
          }
          try {
            await onSave(patch);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="drawer-top">
          <span>
            <Icon name="briefcase" /> Client details
          </span>
          <IconButton
            type="button"
            onClick={close}
            label="Close client details"
            icon="close"
          />
        </div>
        <div className="drawer-body">
          <h2 id="record-title">{creating ? "New client" : client.name}</h2>
          <div className="drawer-tags">
            <Tag value={client.priority || "Unassigned"} />
            {client.types.map((type) => (
              <Tag key={type} value={type} type />
            ))}
          </div>
          {detailContextError && (
            <p className="error" role="alert">
              {detailContextError}
            </p>
          )}
          <form id="client-detail-form">
            <fieldset
              className="detail-fields-container"
              disabled={saving || meetingEditing}
            >
              <ClientDetailGrid>
                {renderClientDetailFields({
                  client: draft,
                  context: detailContext,
                  disabled: saving || priorityPending,
                  demo: mode === "demo",
                  change: (name, value) =>
                    setDraft((current) => ({
                      ...current,
                      raw: {
                        ...current.raw,
                        [name]: Array.isArray(value)
                          ? value.map((option) => ({
                              ID: option.id,
                              display_value: option.label,
                            }))
                          : value && typeof value === "object"
                            ? {
                                ID: (value as { id: string }).id,
                                display_value: (value as { label: string })
                                  .label,
                              }
                            : value,
                      },
                      detailChanges: {
                        ...current.detailChanges,
                        [name]: value,
                      },
                    })),
                })}
                {editableKeys.map((key) => (
                  <label
                    className="form-field"
                    data-detail-field={key}
                    key={key}
                  >
                    {key === "note"
                      ? "Notes"
                      : columns.find((c) => c.key === key)?.label}
                    {key === "note" ? (
                      <textarea
                        rows={5}
                        maxLength={textLimits.note}
                        value={draft.note}
                        disabled={saving || meetingEditing}
                        onChange={(e) =>
                          setDraft({ ...draft, note: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        value={draft[key]}
                        maxLength={textLimits[key]}
                        type={key === "email" ? "email" : "text"}
                        onBlur={
                          key === "name"
                            ? () =>
                                setDraft((current) => ({
                                  ...current,
                                  name: current.name
                                    .trim()
                                    .replaceAll("\t", ""),
                                }))
                            : undefined
                        }
                        required={key === "name"}
                        disabled={saving || meetingEditing}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                {lookupError && (
                  <div className="error" role="alert">
                    {lookupError}{" "}
                    <IconButton
                      type="button"
                      onClick={() => void loadOptions()}
                      label="Retry options"
                      icon="refresh"
                    />
                  </div>
                )}
                <label className="form-field" data-detail-field="country">
                  Country *
                  <select
                    required
                    value={draft.countryId || ""}
                    disabled={saving || !lookups}
                    onChange={(e) => {
                      setCountryInput(true);
                      const option = lookups?.countries.find(
                        (o) => o.id === e.target.value,
                      );
                      setDraft({
                        ...draft,
                        countryId: e.target.value,
                        country: option?.label ?? "",
                        countryCode: option?.code ?? "",
                        state: "",
                      });
                    }}
                  >
                    <option value="">
                      {lookups ? "Select country" : "Loading countries…"}
                    </option>
                    {draft.countryId &&
                      !lookups?.countries.some(
                        (o) => o.id === draft.countryId,
                      ) && (
                        <option value={draft.countryId}>
                          {draft.country || "Current country"}
                        </option>
                      )}
                    {lookups?.countries.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field" data-detail-field="priority">
                  Priority tier
                  <select
                    value={draft.priority}
                    disabled={saving || meetingEditing}
                    onChange={(e) => void changePriority(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {priorityChoices.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                {priorityPending && (
                  <p role="status">Updating follow-up frequency…</p>
                )}
                {priorityError && (
                  <p className="error" role="alert">
                    {priorityError}
                  </p>
                )}
                {countryStates.error && (
                  <p className="error" role="alert">
                    {countryStates.error}
                  </p>
                )}
                {draft.countryId && countryStates.loading && (
                  <p role="status">Loading states…</p>
                )}
                {clientStateVisible(
                  creating ? "create" : "edit",
                  client.state,
                  countryInput,
                  draft.countryId ?? "",
                  countryStates.choices,
                ) && (
                  <label className="form-field" data-detail-field="state">
                    State
                    <select
                      value={draft.state}
                      disabled={
                        saving || countryStates.loading || !!countryStates.error
                      }
                      onChange={(e) =>
                        setDraft({ ...draft, state: e.target.value })
                      }
                    >
                      <option value="">Unassigned</option>
                      {draft.state &&
                        !countryStates.choices.includes(draft.state) && (
                          <option value={draft.state}>
                            {draft.state} (current)
                          </option>
                        )}
                      {countryStates.choices.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="form-field" data-detail-field="types">
                  <span>Customer type</span>
                  <fieldset
                    className="detail-lookup"
                    disabled={saving || meetingEditing}
                  >
                    <ClientChoiceDropdown
                      field={parseFormFields({
                        code: 3000,
                        fields: customerFields,
                      }).find((f) => f.name === "Customer_Type")!}
                      path="Customer_Type"
                      demo={mode === "demo"}
                      value={(draft.typeIds ?? []).map((id, i) => ({
                        id,
                        label: draft.types[i] ?? id,
                      }))}
                      change={(value) => {
                        const options = value as {
                          id: string;
                          label: string;
                        }[];
                        setDraft({
                          ...draft,
                          typeIds: options.map((o) => o.id),
                          types: options.map((o) => o.label),
                        });
                      }}
                    />
                  </fieldset>
                </div>
              </ClientDetailGrid>
            </fieldset>
          </form>
          {meetingEditing && (
            <p role="status">
              Save or cancel the Meeting Note row before closing or saving
              client details.
            </p>
          )}
          {dirty && (
            <p className="muted">
              Save your Client changes before editing Meeting Notes.
            </p>
          )}
          <fieldset
            className="detail-fields-container"
            disabled={saving || dirty}
          >
            <SubformEditor
              inlineMeetingNote
              client={client}
              store={subformStore}
              loadFormContext={loadFormContext}
              loadCountryStates={loadCountryStates}
              onClose={() => {}}
              onChanged={onMeetingChanged}
              onEditingChange={setMeetingEditing}
            />
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="drawer-footer">
          {onDelete && (
            <IconButton
              type="button"
              className="danger delete-button"
              disabled={saving || meetingEditing}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Delete client?",
                    description: `Delete ${client.name} from Creator? This cannot be undone from this widget.`,
                    confirmLabel: "Delete",
                    cancelLabel: "Cancel",
                  }))
                )
                  return;
                setSaving(true);
                setError("");
                try {
                  await onDelete();
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Delete failed.");
                } finally {
                  setSaving(false);
                }
              }}
              label="Delete client"
              icon="trash"
            />
          )}
          <IconButton
            type="button"
            onClick={close}
            disabled={saving || meetingEditing}
            label="Cancel"
            icon="close"
          />
          <IconButton
            className={`primary${creating ? " orange-action" : ""}`}
            disabled={
              meetingEditing ||
              (!creating && !dirty) ||
              saving ||
              stateBlocked ||
              priorityPending ||
              !!priorityError ||
              (creating && !lookups)
            }
            form="client-detail-form"
            type="submit"
            label={
              saving ? "Saving…" : creating ? "Create client" : "Save changes"
            }
            icon="check"
          />
        </footer>
      </div>
    </dialog>
  );
}

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<ClientLoadProgress>();
  const loadRequest = useRef<{
    records: Promise<Client[]>;
    intervals: ReturnType<typeof loadFollowUpIntervals>;
  } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState("");
  const [followUpDays, setFollowUpDays] = useState<FollowUpDays>({});
  const [followUpError, setFollowUpError] = useState("");
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayKey()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const [query, setQuery] = useState(initialQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchControl = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  function closeSearch() {
    setSearchOpen(false);
    setQuery((query) => ({ ...query, search: "" }));
    searchControl.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultOrder);
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [dropColumn, setDropColumn] = useState<ColumnKey | null>(null);
  const [conditions, setConditions] = useState<FilterGroup>(emptyFilters);
  const [editCondition, setEditCondition] = useState<string>();
  const [group, setGroup] = useState<GroupField[]>(["priority"]);
  const [hidden, setHidden] = useState<ColumnKey[]>(defaultHiddenColumns);
  const [fieldSearch, setFieldSearch] = useState("");
  const [columnContext, setColumnContext] =
    useState<ClientFormContext | null>();
  const [columnContextError, setColumnContextError] = useState("");
  const [contextRetry, setContextRetry] = useState(0);
  useEffect(() => {
    let canceled = false;
    setColumnContext(undefined);
    setColumnContextError("");
    loadFormContext()
      .then((value) => {
        if (!canceled) setColumnContext(value);
      })
      .catch((reason) => {
        if (!canceled)
          setColumnContextError(
            reason instanceof Error
              ? reason.message
              : "Could not check field visibility.",
          );
      });
    return () => {
      canceled = true;
    };
  }, [contextRetry]);
  const allowedColumns = workflowClientColumns(
    columnContext,
    clients.some((client) => !!client.state),
  );
  const allowedColumnKeys = new Set(allowedColumns.map((column) => column.key));
  const hiddenCount = allowedColumns.filter((column) =>
    hidden.includes(column.key),
  ).length;

  const [columnSearch, setColumnSearch] = useState<{
    key: ColumnKey;
    anchor: HTMLButtonElement;
  } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTargets, setBulkTargets] = useState<Client[] | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    key: EditableKey;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const recordOpener = useRef<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [widths, setWidths] = useState<Partial<Record<ColumnKey, number>>>({});
  const [page, setPage] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
  const preferences = usePreferences(
    preferenceStore,
    { columnOrder, hiddenColumns: hidden, filters: conditions },
    (value) => {
      setColumnOrder(value.columnOrder);
      if (value.hiddenColumns !== undefined)
        setHidden(value.hiddenColumns.filter((key) => key !== "name"));
      setConditions(value.filters);
    },
  );

  async function load() {
    if (loadRequest.current) return;
    setLoading(true);
    setError("");
    setLoadProgress(undefined);
    const request = {
      records: repository.list(setLoadProgress),
      intervals: loadFollowUpIntervals(),
    };
    loadRequest.current = request;
    try {
      const [records, intervals] = await Promise.all([
        request.records,
        request.intervals,
      ]);
      setFollowUpDays(intervals.days);
      setFollowUpError(intervals.warning);
      setClients(records);
      setSelected(new Set());
      setLoadProgress(undefined);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load clients. Check your connection and permissions.",
      );
    } finally {
      loadRequest.current = null;
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, group, conditions]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setPanel(null);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const filtered = useMemo(
    () => matchingClients(clients, query, conditions, followUpDays, today),
    [clients, query, conditions, followUpDays, today],
  );
  const pageSize = 100;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const groupMembers = useMemo(
    () =>
      pageCount > 1 && group.length
        ? new Map(
            groupClientLayers(filtered, group).map(({ id, members }) => [
              id,
              members,
            ]),
          )
        : undefined,
    [filtered, group, pageCount],
  );
  const groups = groupClientLayers(pageRows, group, collapsed).map((layer) => {
    const members = groupMembers?.get(layer.id) ?? layer.members;
    const checked = members.every(({ id }) => selected.has(id));
    return {
      ...layer,
      members,
      count: members.length,
      checked,
      mixed: !checked && members.some(({ id }) => selected.has(id)),
    };
  });
  const visible = columnOrder
    .map((key) => columns.find((column) => column.key === key)!)
    .filter(
      (column) =>
        allowedColumnKeys.has(column.key) && !hidden.includes(column.key),
    );
  const nameColumnIndex = visible.findIndex((column) => column.key === "name");
  const active = clients.find((client) => client.id === activeId);
  const filters =
    conditions.criteria.length + (conditions.columnCriteria?.length ?? 0);
  // Multiple conditions on the same field count as one selected field.
  const filteredFields = [
    ...new Set(
      [...conditions.criteria, ...(conditions.columnCriteria ?? [])].map(
        (condition) => condition.field,
      ),
    ),
  ];
  const filterSummary =
    filteredFields.length === 1
      ? `Filtered by ${filterFields.find((field) => field.key === filteredFields[0])?.label} (1 field)`
      : `Filtered by ${filteredFields.length} fields`;
  const hasFilters = Boolean(
    filters ||
    conditions.followUp ||
    query.search.trim() ||
    query.state ||
    query.priority ||
    query.type,
  );
  const loaded = loadProgress?.records.length ?? 0;
  const incomplete = loading || !!error;
  const hasUnloaded = incomplete && loadProgress?.hasMore === true;
  const hasSelection = selected.size > 0;
  const showExportOptions = !hasSelection && (hasFilters || hasUnloaded);
  const viewName = "Clients";
  const set = <K extends keyof ViewQuery>(key: K, value: ViewQuery[K]) =>
    setQuery((q) => ({ ...q, [key]: value }));

  function setRowsSelected(rows: Client[], checked: boolean) {
    setSelected((old) => {
      const next = new Set(old);
      for (const { id } of rows) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function exportRecords(scope: ExportScope, includeUnloaded: boolean) {
    // Take the loaded snapshot at confirmation, while the grid still waits for all pages.
    let records =
      incomplete && !hasSelection ? (loadProgress?.records ?? []) : clients;
    let days = followUpDays;
    if (hasSelection) {
      records = records.filter((client) => selected.has(client.id));
    } else if (incomplete) {
      if (hasUnloaded && includeUnloaded && !loadRequest.current) void load();
      const request = loadRequest.current;
      if (request && hasUnloaded && includeUnloaded)
        records = await request.records;
      if (request && scope === "filtered" && conditions.followUp) {
        days = (await request.intervals).days;
      }
    }
    const rows =
      hasSelection || scope === "all"
        ? queryClients(records, {
            ...initialQuery,
            sort: query.sort,
            direction: query.direction,
          })
        : matchingClients(records, query, conditions, days, today);
    if (!rows.length)
      throw new Error("There are no records to export for this choice.");
    downloadCsv(rows, visible);
    setToast(
      `CSV prepared: ${rows.length} ${rows.length === 1 ? "client" : "clients"}, ${visible.length} ${visible.length === 1 ? "column" : "columns"}. Check your downloads.`,
    );
  }

  async function save(id: string, patch: Partial<Client>) {
    const normalized = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    // Refresh the changed tier's metadata at the save boundary, so the UI does
    // not reuse an interval loaded before the user's Priority change.
    let priorityDays: number | undefined;
    if (typeof normalized.priority === "string" && normalized.priority) {
      const frequency =
        mode === "demo"
          ? ({ "Tier 1": "30", "Tier 2": "60", "Tier 3": "90" }[
              normalized.priority
            ] ?? "")
          : await fetchFollowUpFrequency(normalized.priority);
      priorityDays = Number(frequency);
      normalized.detailChanges = {
        ...patch.detailChanges,
        Follow_Up_Frequency: frequency,
      };
      normalized.raw = {
        ...(patch.raw ?? clients.find((row) => row.id === id)?.raw),
        Follow_Up_Frequency: frequency,
      };
    }
    await repository.update(id, normalized);
    if (priorityDays !== undefined)
      setFollowUpDays((days) => ({
        ...days,
        [String(normalized.priority)]: priorityDays!,
      }));
    setClients((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...normalized } : row)),
    );
    // A confirmed write must not be retried if refreshing workflow results fails.
    if (mode !== "demo") {
      try {
        setClients(await repository.list());
      } catch {
        setToast(
          "Changes saved. Could not refresh workflow results; reload the clients to see updated values.",
        );
        return;
      }
    }
    setToast(
      mode === "demo"
        ? "Saved in this demo session"
        : "Changes saved to Creator",
    );
  }
  function resize(event: React.PointerEvent, key: ColumnKey, current: number) {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const start = event.clientX;
    const move = (e: PointerEvent) =>
      setWidths((w) => ({
        ...w,
        [key]: Math.max(100, Math.min(500, current + e.clientX - start)),
      }));
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }

  return (
    <div className="app">
      {columnSearch && (
        <ColumnSearchPopover
          key={columnSearch.key}
          anchor={columnSearch.anchor}
          name={columnSearch.key}
          label={
            columns.find((column) => column.key === columnSearch.key)!.label
          }
          options={filterOptions(clients, columnSearch.key)}
          value={conditions.columnCriteria?.find(
            (row) => row.field === columnSearch.key,
          )}
          onClose={(restoreFocus = true) => {
            if (restoreFocus) columnSearch.anchor.focus();
            setColumnSearch(null);
          }}
          onApply={(value) => {
            setConditions((old) => ({
              ...old,
              columnCriteria: [
                ...(old.columnCriteria ?? []).filter(
                  (row) => row.field !== columnSearch.key,
                ),
                ...(value
                  ? [
                      {
                        ...value,
                        id: `column:${columnSearch.key}`,
                        field: columnSearch.key,
                      },
                    ]
                  : []),
              ],
            }));
            columnSearch.anchor.focus();
            setColumnSearch(null);
          }}
        />
      )}
      <div className="workspace">
        <main>
          <div className="view-heading">
            <Icon name="grid" />
            <h1>{viewName}</h1>
            <span className="view-count">
              {filtered.length} {filtered.length === 1 ? "client" : "clients"}
            </span>
            <IconButton
              className="refresh-button"
              disabled={loading || Boolean(editing)}
              onClick={() => void load()}
              label="Refresh clients"
              icon="refresh"
            />
            <IconButton
              label={
                hasSelection
                  ? `Export ${selected.size} selected ${selected.size === 1 ? "client" : "clients"} as CSV`
                  : "Export CSV"
              }
              icon="download"
              aria-haspopup={showExportOptions ? "dialog" : undefined}
              disabled={
                Boolean(editing) ||
                !preferences.loaded ||
                (!hasSelection &&
                  (incomplete ? !loaded && !hasUnloaded : clients.length === 0))
              }
              onClick={() => {
                if (showExportOptions) setExportOpen(true);
                else
                  void exportRecords("all", false).catch((reason) =>
                    setToast(reason.message),
                  );
              }}
            />
            <IconButton
              className="primary add-client"
              disabled={Boolean(editing) || loading || Boolean(error)}
              onClick={() => setCreating(true)}
              label="Add client"
              icon="plus"
            />
          </div>
          <div
            className="toolbar"
            ref={menuRef}
            inert={editing || !preferences.loaded ? true : undefined}
          >
            <div className="tools">
              <select
                aria-label="Follow-up filter"
                value={conditions.followUp ?? ""}
                disabled={loading}
                onChange={(event) =>
                  setConditions((old) => ({
                    ...old,
                    followUp: (event.target.value ||
                      undefined) as FilterGroup["followUp"],
                  }))
                }
              >
                <option value="">All follow-ups</option>
                <option value="overdue">Overdue follow-ups</option>
                <option value="due-soon">Follow-ups due in 7 days</option>
              </select>
              <IconButton
                className={hiddenCount ? "tool active-tool" : "tool"}
                onClick={() => setPanel(panel === "fields" ? null : "fields")}
                aria-expanded={panel === "fields"}
                label={
                  hiddenCount
                    ? `Show or hide fields (${hiddenCount} hidden)`
                    : "Show or hide fields"
                }
                visibleText={
                  hiddenCount
                    ? `${hiddenCount} ${hiddenCount === 1 ? "field" : "fields"} hidden`
                    : undefined
                }
                icon="eye"
              />
              <IconButton
                className={filters ? "tool filter-active" : "tool"}
                onClick={() => {
                  setEditCondition(undefined);
                  setPanel(panel === "filter" ? null : "filter");
                }}
                aria-expanded={panel === "filter"}
                label="Filter clients"
                visibleText={filters ? filterSummary : undefined}
                icon="filter"
              />
              <IconButton
                className={group.length ? "tool group-active" : "tool"}
                onClick={() => setPanel(panel === "group" ? null : "group")}
                aria-expanded={panel === "group"}
                label={`Group clients (${group.join(", ") || "none"})`}
                visibleText={
                  group.length
                    ? `Grouped by ${group.length} ${group.length === 1 ? "field" : "fields"}`
                    : undefined
                }
                icon="group"
              />
              <IconButton
                className={
                  query.direction !== "default" ? "tool sort-active" : "tool"
                }
                onClick={() => setPanel(panel === "sort" ? null : "sort")}
                aria-expanded={panel === "sort"}
                label="Sort clients"
                icon="sort"
              />
            </div>
            <div
              ref={searchControl}
              className={`search ${searchOpen ? "search-expanded" : "search-collapsed"}`}
              onKeyDown={(event) => {
                if (event.key === "Escape" && searchOpen) {
                  event.preventDefault();
                  event.stopPropagation();
                  closeSearch();
                }
              }}
            >
              <IconButton
                label="Search clients"
                icon="search"
                aria-expanded={searchOpen}
                aria-controls={searchOpen ? "client-search" : undefined}
                onClick={() => {
                  setSearchOpen(true);
                  searchInput.current?.focus();
                }}
              />
              {searchOpen && (
                <>
                  <input
                    id="client-search"
                    ref={searchInput}
                    autoFocus
                    placeholder="Search clients…"
                    aria-label="Search clients"
                    value={query.search}
                    onChange={(event) => set("search", event.target.value)}
                  />
                  <IconButton
                    onClick={closeSearch}
                    label="Close and clear search"
                    icon="close"
                  />
                </>
              )}
            </div>
            {panel && (
              <div className={`popover popover-${panel}`}>
                <div className="popover-title">
                  <strong>
                    {panel === "fields"
                      ? "Visible fields"
                      : panel === "filter"
                        ? "Filter clients"
                        : panel === "sort"
                          ? "Sort records"
                          : "Group records"}
                  </strong>
                  <IconButton
                    className="icon-button"
                    onClick={() => setPanel(null)}
                    label="Close options"
                    icon="close"
                  />
                </div>
                {panel === "fields" && (
                  <>
                    <input
                      aria-label="Find a field"
                      placeholder="Find a field…"
                      value={fieldSearch}
                      onChange={(event) => setFieldSearch(event.target.value)}
                    />
                    {columnContextError ? (
                      <p role="alert" className="error">
                        {columnContextError} Team-dependent fields remain
                        hidden.
                        <IconButton
                          label="Retry field visibility"
                          icon="refresh"
                          onClick={() => setContextRetry((value) => value + 1)}
                        />
                      </p>
                    ) : columnContext === undefined ? (
                      <p role="status">Checking field visibility…</p>
                    ) : null}
                    <div className="field-options">
                      {allowedColumns
                        .filter((column) =>
                          column.label
                            .toLowerCase()
                            .includes(fieldSearch.trim().toLowerCase()),
                        )
                        .sort((a, b) =>
                          a.label.localeCompare(b.label, undefined, {
                            sensitivity: "base",
                          }),
                        )
                        .map((c) => (
                          <label className="check-option" key={c.key}>
                            <input
                              type="checkbox"
                              checked={!hidden.includes(c.key)}
                              disabled={c.key === "name"}
                              onChange={() =>
                                setHidden((h) =>
                                  h.includes(c.key)
                                    ? h.filter((k) => k !== c.key)
                                    : [...h, c.key],
                                )
                              }
                            />
                            {c.label}
                          </label>
                        ))}
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      aria-label="Reset to default fields"
                      onClick={() => {
                        setHidden([...defaultHiddenColumns]);
                        setFieldSearch("");
                      }}
                    >
                      Reset
                    </button>
                  </>
                )}
                {panel === "filter" && (
                  <FiltersPanel
                    key={`${editCondition ?? "new"}-${JSON.stringify(conditions)}`}
                    value={conditions}
                    clients={clients}
                    editId={editCondition}
                    onApply={(value) => {
                      setConditions((old) => ({
                        ...value,
                        followUp: old.followUp,
                        columnCriteria: old.columnCriteria,
                        columnMatch: old.columnMatch,
                      }));
                      setPanel(null);
                    }}
                  />
                )}
                {panel === "sort" && (
                  <>
                    <label className="form-field">
                      Field
                      <select
                        value={query.sort}
                        onChange={(e) =>
                          set("sort", e.target.value as ColumnKey)
                        }
                      >
                        {columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      Direction
                      <select
                        value={query.direction}
                        onChange={(e) =>
                          set(
                            "direction",
                            e.target.value as ViewQuery["direction"],
                          )
                        }
                      >
                        <option value="default">Default</option>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </label>
                  </>
                )}
                {panel === "group" && (
                  <div className="group-levels">
                    {group.map((field, index) => (
                      <div className="group-level" key={index}>
                        <label className="form-field">
                          {index === 0 ? "Group by" : "Then group by"}
                          <select
                            className="group-field-select"
                            aria-label={`Grouping level ${index + 1}`}
                            value={field}
                            onChange={(event) => {
                              setGroup((levels) =>
                                levels.map((current, i) =>
                                  i === index
                                    ? (event.target.value as GroupField)
                                    : current,
                                ),
                              );
                              setCollapsed(new Set());
                            }}
                          >
                            {groupingFields
                              .filter(
                                (option) =>
                                  option.key === field ||
                                  !group.includes(option.key),
                              )
                              .map((option) => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                        </label>
                        {index > 0 && (
                          <button
                            aria-label={`Move grouping level ${index + 1} up`}
                            onClick={() => {
                              setGroup((levels) => {
                                const next = [...levels];
                                [next[index - 1], next[index]] = [
                                  next[index],
                                  next[index - 1],
                                ];
                                return next;
                              });
                              setCollapsed(new Set());
                            }}
                          >
                            ↑
                          </button>
                        )}
                        <IconButton
                          label={`Remove grouping level ${index + 1}`}
                          icon="close"
                          onClick={() => {
                            setGroup((levels) =>
                              levels.filter((_, i) => i !== index),
                            );
                            setCollapsed(new Set());
                          }}
                        />
                      </div>
                    ))}
                    {group.length < groupingFields.length && (
                      <IconButton
                        label="Add grouping level"
                        icon="plus"
                        onClick={() => {
                          const next = groupingFields.find(
                            (field) => !group.includes(field.key),
                          );
                          if (next) setGroup((levels) => [...levels, next.key]);
                          setCollapsed(new Set());
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div inert={editing || !preferences.loaded ? true : undefined}>
            {!!conditions.columnCriteria?.length && (
              <div className="column-search-chips">
                {conditions.columnCriteria.map((row, index) => (
                  <React.Fragment key={row.field}>
                    {index > 0 && (
                      <label className="column-match-control">
                        <select
                          aria-label="Combine column filters"
                          value={conditions.columnMatch ?? "all"}
                          onChange={(event) =>
                            setConditions((old) => ({
                              ...old,
                              columnMatch: event.target.value as "all" | "any",
                            }))
                          }
                        >
                          <option value="all">AND</option>
                          <option value="any">OR</option>
                        </select>
                      </label>
                    )}
                    <span>
                      <span className="column-chip-text">
                        {
                          columns.find((column) => column.key === row.field)
                            ?.label
                        }{" "}
                        · {operators[row.operator]}{" "}
                        {conditionText(row.operator, row.value)}
                      </span>
                      <span className="column-chip-actions">
                        <IconButton
                          label={`Edit ${columns.find((column) => column.key === row.field)?.label} search`}
                          icon="edit"
                          onClick={(event) =>
                            setColumnSearch({
                              key: row.field,
                              anchor: event.currentTarget,
                            })
                          }
                        />
                        <IconButton
                          label={`Clear ${columns.find((column) => column.key === row.field)?.label} search`}
                          icon="close"
                          onClick={() =>
                            setConditions((old) => ({
                              ...old,
                              columnCriteria: old.columnCriteria?.filter(
                                (item) => item.field !== row.field,
                              ),
                            }))
                          }
                        />
                      </span>
                    </span>
                  </React.Fragment>
                ))}
                <button
                  onClick={() =>
                    setConditions((old) => ({ ...old, columnCriteria: [] }))
                  }
                >
                  Clear
                </button>
              </div>
            )}

            <FiltersSummary
              value={conditions}
              onChange={(value) =>
                setConditions((old) => ({
                  ...value,
                  columnCriteria: old.columnCriteria,
                  columnMatch: old.columnMatch,
                }))
              }
              onEdit={(id) => {
                setEditCondition(id);
                setPanel("filter");
              }}
            />
          </div>
          {(followUpError ||
            clients.some(
              (client) =>
                followUpStatus(client, followUpDays, today) === "unknown",
            )) &&
            !loading && (
              <div className="preference-error" role="status">
                {followUpError ||
                  "Some clients have no readable meeting date or configured priority tier. Their follow-up status is unavailable."}
              </div>
            )}
          {preferences.error && (
            <div className="preference-error" role="alert">
              <span>{preferences.error}</span>
              {preferences.canRetry && (
                <IconButton
                  label={preferences.retryLabel}
                  icon="refresh"
                  onClick={preferences.retry}
                />
              )}
            </div>
          )}
          {loading || !preferences.loaded ? (
            <div className="status-state" role="status">
              <div className="spinner" />
              <h2>Opening your client database</h2>
              <p>
                {loaded
                  ? `${loaded.toLocaleString()} records loaded…`
                  : "Getting your workspace ready…"}
              </p>
            </div>
          ) : error ? (
            <div className="status-state" role="alert">
              <Icon name="grid" size={32} />
              <h2>We couldn’t load your clients</h2>
              <p>{error}</p>
              <IconButton
                className="primary"
                onClick={() => void load()}
                label="Try again"
                icon="refresh"
              />
              {mode === "zoho" && (
                <a href="?demo=1">Explore the demo workspace</a>
              )}
            </div>
          ) : !filtered.length ? (
            <div className="status-state">
              <Icon name="search" size={32} />
              <h2>
                {clients.length
                  ? "No matching clients"
                  : "Your client database is empty"}
              </h2>
              <p>
                {clients.length
                  ? "Try another search or clear your filters."
                  : "Records available to your portal account will appear here."}
              </p>
              {clients.length > 0 && (
                <IconButton
                  onClick={() => {
                    setQuery(initialQuery);
                    setConditions(emptyFilters);
                  }}
                  label="Reset view"
                  icon="reset"
                />
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table
                aria-label="Client database"
                style={{
                  width: visible.reduce(
                    (sum, c) => sum + (widths[c.key] ?? c.width),
                    0,
                  ),
                }}
              >
                <colgroup>
                  {visible.map((c) => (
                    <col
                      key={c.key}
                      style={{ width: widths[c.key] ?? c.width }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {visible.map((c) => (
                      <th
                        key={c.key}
                        className={`${c.key === "name" ? "name-header" : ""} ${dropColumn === c.key ? "column-drop-target" : ""}`}
                        onDragOver={(event) => {
                          if (!draggedColumn || editing) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropColumn(c.key);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedColumn && !editing)
                            setColumnOrder((order) =>
                              moveColumn(order, draggedColumn, c.key),
                            );
                          setDraggedColumn(null);
                          setDropColumn(null);
                        }}
                      >
                        {c.key === "name" && (
                          <label className="row-selection-target">
                            <input
                              ref={(node) => {
                                if (node)
                                  node.indeterminate =
                                    pageRows.some((c) => selected.has(c.id)) &&
                                    !pageRows.every((c) => selected.has(c.id));
                              }}
                              type="checkbox"
                              aria-label="Select clients on this page"
                              checked={
                                pageRows.length > 0 &&
                                pageRows.every((c) => selected.has(c.id))
                              }
                              onChange={(e) =>
                                setRowsSelected(pageRows, e.target.checked)
                              }
                            />
                          </label>
                        )}
                        <div
                          className={`column-title ${conditions.columnCriteria?.some((row) => row.field === c.key) ? "has-search" : ""}`}
                          draggable={!editing}
                          onDragStart={(event) => {
                            setDraggedColumn(c.key);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", c.key);
                          }}
                          onDragEnd={() => {
                            setDraggedColumn(null);
                            setDropColumn(null);
                          }}
                          inert={
                            editing || !preferences.loaded ? true : undefined
                          }
                        >
                          <button
                            aria-label={`${c.label}; drag to reorder, or use Alt plus arrow keys`}
                            onKeyDown={(event) => {
                              if (
                                !event.altKey ||
                                !["ArrowLeft", "ArrowRight"].includes(event.key)
                              )
                                return;
                              event.preventDefault();
                              const index = visible.findIndex(
                                (column) => column.key === c.key,
                              );
                              const target =
                                visible[
                                  index + (event.key === "ArrowLeft" ? -1 : 1)
                                ];
                              if (target)
                                setColumnOrder((order) =>
                                  moveColumn(order, c.key, target.key),
                                );
                            }}
                            onClick={(event) => {
                              setPanel(null);
                              setColumnSearch({
                                key: c.key,
                                anchor: event.currentTarget,
                              });
                            }}
                          >
                            {c.label}
                          </button>
                          <button
                            className="column-sort"
                            aria-label={`Sort ${c.label}`}
                            onClick={() =>
                              setQuery((query) => ({
                                ...query,
                                sort: c.key,
                                direction:
                                  query.sort !== c.key ||
                                  query.direction === "default"
                                    ? "asc"
                                    : query.direction === "asc"
                                      ? "desc"
                                      : "default",
                              }))
                            }
                          >
                            {query.direction !== "default" &&
                            query.sort === c.key ? (
                              query.direction === "asc" ? (
                                "↑"
                              ) : (
                                "↓"
                              )
                            ) : (
                              <Icon name="chevron-down" size={12} />
                            )}
                          </button>
                        </div>
                        <span
                          className="resize-handle"
                          role="separator"
                          aria-label={`Resize ${c.label}`}
                          aria-orientation="vertical"
                          aria-valuemin={100}
                          aria-valuemax={500}
                          aria-valuenow={widths[c.key] ?? c.width}
                          tabIndex={0}
                          onPointerDown={(e) =>
                            resize(e, c.key, widths[c.key] ?? c.width)
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "ArrowRight" ||
                              e.key === "ArrowLeft"
                            ) {
                              e.preventDefault();
                              setWidths((w) => ({
                                ...w,
                                [c.key]: Math.max(
                                  100,
                                  Math.min(
                                    500,
                                    (w[c.key] ?? c.width) +
                                      (e.key === "ArrowRight" ? 20 : -20),
                                  ),
                                ),
                              }));
                            }
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                {groups.map(
                  ({
                    id: groupId,
                    field: groupField,
                    label,
                    rows,
                    depth,
                    members,
                    count,
                    checked,
                    mixed,
                  }) => (
                    <tbody key={groupId}>
                      {groupField && (
                        <tr className="group-row">
                          {nameColumnIndex > 0 && (
                            <td colSpan={nameColumnIndex} />
                          )}
                          <td colSpan={visible.length - nameColumnIndex}>
                            <div className="group-heading">
                              <label className="row-selection-target">
                                <input
                                  ref={(node) => {
                                    if (node) node.indeterminate = mixed;
                                  }}
                                  type="checkbox"
                                  aria-label={`Select ${label} group`}
                                  checked={checked}
                                  disabled={Boolean(editing)}
                                  onChange={(event) =>
                                    setRowsSelected(
                                      members,
                                      event.target.checked,
                                    )
                                  }
                                />
                              </label>
                              <button
                                className="group-toggle"
                                style={{ paddingLeft: 12 + depth * 24 }}
                                disabled={Boolean(editing)}
                                aria-expanded={!collapsed.has(groupId)}
                                onClick={() =>
                                  setCollapsed((old) => {
                                    const next = new Set(old);
                                    if (next.has(groupId)) next.delete(groupId);
                                    else next.add(groupId);
                                    return next;
                                  })
                                }
                              >
                                <span
                                  className={
                                    collapsed.has(groupId)
                                      ? "group-chevron closed"
                                      : "group-chevron"
                                  }
                                >
                                  <Icon name="chevron-down" size={14} />
                                </span>
                                <span className="group-label">
                                  {groupField === "priority"
                                    ? "PRIORITY TIER"
                                    : "STATE"}
                                </span>
                                {groupField === "priority" ? (
                                  <Tag value={label} />
                                ) : (
                                  <strong>{label}</strong>
                                )}
                                <span className="group-count">
                                  {count} {count === 1 ? "client" : "clients"}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!collapsed.has(groupId) &&
                        rows.map((client) => (
                          <tr
                            key={client.id}
                            className={
                              selected.has(client.id) ? "selected-row" : ""
                            }
                          >
                            {visible.map((c) => (
                              <td
                                key={c.key}
                                title={
                                  c.key === "name"
                                    ? followUpLabels[
                                        followUpStatus(
                                          client,
                                          followUpDays,
                                          today,
                                        )
                                      ]
                                    : undefined
                                }
                                className={`${c.key === "name" ? `name-cell follow-up-${followUpStatus(client, followUpDays, today)}` : ""} ${editing?.id === client.id && editing.key === c.key ? "editing-cell" : ""}`}
                              >
                                {c.key === "name" && (
                                  <label className="row-selection-target">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${client.name}`}
                                      checked={selected.has(client.id)}
                                      onChange={(event) =>
                                        setRowsSelected(
                                          [client],
                                          event.target.checked,
                                        )
                                      }
                                    />
                                  </label>
                                )}
                                {editing?.id === client.id &&
                                editing.key === c.key ? (
                                  <CellEditor
                                    client={client}
                                    field={editing.key}
                                    onCancel={() => setEditing(null)}
                                    onSave={async (value) => {
                                      await save(client.id, { [c.key]: value });
                                      setEditing(null);
                                    }}
                                  />
                                ) : c.key === "priority" ? (
                                  <div className="cell-content">
                                    {client.priority && (
                                      <Tag value={client.priority} />
                                    )}
                                  </div>
                                ) : c.key === "types" ? (
                                  <div className="cell-content">
                                    {client.types.map((t) => (
                                      <Tag key={t} value={t} type />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="cell-wrap">
                                    <button
                                      className="cell-value"
                                      disabled={Boolean(editing)}
                                      title={
                                        displayValue(
                                          columnValue(client, c.key),
                                        ) || "Empty"
                                      }
                                      onDoubleClick={() => {
                                        if (
                                          editableKeys.includes(
                                            c.key as EditableKey,
                                          )
                                        )
                                          setEditing({
                                            id: client.id,
                                            key: c.key as EditableKey,
                                          });
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "F2" &&
                                          editableKeys.includes(
                                            c.key as EditableKey,
                                          )
                                        ) {
                                          e.preventDefault();
                                          setEditing({
                                            id: client.id,
                                            key: c.key as EditableKey,
                                          });
                                        }
                                      }}
                                    >
                                      {displayValue(
                                        columnValue(client, c.key),
                                      ) || (
                                        <span className="empty-cell">—</span>
                                      )}
                                    </button>
                                    {c.key === "name" && (
                                      <IconButton
                                        className="open-record"
                                        disabled={Boolean(editing)}
                                        onClick={(event) => {
                                          recordOpener.current =
                                            event.currentTarget;
                                          setActiveId(client.id);
                                        }}
                                        label={`Open ${client.name}`}
                                        icon="expand"
                                      />
                                    )}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  ),
                )}
              </table>
            </div>
          )}
          <footer className="statusbar">
            {preferences.saving && <span role="status">Saving view…</span>}
            {selected.size > 0 ? (
              <div className="selection-summary">
                <span role="status" aria-live="polite" aria-atomic="true">
                  <strong>{selected.size.toLocaleString()} selected</strong>
                  <span className="selection-export-hint">
                    {" · Ready to edit or export"}
                  </span>
                </span>
                <IconButton
                  label="Edit selected clients"
                  visibleText="Edit"
                  icon="edit"
                  disabled={
                    !!editing ||
                    loading ||
                    !!error ||
                    !clients.some((client) => selected.has(client.id))
                  }
                  onClick={() =>
                    setBulkTargets(
                      clients.filter((client) => selected.has(client.id)),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Clear selection"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            ) : (
              <span>
                {filtered.length.toLocaleString()}{" "}
                {filtered.length === 1 ? "client" : "clients"}
                {query.state && ` in ${query.state}`}
              </span>
            )}

            <div className="pagination">
              <IconButton
                disabled={currentPage <= 1 || Boolean(editing)}
                onClick={() => setPage((p) => p - 1)}
                label="Previous page"
                icon="previous"
              />
              <span>
                {currentPage} / {pageCount}
              </span>
              <IconButton
                disabled={currentPage >= pageCount || Boolean(editing)}
                onClick={() => setPage((p) => p + 1)}
                label="Next page"
                icon="arrow"
              />
            </div>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span className="toast-message">{toast}</span>
          <IconButton
            label="Dismiss notification"
            icon="close"
            onClick={() => setToast("")}
          />
        </div>
      )}
      {exportOpen && !hasSelection && (
        <ExportWindow
          filtered={hasFilters}
          hasUnloaded={hasUnloaded}
          onClose={() => setExportOpen(false)}
          onExport={exportRecords}
        />
      )}
      {creating && (
        <CreateClientWindow
          demo={mode === "demo"}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setClients((rows) => [...rows, created]);
            setQuery(initialQuery);
            setToast(
              mode === "demo" ? "Client created in demo" : "Client created",
            );
          }}
        />
      )}
      {bulkTargets && (
        <BulkEditWindow
          clients={bulkTargets}
          allClients={clients}
          hiddenCount={
            bulkTargets.filter(
              (client) => !filtered.some((row) => row.id === client.id),
            ).length
          }
          loadLookups={(rows) => repository.lookups(rows)}
          loadStates={loadCountryStates}
          loadFrequency={(priority) =>
            mode === "demo"
              ? Promise.resolve(
                  (
                    {
                      "Tier 1": "30",
                      "Tier 2": "60",
                      "Tier 3": "90",
                    } as Record<string, string>
                  )[priority] ?? "",
                )
              : fetchFollowUpFrequency(priority)
          }
          onClose={() => setBulkTargets(null)}
          apply={async (patch, progress, stop) => {
            const results = await applyBulkPatch(
              bulkTargets,
              patch,
              async (id, change) => {
                const current = bulkTargets.find((client) => client.id === id);
                const writePatch = {
                  ...change,
                  raw: { ...current?.raw, ...change.detailChanges },
                };
                await repository.update(id, writePatch);
                setClients((rows) =>
                  rows.map((row) =>
                    row.id === id
                      ? {
                          ...row,
                          ...change,
                          raw: { ...row.raw, ...change.detailChanges },
                        }
                      : row,
                  ),
                );
              },
              progress,
              stop,
            );
            const savedIds = new Set(
              results
                .filter((result) => result.status === "saved")
                .map((result) => result.id),
            );
            setSelected(
              (previous) =>
                new Set([...previous].filter((id) => !savedIds.has(id))),
            );
            if (
              patch.priority &&
              savedIds.size &&
              patch.detailChanges?.Follow_Up_Frequency !== undefined
            )
              setFollowUpDays((previous) => ({
                ...previous,
                [patch.priority!]: Number(
                  patch.detailChanges!.Follow_Up_Frequency,
                ),
              }));
            if (
              mode !== "demo" &&
              results.some((result) => result.status !== "not-attempted")
            ) {
              try {
                setClients(await repository.list());
              } catch {
                setToast(
                  "Bulk updates processed. Could not refresh workflow results; reload clients before making more changes.",
                );
              }
            }
            return results;
          }}
        />
      )}
      {active && (
        <RecordDrawer
          clients={clients}
          key={active.id}
          client={active}
          opener={recordOpener.current}
          onMeetingChanged={() => load()}
          onClose={() => setActiveId(null)}
          onSave={(patch) => save(active.id, patch)}
          onDelete={async () => {
            await repository.remove(active.id);
            setClients((rows) => rows.filter((row) => row.id !== active.id));
            setSelected((old) => {
              const next = new Set(old);
              next.delete(active.id);
              return next;
            });
            setToast(
              mode === "demo" ? "Client deleted from demo" : "Client deleted",
            );
          }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
