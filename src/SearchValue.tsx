import { TextFilterInput } from "./TextFilterInput";
import { filterColumn } from "./filter-fields";
import { useState } from "react";
import { type ColumnKey } from "./model";
import { selectedValues, type FilterOperator } from "./filters";

/** Shared field categories keep the column popup and global filter builder consistent. */
export function SearchValue({
  field,
  operator,
  label,
  value,
  options,
  disabled,
  autoFocus,
  onChange,
}: {
  field: ColumnKey;
  operator: FilterOperator;
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const column = filterColumn(field);
  const multiple = operator === "anyOf" || operator === "noneOf";
  const selected = multiple ? selectedValues(value) : value ? [value] : [];
  const choices = [...new Set([...options, ...selected])];
  // Preserve legacy free-text operators when editing older cached conditions.
  const selection =
    multiple || ["is", "isNot", "empty", "notEmpty"].includes(operator);
  if (
    selection &&
    (column?.control === "lookup" || column?.control === "multi")
  ) {
    return (
      <div className="search-selection" role="group" aria-label={label}>
        <input
          aria-label={`Find options for ${label}`}
          placeholder="Find an option…"
          value={search}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="search-selection-options">
          {choices
            .filter((option) =>
              option
                .toLocaleLowerCase()
                .includes(search.trim().toLocaleLowerCase()),
            )
            .map((option) => (
              <label key={option} className="search-selection-option">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  aria-label={`${label}: ${option}`}
                  checked={selected.includes(option)}
                  disabled={disabled}
                  onChange={() =>
                    onChange(
                      multiple
                        ? JSON.stringify(
                            selected.includes(option)
                              ? selected.filter((item) => item !== option)
                              : [...selected, option],
                          )
                        : option,
                    )
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          {!choices.some((option) =>
            option
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase()),
          ) && <span className="muted">No matching options</span>}
        </div>
        {multiple && (
          <span className="selection-count">{selected.length} selected</span>
        )}
      </div>
    );
  }
  if (
    selection &&
    (column?.control === "select" || column?.control === "boolean")
  )
    return (
      <select
        aria-label={label}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a value</option>
        {choices.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  if (!column?.kind || column.kind === "text")
    return (
      <TextFilterInput value={value} label={label} disabled={disabled} autoFocus={autoFocus} onChange={onChange} />
    );
  return (
    <input
      aria-label={label}
      type={column?.kind ?? "text"}
      step="any"
      autoComplete="off"
      autoFocus={autoFocus}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
