import { SearchValue } from "./SearchValue";
import { columns, type ColumnKey } from "./model";
import { IconButton } from "./IconButton";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  searchOperators,
  validSearchValue,
  operators,
  type FilterOperator as SearchOperator,
} from "./filters";

/** Keep drafts separate from applied searches and render outside the scrolling table. */
export function ColumnSearchPopover({
  anchor,
  label,
  name,
  options,
  value,
  onApply,
  onClose,
}: {
  anchor: HTMLButtonElement;
  label: string;
  name: ColumnKey;
  options: string[];
  value?: { operator: SearchOperator; value: string };
  onApply: (
    value: { operator: SearchOperator; value: string } | undefined,
  ) => void;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(
    value ?? { operator: searchOperators(name)[0], value: "" },
  );
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const empty = ["empty", "notEmpty"].includes(draft.operator);
  useLayoutEffect(() => {
    function place() {
      const bounds = anchor.getBoundingClientRect();
      const height = panel.current?.offsetHeight ?? 280;
      const width = panel.current?.offsetWidth ?? 288;
      setPosition({
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
        top: Math.max(
          8,
          bounds.bottom + height + 14 <= window.innerHeight
            ? bounds.bottom + 6
            : Math.min(
                bounds.top - height - 6,
                window.innerHeight - height - 8,
              ),
        ),
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, error]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !anchor.contains(event.target)
      )
        onClose(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [anchor, onClose]);
  return createPortal(
    <div
      ref={panel}
      className="column-search-popover"
      role="dialog"
      aria-label={`Search ${label}`}
      style={position}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose(true);
        }
      }}
    >
      <div className="column-search-title">
        <strong>{label}</strong>
        <IconButton
          label="Close column search"
          icon="close"
          onClick={() => onClose(true)}
        />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!validSearchValue(name, draft.operator, draft.value)) {
            setError("Enter or select a valid value.");
            return;
          }
          onApply({ ...draft, value: empty ? "" : draft.value.trim() });
        }}
      >
        <label>
          Condition
          <select
            autoFocus={empty}
            aria-label={`${label} condition`}
            value={draft.operator}
            onChange={(event) => {
              setDraft({
                ...draft,
                operator: event.target.value as SearchOperator,
                value:
                  (draft.operator === "anyOf" ||
                    draft.operator === "noneOf") ===
                  (event.target.value === "anyOf" ||
                    event.target.value === "noneOf")
                    ? draft.value
                    : "",
              });
              setError("");
            }}
          >
            {[...new Set([...searchOperators(name), draft.operator])].map(
              (key) => (
                <option key={key} value={key}>
                  {operators[key]}
                </option>
              ),
            )}
          </select>
        </label>
        <div className="search-value-field">
          <span>Value</span>
          <SearchValue
            key={name}
            field={name}
            operator={draft.operator}
            label={`${label} value`}
            options={options}
            value={draft.value}
            disabled={empty}
            autoFocus={!empty}
            onChange={(value) => {
              setDraft({ ...draft, value });
              setError("");
            }}
          />
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="column-search-actions">
          <button
            type="button"
            className="button secondary small"
            onClick={() => onApply(undefined)}
          >
            Clear
          </button>
          <button type="submit" className="button primary small orange-action">
            Apply
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
