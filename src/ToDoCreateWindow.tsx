import { useConfirmation } from "./useConfirmation";
import { useEffect, useRef, useState } from "react";
import { MeetingNoteWindow } from "./MeetingNoteWindow";
import { FieldInput } from "./SubformFieldInput";
import {
  todoDefaults,
  ToDoCreateUnknownError,
  type ToDoCreator,
} from "./todo-create";
import type { SubformOption, SubformValue } from "./subforms";

/** A nested native dialog preserves the unsaved Meeting Note while creating a lookup record. */
export function ToDoCreateWindow({
  creator,
  onClose,
  onCreated,
}: {
  creator: ToDoCreator;
  onClose: () => void;
  onCreated: (option: SubformOption) => void;
}) {
  const { confirm, confirmation } = useConfirmation();
  const [definition, setDefinition] =
    useState<Awaited<ReturnType<ToDoCreator["load"]>>>();
  const [values, setValues] = useState<Record<string, SubformValue>>({
    ...todoDefaults,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const saving = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    let active = true;
    creator
      .load()
      .then((value) => {
        if (active) setDefinition(value);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load To-Do fields.",
          );
      });
    return () => {
      active = false;
    };
  }, [creator]);
  async function close() {
    if (saving.current) return;
    if (!dirty.current && !unknown) {
      onClose();
      return;
    }
    if (
      await confirm(
        unknown
          ? {
              title: "Leave To-Do creation?",
              description:
                "Creator has not confirmed whether this To-Do was created. Check existing To-Dos before trying again. Your meeting note will stay open.",
              confirmLabel: "Leave",
              cancelLabel: "Stay",
            }
          : {
              title: "Discard new To-Do?",
              description:
                "Your unsaved To-Do details will be lost. Your meeting note will stay open and unchanged.",
              confirmLabel: "Discard",
            },
      )
    )
      onClose();
  }
  return (
    <MeetingNoteWindow
      heading="New To-Do"
      editing={false}
      busy={busy}
      onClose={close}
    >
      {confirmation}
      <form
        className="subform-row-editor"
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!definition || saving.current || unknown) return;
          saving.current = true;
          setBusy(true);
          setError("");
          try {
            const option = await creator.save(definition.fields, values);
            onCreated(option);
          } catch (reason) {
            setUnknown(reason instanceof ToDoCreateUnknownError);
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not create To-Do.",
            );
          } finally {
            saving.current = false;
            setBusy(false);
          }
        }}
      >
        <p className="todo-create-hint">
          Create the To-Do now, then save the Meeting Note to link it.
          Cancelling the note will not delete the To-Do.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!definition && !error && <p role="status">Loading To-Do fields…</p>}
        {definition?.warning && <p role="status">{definition.warning}</p>}
        <div className="subform-fields">
          {definition?.fields.map((field) => (
            <div className="subform-field" key={field.link_name}>
              <span>
                {field.display_name || field.link_name}
                {field.mandatory ? " *" : ""}
              </span>
              <FieldInput
                field={field}
                value={values[field.link_name]}
                options={field.link_name === "Staff" ? definition.staff : []}
                disabled={busy || unknown}
                onFile={() => {}}
                onChange={(value) => {
                  dirty.current = true;
                  setValues((old) => ({ ...old, [field.link_name]: value }));
                }}
              />
            </div>
          ))}
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary orange-action"
            disabled={!definition || busy || unknown}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </footer>
      </form>
    </MeetingNoteWindow>
  );
}
