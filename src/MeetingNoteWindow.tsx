import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";

/** A separate top-layer editor keeps the Client form and note table in place. */
export function MeetingNoteWindow({
  children,
  heading,
  editing,
  busy,
  onClose,
}: {
  children: ReactNode;
  heading?: string;
  editing: boolean;
  busy: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    node?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className={`client-create-window meeting-note-window ${heading ? "" : "meeting-note-designed"}`}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <h2 id={title}>
            {heading ?? (editing ? "Edit Meeting Note" : "Add Meeting Note")}
          </h2>
          {!heading && <p className="meeting-note-subtitle">Client details</p>}
        </div>
        <IconButton
          label={heading ? `Close ${heading}` : "Close Meeting Note"}
          icon="close"
          disabled={busy}
          onClick={onClose}
        />
      </header>
      <div className="meeting-note-window-body">{children}</div>
    </dialog>,
    document.body,
  );
}
