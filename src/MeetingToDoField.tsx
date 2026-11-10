import { filterLookupOptions, indexLookupOptions } from "./lookup-options";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FloatingDropdown } from "./FloatingDropdown";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

/** Linked work stays in the Meeting Note draft until the note is saved. */
export function MeetingToDoField({
  value,
  options,
  disabled,
  onChange,
  onAddNew,
}: {
  value: unknown;
  options: { id: string; label: string }[];
  disabled: boolean;
  onChange: (value: string[]) => void;
  onAddNew?: () => void;
}) {
  const selected = useMemo(
    () =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string" && !!v)
        : typeof value === "string" && value
          ? [value]
          : [],
    [value],
  );
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const optionIndex = useMemo(() => indexLookupOptions(options), [options]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const searchRoot = useRef<HTMLDivElement>(null);
  const expanded = open && !disabled;
  const available = useMemo(
    () =>
      expanded ? filterLookupOptions(optionIndex, query, selectedIds) : [],
    [expanded, optionIndex, query, selectedIds],
  );
  const activeIndex = Math.min(active, Math.max(0, available.length - 1));
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!searchRoot.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (expanded)
      document
        .getElementById(`${id}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex, id, query]);
  const choose = (value: string) => {
    if (disabled || selectedIds.has(value)) return;
    onChange([...selected, value]);
    setQuery("");
    setOpen(false);
  };
  const add = onAddNew && (
    <IconButton
      label="New To-Do"
      icon="plus"
      disabled={disabled}
      onClick={onAddNew}
    />
  );
  const search = (
    <div
      ref={searchRoot}
      className="todo-design-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="todo-design-search-control">
        <Icon name="search" />
        <input
          role="combobox"
          aria-label="Find To-Do"
          placeholder="Search existing To-Dos…"
          disabled={disabled}
          aria-expanded={expanded}
          aria-controls={expanded ? id : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && available[activeIndex]
              ? `${id}-${activeIndex}`
              : undefined
          }
          value={query}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onClick={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Escape" && expanded) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (expanded && available[activeIndex])
                choose(available[activeIndex].id);
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              // A closed menu has no filtered rows yet; resolve only when opening with keys.
              const count = expanded
                ? available.length
                : filterLookupOptions(optionIndex, query, selectedIds).length;
              e.preventDefault();
              setOpen(true);
              setActive(() =>
                !expanded
                  ? e.key === "ArrowUp"
                    ? Math.max(0, count - 1)
                    : 0
                  : Math.max(
                      0,
                      Math.min(
                        available.length - 1,
                        activeIndex + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
              );
            }
          }}
        />
      </div>
      {expanded && (
        <FloatingDropdown
          placement="bottom"
          className="client-choice-menu"
          role="listbox"
          id={id}
          aria-label="To-Do options"
        >
          {available.map((o, i) => (
            <button
              type="button"
              role="option"
              aria-selected={false}
              id={`${id}-${i}`}
              key={o.id}
              className={i === activeIndex ? "active" : ""}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.id)}
            >
              {o.label}
            </button>
          ))}
          {!available.length && (
            <p role="status">
              {query.trim()
                ? "No matching To-Dos"
                : options.length
                  ? "All available To-Dos are linked"
                  : "No available To-Dos"}
            </p>
          )}
        </FloatingDropdown>
      )}
    </div>
  );
  const linked = (
    <div className="todo-design-linked">
      {selected.map((value) => (
        <div className="todo-design-row" key={value}>
          <Icon name="check" />
          <span>
            {optionIndex.byId.get(value)?.label || `Linked To-Do (${value})`}
          </span>
          <IconButton
            label={`Unlink ${optionIndex.byId.get(value)?.label || "To-Do"}`}
            icon="close"
            disabled={disabled}
            onClick={() => onChange(selected.filter((v) => v !== value))}
          />
        </div>
      ))}
      {!selected.length && (
        <div className="todo-design-empty">
          <Icon name="check" />
          <div>
            <strong>No To-Dos linked</strong>
            <p>Search to link existing work, or create a new To-Do.</p>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div className="subform-field todo-design todo-design-list">
      <div className="todo-design-header">
        <span>
          To-Do{" "}
          <small>
            {selected.length ? `${selected.length} linked` : "None linked"}
          </small>
        </span>
        {add}
      </div>
      {linked}
      <div className="todo-design-link-area">
        <span>Link existing To-Do</span>
        {search}
      </div>
    </div>
  );
}
