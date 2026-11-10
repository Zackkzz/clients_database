import { filterLookupOptions, indexLookupOptions } from "./lookup-options";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FloatingDropdown } from "./FloatingDropdown";
import { Icon } from "./Icon";

/** Searchable lookup with a top-layer menu, so dialog scrolling cannot clip choices. */
export function SubformLookupDropdown({
  label,
  options,
  selected,
  multiple,
  disabled,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  multiple: boolean;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const id = useId();
  const optionIndex = useMemo(
    () => indexLookupOptions(options, true),
    [options],
  );
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const expanded = open && !disabled;
  const matches = useMemo(
    () => (expanded ? filterLookupOptions(optionIndex, query) : []),
    [expanded, optionIndex, query],
  );
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (expanded)
      document
        .getElementById(`${id}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded, id, query]);
  function choose(value: string) {
    if (disabled) return;
    onChange(
      multiple
        ? selectedIds.has(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value]
        : value,
    );
    setQuery("");
    setActive(0);
    if (!multiple) setOpen(false);
  }
  return (
    <div
      ref={wrapper}
      className="subform-lookup-dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      {selected.length > 0 && (
        <div className="subform-lookup-chips">
          {selected.map((value) => (
            <span key={value}>
              {optionIndex.byId.get(value)?.label ??
                `Current selection (${value})`}
              <button
                type="button"
                aria-label={`Remove ${label}: ${optionIndex.byId.get(value)?.label ?? value}`}
                disabled={disabled}
                onClick={() =>
                  onChange(
                    multiple ? selected.filter((item) => item !== value) : "",
                  )
                }
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="subform-lookup-control">
        <input
          role="combobox"
          aria-label={`Find ${label}`}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? id : undefined}
          aria-activedescendant={
            expanded && matches[activeIndex]
              ? `${id}-${activeIndex}`
              : undefined
          }
          placeholder="Find an option…"
          value={query}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onClick={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape" && expanded) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              const count = expanded
                ? matches.length
                : filterLookupOptions(optionIndex, query).length;
              event.preventDefault();
              setOpen(true);
              setActive(() =>
                !expanded
                  ? event.key === "ArrowUp"
                    ? Math.max(0, count - 1)
                    : 0
                  : Math.max(
                      0,
                      Math.min(
                        matches.length - 1,
                        activeIndex + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (expanded && matches[activeIndex])
                choose(matches[activeIndex].id);
              else setOpen(true);
            }
          }}
        />
        <span aria-hidden="true">
          <Icon name="chevron-down" />
        </span>
      </div>
      {expanded && (
        <FloatingDropdown
          className="client-choice-menu subform-lookup-menu"
          role="listbox"
          id={id}
          aria-label={`${label} options`}
          aria-multiselectable={multiple}
        >
          {matches.map((option, index) => (
            <button
              type="button"
              role="option"
              tabIndex={-1}
              key={option.id}
              id={`${id}-${index}`}
              className={activeIndex === index ? "active" : ""}
              aria-selected={selectedIds.has(option.id)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
            >
              <span className="subform-option-check" aria-hidden="true">
                {selectedIds.has(option.id) && <Icon name="check" size={14} />}
              </span>
              {option.label}
            </button>
          ))}
          {!matches.length && <p role="status">No matching options</p>}
        </FloatingDropdown>
      )}
    </div>
  );
}
