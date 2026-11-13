import { lookupSelection } from "./lookup-selection";
import { customerTypeColors } from "./customer-type-colors";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FloatingDropdown } from "./FloatingDropdown";
import {
  ClientCreateUnknownError,
  createClientChoice,
  lookupCreateOptions,
  selectCreateOption,
  hasLookup,
  type Option,
} from "./client-create/service";
import type { FormField } from "./client-create/types";

type ChoicePath = "Customer_Type" | "Main_Product_Used";

/** Chip multiselect for customer types; single brand selection with the same Add New flow. */
export function ClientChoiceDropdown({
  field,
  path,
  value,
  change,
  demo,
}: {
  field: FormField;
  path: string;
  value: unknown;
  change: (v: unknown) => void;
  demo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const multiple = [14, 15].includes(field.type);
  const singleCountry = !multiple && field.name === "Country";
  const canAdd = path === "Customer_Type" || path === "Main_Product_Used";
  const selection = useRef(0);
  const [selecting, setSelecting] = useState(false);
  useEffect(
    () => () => {
      selection.current++;
    },
    [],
  );
  const selected = lookupSelection(value, multiple);
  const available = options.filter(
    (o) =>
      !selected.some((v) => v.id === o.id) &&
      o.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  useEffect(() => {
    if (!open || !hasLookup(path)) return;
    let live = true;
    setLoading(true);
    setOptions([]);
    setError("");
    setActive(0);
    const timer = setTimeout(
      () =>
        lookupCreateOptions(path, query, demo)
          .then((v) => {
            if (live) {
              setOptions(v);
              setActive(0);
            }
          })
          .catch((e) => {
            if (live) setError(e.message);
          })
          .finally(() => {
            if (live) setLoading(false);
          }),
      query ? 200 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, path, query, demo]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);
  async function choose(option: Option) {
    const attempt = ++selection.current;
    setSelecting(true);
    setError("");
    try {
      const next = await selectCreateOption(path, option, demo);
      if (attempt !== selection.current) return;
      change(
        multiple ? [...selected.filter((o) => o.id !== next.id), next] : next,
      );
      setQuery("");
      setOpen(false);
    } catch (error) {
      if (attempt === selection.current)
        setError(
          error instanceof Error ? error.message : "Cannot select option",
        );
    } finally {
      if (attempt === selection.current) setSelecting(false);
    }
  }
  if (!hasLookup(path))
    return (
      <span className="create-hint">
        This lookup is not available in the widget yet.
      </span>
    );
  return (
    <div
      ref={wrapper}
      className="client-choice"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div
        className="client-choice-control"
        onClick={() => {
          input.current?.focus();
          setOpen(true);
        }}
      >
        {!singleCountry &&
          selected.map((option) => (
            <span
              className="client-choice-chip"
              key={option.id}
              style={
                path === "Customer_Type"
                  ? customerTypeColors(option.label)
                  : undefined
              }
            >
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  change(
                    multiple
                      ? selected.filter((o) => o.id !== option.id)
                      : null,
                  );
                }}
              >
                ×
              </button>
            </span>
          ))}
        <input
          ref={input}
          disabled={selecting}
          role="combobox"
          aria-label={field.label}
          aria-expanded={open}
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={
            open && available[active] ? `${id}-${active}` : undefined
          }
          placeholder={singleCountry || !selected.length ? "Select…" : ""}
          value={singleCountry && !open ? (selected[0]?.label ?? "") : query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            selection.current++;
            setActive(0);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                Math.max(
                  0,
                  Math.min(
                    available.length - 1,
                    i + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && !loading && !selecting && available[active])
                void choose(available[active]);
              else setOpen(true);
            }
          }}
        />
        <span className="client-choice-chevron" aria-hidden="true">
          ⌄
        </span>
      </div>
      {open && (
        <FloatingDropdown className="client-choice-menu">
          <div
            role="listbox"
            id={id}
            aria-label={`${field.label} options`}
            aria-multiselectable={multiple}
          >
            {available.map((option, i) => (
              <button
                type="button"
                role="option"
                aria-selected={false}
                id={`${id}-${i}`}
                key={option.id}
                className={active === i ? "active" : ""}
                onMouseDown={(e) => e.preventDefault()}
                disabled={selecting || loading}
                onClick={() => void choose(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {loading && <p role="status">Loading…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && !available.length && (
            <p>No matching options.</p>
          )}
          {canAdd && (
            <button
              type="button"
              className="client-choice-add"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                setAdding(true);
              }}
            >
              + Add New
            </button>
          )}
        </FloatingDropdown>
      )}
      {adding && canAdd && (
        <AddChoice
          label={field.label}
          path={path as ChoicePath}
          demo={demo}
          initial={query}
          onClose={() => {
            setAdding(false);
            input.current?.focus();
          }}
          onCreated={(option) => {
            void choose(option);
            setAdding(false);
            input.current?.focus();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
function AddChoice({
  label,
  path,
  demo,
  initial,
  onClose,
  onCreated,
}: {
  label: string;
  path: ChoicePath;
  demo: boolean;
  initial: string;
  onClose: () => void;
  onCreated: (option: Option) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="create-choice-window"
      aria-label={`Add ${label}`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!lock.current) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (lock.current || uncertain) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            onCreated(await createClientChoice(path, name, demo));
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not create option",
            );
            setUncertain(error instanceof ClientCreateUnknownError);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <h3>Add {label}</h3>
        <label>
          Name
          <input
            ref={input}
            required
            value={name}
            disabled={busy || uncertain}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="create-hint">
          This option is saved separately from the client.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary orange-action"
            disabled={busy || uncertain}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
