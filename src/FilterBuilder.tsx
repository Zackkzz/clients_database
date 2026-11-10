import { SearchValue } from "./SearchValue";
import { IconButton } from "./IconButton";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "./model";
import {
  emptyFilters,
  conditionText,
  filterFields,
  filterOptions,
  needsValue,
  operators,
  searchOperators,
  validateFilters,
  type Condition,
  type FilterGroup,
  type FilterField,
  type FilterOperator,
} from "./filters";

const fresh = (): Condition => ({
  id: crypto.randomUUID(),
  field: "name",
  operator: "contains",
  value: "",
});

/** Editing is transactional: only Apply publishes the draft to the grid. */
export function FiltersPanel({
  value,
  clients,
  onApply,
  editId,
}: {
  value: FilterGroup;
  clients: Client[];
  onApply: (value: FilterGroup) => void;
  editId?: string;
}) {
  const [draft, setDraft] = useState<FilterGroup>(() =>
    structuredClone(
      value.criteria.length ? value : { ...emptyFilters, criteria: [fresh()] },
    ),
  );
  // Option choices depend on records and fields, not on every typed value.
  // The field fingerprint also coalesces repeated conditions on the same field.
  const optionFields = JSON.stringify([...new Set(draft.criteria.map(row => row.field))]);
  const optionsByField = useMemo(() => {
    const fields = JSON.parse(optionFields) as FilterField[];
    return new Map(fields.map(field => [field, filterOptions(clients, field)]));
  }, [clients, optionFields]);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-condition]") ?? [],
    ).find((row) => row.dataset.condition === editId);
    row?.scrollIntoView({ block: "nearest" });
    const target =
      row?.querySelector<HTMLElement>('[aria-label^="Value"]:not(:disabled)') ??
      row?.querySelector<HTMLElement>('[aria-label^="Condition"]');
    target?.focus();
  }, [editId]);
  function update(id: string, patch: Partial<Condition>) {
    setDraft((d) => ({
      ...d,
      criteria: d.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    setError("");
  }
  return (
    <div ref={root} className="condition-builder">
      <label className="match-control">
        Match{" "}
        <select
          aria-label="Match conditions"
          value={draft.match}
          onChange={(e) =>
            setDraft({
              ...draft,
              match: e.target.value as FilterGroup["match"],
            })
          }
        >
          <option value="all">All conditions</option>
          <option value="any">Any condition</option>
        </select>
      </label>
      <div className="conditions-list">
        {draft.criteria.map((row, index) => {
          const options = optionsByField.get(row.field) ?? [];
          return (
            <div
              className="filter-condition"
              key={row.id}
              data-condition={row.id}
            >
              <label>
                Field
                <select
                  aria-label={`Field ${index + 1}`}
                  value={row.field}
                  onChange={(e) =>
                    update(row.id, {
                      field: e.target.value as FilterField,
                      operator: searchOperators(
                        e.target.value as FilterField,
                      )[0],
                      value: "",
                    })
                  }
                >
                  {[...filterFields]
                    .sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        sensitivity: "base",
                      }),
                    )
                    .map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Condition
                <select
                  aria-label={`Condition ${index + 1}`}
                  value={row.operator}
                  onChange={(e) =>
                    update(row.id, {
                      operator: e.target.value as FilterOperator,
                      value:
                        (row.operator === "anyOf" ||
                          row.operator === "noneOf") ===
                        (e.target.value === "anyOf" ||
                          e.target.value === "noneOf")
                          ? row.value
                          : "",
                    })
                  }
                >
                  {[
                    ...new Set([...searchOperators(row.field), row.operator]),
                  ].map((key) => (
                    <option key={key} value={key}>
                      {operators[key]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="search-value-field">
                <span>Value</span>
                <SearchValue
                  key={row.field}
                  field={row.field}
                  operator={row.operator}
                  label={`Value ${index + 1}`}
                  value={needsValue(row.operator) ? row.value : ""}
                  options={options}
                  disabled={!needsValue(row.operator)}
                  onChange={(value) => update(row.id, { value })}
                />
              </div>
              <IconButton
                icon="close"
                className="icon-button"
                label={`Remove condition ${index + 1}`}
                onClick={() => {
                  setDraft({
                    ...draft,
                    criteria: draft.criteria.filter((c) => c.id !== row.id),
                  });
                  setError("");
                }}
              />
            </div>
          );
        })}
      </div>
      <IconButton
        label="Add condition"
        icon="plus"
        className="text-button"
        onClick={() =>
          setDraft({ ...draft, criteria: [...draft.criteria, fresh()] })
        }
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="filter-panel-footer">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDraft({ ...emptyFilters, criteria: [] });
            setError("");
          }}
        >
          Reset
        </button>
        <IconButton
          label="Apply filters"
          icon="check"
          className="primary orange-action"
          onClick={() => {
            const message = validateFilters(draft);
            if (message) {
              setError(message);
              return;
            }
            onApply({
              ...draft,
              criteria: draft.criteria.map((c) => ({
                ...c,
                value: c.value.trim(),
              })),
            });
          }}
        />
      </div>
    </div>
  );
}
export function FiltersSummary({
  value,
  onChange,
  onEdit,
}: {
  value: FilterGroup;
  onChange: (value: FilterGroup) => void;
  onEdit: (id: string) => void;
}) {
  if (!value.criteria.length) return null;
  return (
    <div className="filter-summary applied-filter-summary" aria-label="Applied filters">
      <span className="filter-match">
        {value.match === "all" ? "All" : "Any"}
      </span>
      {value.criteria.map((row) => (
        <span className="filter-chip" key={row.id}>
          <button type="button" className="filter-chip-label chip-edit" onClick={() => onEdit(row.id)} aria-label={`Edit ${filterFields.find((f) => f.key === row.field)?.label} filter`}>
            {filterFields.find((f) => f.key === row.field)?.label} ·{" "}
            {operators[row.operator]}
            {needsValue(row.operator)
              ? ` · ${conditionText(row.operator, row.value)}`
              : ""}
          </button>

          <IconButton
            icon="close"
            label={`Remove ${filterFields.find((f) => f.key === row.field)?.label} filter`}
            onClick={() =>
              onChange({
                ...value,
                criteria: value.criteria.filter((c) => c.id !== row.id),
              })
            }
          />
        </span>
      ))}
      <button
        type="button"
        aria-label="Clear filters"
        className="clear-filters"
        onClick={() => onChange({ ...emptyFilters, criteria: [] })}
      >
        clear
      </button>
    </div>
  );
}
