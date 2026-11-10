import { useState } from "react";
import { encodeTextValues, textEntries } from "./text-filter-values";
import { Icon } from "./Icon";

/** Enter commits one literal value; blur commits pending text before Apply. */
export function TextFilterInput({
  value,
  label,
  disabled,
  autoFocus,
  onChange,
}: {
  value: string;
  label: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const values = textEntries(value) ?? (value ? [value] : []);
  function commit() {
    const next = input.trim();
    if (!next) return;
    onChange(encodeTextValues([...new Set([...values, next])]));
    setInput("");
  }
  return (
    <div
      className="text-filter-input"
      role="group"
      aria-label={`${label} values`}
    >
      {values.map((item) => (
        <span className="text-filter-token" key={item}>
          <span>{item}</span>
          <button
            type="button"
            aria-label={`Remove value ${item}`}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              onChange(encodeTextValues(values.filter((v) => v !== item)))
            }
          >
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        autoComplete="off"
        aria-label={label}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={
          values.length ? "Add another value…" : "Type a value, press Enter"
        }
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            commit();
          }
        }}
      />
    </div>
  );
}
