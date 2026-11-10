import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/** Preserve the mounted draft behind a focused confirmation; Escape always resumes editing. */
export function DiscardClientDialog({
  onKeep,
  onDiscard,
  confirmLabel = "Discard",
  cancelLabel = "Keep editing",
  title = "Discard new client?",
  description = "Your unsaved client details and added rows will be lost. This cannot be undone.",
}: {
  onKeep: () => void;
  onDiscard: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  title?: string;
  description?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    keep.current?.focus();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="discard-client-dialog"
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onKeep();
      }}
    >
      <div className="discard-client-icon" aria-hidden="true">
        <Icon name="trash" size={22} />
      </div>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <footer>
        <button
          ref={keep}
          type="button"
          className="discard-client-keep"
          onClick={onKeep}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="discard-client-confirm"
          onClick={onDiscard}
        >
          {confirmLabel}
        </button>
      </footer>
    </dialog>,
    document.body,
  );
}
