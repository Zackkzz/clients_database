import { useEffect, useId, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { SubformLookupDropdown } from "./SubformLookupDropdown";
import { useConfirmation } from "./useConfirmation";
import { useCountryStates } from "./useCountryStates";
import {
  commonCountry,
  prepareBulkPatch,
  type BulkChanges,
  type BulkField,
  type BulkResult,
} from "./bulk-edit";
import { priorityChoices, type Client, type ClientLookups } from "./model";

const fields: { key: BulkField; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "types", label: "Customer Type" },
  { key: "country", label: "Country" },
  { key: "state", label: "State" },
];

/** Explicit opt-in fields prevent mixed existing values from being overwritten accidentally. */
export function BulkEditWindow({
  clients,
  allClients,
  hiddenCount,
  loadLookups,
  loadStates,
  loadFrequency,
  apply,
  onClose,
}: {
  clients: Client[];
  allClients: Client[];
  hiddenCount: number;
  loadLookups: (clients: Client[]) => Promise<ClientLookups>;
  loadStates: (country: string) => Promise<string[]>;
  loadFrequency: (priority: string) => Promise<string>;
  apply: (
    patch: Partial<Client>,
    progress: (results: BulkResult[]) => void,
    stop: () => boolean,
  ) => Promise<BulkResult[]>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const stop = useRef(false);
  const running = useRef(false);
  const title = useId();
  const { confirm, confirmation } = useConfirmation();
  const [changes, setChanges] = useState<BulkChanges>({
    fields: [],
    priority: "",
    typeIds: [],
    countryId: "",
    state: "",
  });
  const [lookups, setLookups] = useState<ClientLookups>();
  const [lookupError, setLookupError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [finished, setFinished] = useState(false);
  const enabled = (field: BulkField) => changes.fields.includes(field);
  const targetCountry = enabled("country")
    ? changes.countryId
    : commonCountry(clients);
  const states = useCountryStates(targetCountry, loadStates);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    first.current?.focus();
    let alive = true;
    loadLookups(allClients)
      .then((value) => {
        if (alive) setLookups(value);
      })
      .catch((reason) => {
        if (alive)
          setLookupError(
            reason instanceof Error
              ? reason.message
              : "Could not load choices.",
          );
      });
    return () => {
      alive = false;
      dialog.current?.close();
      previous?.focus();
    };
  }, []);
  async function close() {
    if (running.current) return;
    if (
      finished ||
      !changes.fields.length ||
      (await confirm({
        title: "Discard bulk changes?",
        description: "These changes have not been applied to any clients.",
        confirmLabel: "Discard",
      }))
    )
      onClose();
  }
  function toggle(field: BulkField) {
    setChanges((old) => ({
      ...old,
      fields: old.fields.includes(field)
        ? old.fields.filter((key) => key !== field)
        : [...old.fields, field],
      ...(field === "country" ? { state: "" } : {}),
    }));
    setError("");
  }
  const saved = results?.filter((row) => row.status === "saved").length ?? 0;
  const pending = results?.filter((row) => row.status !== "saved") ?? [];
  return (
    <dialog
      ref={dialog}
      className="client-create-window bulk-edit-window"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
    >
      {confirmation}
      <header>
        <div>
          <h2 id={title}>Edit {clients.length} selected clients</h2>
          <p>
            Choose which fields to replace. All other values stay unchanged.
          </p>
        </div>
        <IconButton
          icon="close"
          label="Close bulk editing"
          disabled={busy}
          onClick={() => void close()}
        />
      </header>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (running.current || finished) return;
          running.current = true;
          setBusy(true);
          setError("");
          try {
            if (!lookups) throw new Error("Wait for field choices to load.");
            const patch = await prepareBulkPatch(
              clients,
              changes,
              lookups,
              loadStates,
              loadFrequency,
            );
            const outcome = await apply(patch, setResults, () => stop.current);
            setResults(outcome);
            setFinished(true);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not apply changes.",
            );
          } finally {
            running.current = false;
            setBusy(false);
          }
        }}
      >
        <div className="bulk-edit-body">
          {hiddenCount > 0 && (
            <p className="bulk-scope-note">
              Includes {hiddenCount} selected clients outside the current
              filters.
            </p>
          )}
          {lookupError && (
            <p role="alert" className="error">
              {lookupError} Close and reopen to retry.
            </p>
          )}
          {!lookups && !lookupError && (
            <p role="status">Loading field choices…</p>
          )}
          {!finished && (
            <fieldset disabled={busy || !lookups} className="bulk-fields">
              {fields.map((field, index) => (
                <section
                  className={`bulk-field ${enabled(field.key) ? "enabled" : ""}`}
                  key={field.key}
                >
                  <label className="bulk-field-toggle">
                    <input
                      ref={index === 0 ? first : undefined}
                      type="checkbox"
                      aria-label={`Change ${field.label}`}
                      checked={enabled(field.key)}
                      onChange={() => toggle(field.key)}
                    />
                    <strong>{field.label}</strong>
                    <span>
                      {enabled(field.key)
                        ? "Replace value"
                        : "Keep existing values"}
                    </span>
                  </label>
                  {enabled(field.key) && (
                    <div className="bulk-field-control">
                      {field.key === "priority" && (
                        <>
                          <select
                            aria-label="New Priority"
                            value={changes.priority}
                            onChange={(e) =>
                              setChanges((old) => ({
                                ...old,
                                priority: e.target.value,
                              }))
                            }
                          >
                            <option value="">Clear priority</option>
                            {priorityChoices.map((tier) => (
                              <option key={tier}>{tier}</option>
                            ))}
                          </select>
                          <small>
                            Follow-up timing will use the selected tier’s
                            configured interval.
                          </small>
                        </>
                      )}
                      {field.key === "types" && (
                        <>
                          <SubformLookupDropdown
                            label="Customer Type"
                            options={lookups?.customerTypes ?? []}
                            selected={changes.typeIds}
                            multiple
                            disabled={busy}
                            onChange={(value) =>
                              setChanges((old) => ({
                                ...old,
                                typeIds: Array.isArray(value) ? value : [value],
                              }))
                            }
                          />
                          <small>
                            {changes.typeIds.length
                              ? "Replaces every selected client’s customer types."
                              : "No types selected: existing customer types will be cleared."}
                          </small>
                        </>
                      )}
                      {field.key === "country" && (
                        <>
                          <select
                            aria-label="New Country"
                            value={changes.countryId}
                            onChange={(e) =>
                              setChanges((old) => ({
                                ...old,
                                countryId: e.target.value,
                                state: "",
                              }))
                            }
                          >
                            <option value="">Select country</option>
                            {lookups?.countries.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <small>
                            State will be cleared unless you also choose a
                            replacement below.
                          </small>
                        </>
                      )}
                      {field.key === "state" && (
                        <>
                          {!targetCountry ? (
                            <p>
                              Selected clients have different or missing
                              countries. Enable Country and choose one first.
                            </p>
                          ) : states.loading ? (
                            <p role="status">Loading states…</p>
                          ) : states.error ? (
                            <p role="alert" className="error">
                              {states.error}
                            </p>
                          ) : (
                            <select
                              aria-label="New State"
                              value={changes.state}
                              onChange={(e) =>
                                setChanges((old) => ({
                                  ...old,
                                  state: e.target.value,
                                }))
                              }
                            >
                              <option value="">Clear state</option>
                              {states.choices.map((state) => (
                                <option key={state}>{state}</option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </fieldset>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {results && (
            <div className="bulk-results">
              <p role="status">
                {busy
                  ? `${results.length} of ${clients.length} processed · ${saved} saved`
                  : `${saved} of ${clients.length} clients saved`}
              </p>
              {finished && pending.length > 0 && (
                <>
                  <p>
                    Some updates were not confirmed or not attempted. Refresh
                    clients before trying again; saved clients will not be
                    retried here.
                  </p>
                  <ul>
                    {pending.map((row) => (
                      <li key={row.id}>
                        <strong>{row.name}</strong> —{" "}
                        {row.status === "not-attempted"
                          ? "Not attempted"
                          : row.message || "Update not confirmed"}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        <footer>
          {busy ? (
            <button
              type="button"
              disabled={stopping}
              onClick={() => {
                stop.current = true;
                setStopping(true);
              }}
            >
              {stopping ? "Stopping…" : "Stop"}
            </button>
          ) : (
            <button type="button" onClick={() => void close()}>
              {finished ? "Close" : "Cancel"}
            </button>
          )}
          {!finished && (
            <button
              type="submit"
              className="primary orange-action"
              disabled={
                busy ||
                !lookups ||
                !changes.fields.length ||
                (enabled("state") &&
                  (!targetCountry || states.loading || !!states.error))
              }
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          )}
        </footer>
      </form>
    </dialog>
  );
}
