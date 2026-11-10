import { SubformLookupDropdown } from "./SubformLookupDropdown";
import { useState } from "react";
import type { SubformField } from "./subform-schema";
import { displayValue } from "./model";
import { IconButton } from "./IconButton";
import { subformLabel, type SubformValue } from "./subforms";

export function FieldInput({
  field,
  value,
  options,
  disabled,
  onChange,
  onFile,
  onAddNew,
  meetingNote = false,
}: {
  field: SubformField;
  value: SubformValue | undefined;
  options: { id: string; label: string }[];
  disabled: boolean;
  onChange: (value: SubformValue) => void;
  onFile: (file: File | undefined) => void;
  onAddNew?: () => void;
  meetingNote?: boolean;
}) {
  const [search, setSearch] = useState("");
  const label = subformLabel(field);
  const multi = field.type === 14 || field.type === 15;
  if (field.type === 19)
    return (
      <>
        <input
          type="file"
          aria-label={label}
          disabled={disabled}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        {value && <small>Current file: {displayValue(value)}</small>}
      </>
    );
  if (field.type === 16)
    return (
      <select
        aria-label={label}
        value={String(value ?? false)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === "true")}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  if (field.is_lookup_field || multi) {
    const choices = field.is_lookup_field
      ? options
      : (field.choices ?? []).map((choice) => ({
          id: choice.value,
          label: choice.value,
        }));
    const selected = Array.isArray(value)
      ? value
      : value
        ? [String(value)]
        : [];
    const all = [
      ...choices,
      ...selected
        .filter((id) => !choices.some((option) => option.id === id))
        .map((id) => ({ id, label: `Current selection (${id})` })),
    ];
    if (field.link_name === "Staff")
      return (
        <SubformLookupDropdown
          label={label}
          options={all}
          selected={selected}
          multiple={multi}
          disabled={disabled}
          onChange={onChange}
        />
      );
    const noteToDo = meetingNote && field.link_name === "To_Do";
    const renderChoice = (option: { id: string; label: string }) => (
      <label className="subform-choice" key={option.id}>
        <input
          type={multi ? "checkbox" : "radio"}
          aria-label={`${label}: ${option.label}`}
          disabled={disabled}
          checked={selected.includes(option.id)}
          onChange={() =>
            onChange(
              multi
                ? selected.includes(option.id)
                  ? selected.filter((id) => id !== option.id)
                  : [...selected, option.id]
                : option.id,
            )
          }
        />
        {option.label}
      </label>
    );
    return (
      <div className={`subform-lookup ${noteToDo ? "note-todo-lookup" : ""}`}>
        {noteToDo && selected.length > 0 && (
          <div className="note-selected-todos">
            {all
              .filter((option) => selected.includes(option.id))
              .map(renderChoice)}
          </div>
        )}
        {noteToDo && (
          <span className="note-todo-search-label">Find a To-Do</span>
        )}
        <input
          aria-label={`Find ${label}`}
          placeholder={noteToDo ? "Search existing To-Dos…" : "Find an option…"}
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
        {(!noteToDo || search.trim()) && (
          <div className="search-selection-options">
            {all
              .filter(
                (option) =>
                  (!noteToDo || !selected.includes(option.id)) &&
                  option.label.toLowerCase().includes(search.toLowerCase()),
              )
              .map(renderChoice)}
            {!all.length && <small>No available options</small>}
          </div>
        )}

        {onAddNew && (
          <IconButton
            label={`New ${label}`}
            icon="plus"
            disabled={disabled}
            onClick={onAddNew}
          />
        )}
        {field.link_name !== "To_Do" &&
          !field.mandatory &&
          selected.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(multi ? [] : "")}
            >
              Clear
            </button>
          )}
      </div>
    );
  }
  if (field.choices?.length || field.type === 12 || field.type === 13)
    return (
      <select
        aria-label={label}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a value</option>
        {(field.choices ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
    );
  if (field.type === 2)
    return (
      <textarea
        aria-label={label}
        disabled={disabled}
        maxLength={field.max_char}
        rows={3}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  return (
    <input
      aria-label={label}
      disabled={disabled}
      maxLength={field.max_char}
      type={
        field.type === 3
          ? "email"
          : field.type === 27
            ? "tel"
            : field.type === 10
              ? "date"
              : field.type === 11
                ? "datetime-local"
                : [5, 6, 7, 8].includes(field.type)
                  ? "number"
                  : "text"
      }
      step={field.type === 5 ? 1 : "any"}
      value={String(value ?? "")}
      onInput={(event) => onChange(event.currentTarget.value)}
      onBlur={(event) => {
        if (
          ["C4_Number", "Project_Name", "Project_ID"].includes(field.link_name)
        )
          onChange(event.currentTarget.value.trim());
      }}
    />
  );
}
