import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ExportScope = "filtered" | "all";

export function ExportWindow({
  filtered,
  hasUnloaded,
  onClose,
  onExport,
}: {
  filtered: boolean;
  hasUnloaded: boolean;
  onClose: () => void;
  onExport: (scope: ExportScope, includeUnloaded: boolean) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [scope, setScope] = useState<ExportScope>(
    filtered ? "filtered" : "all",
  );
  const [includeUnloaded, setIncludeUnloaded] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);

  const options: { value: ExportScope; label: string }[] = [
    { value: "filtered", label: "All records matching the current filters" },
    { value: "all", label: "All records regardless of filters" },
  ];
  return createPortal(
    <dialog
      ref={dialog}
      className="client-create-window export-window"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id={title}>Export CSV</h2>
      </header>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onExport(scope, includeUnloaded);
            onClose();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to export records.",
            );
            setBusy(false);
          }
        }}
      >
        <div className="client-create-body export-options">
          {filtered && (
            <fieldset disabled={busy}>
              <legend>Records to export</legend>
              {options.map(({ value, label }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === value}
                    onChange={() => setScope(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          {hasUnloaded && (
            <label>
              <input
                type="checkbox"
                checked={includeUnloaded}
                disabled={busy}
                onChange={(event) => setIncludeUnloaded(event.target.checked)}
              />
              Include records that haven’t loaded yet
            </label>
          )}
          {!filtered && !hasUnloaded && <p>All records will be exported.</p>}
          {busy && <p role="status">Preparing your CSV…</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary orange-action"
            disabled={busy}
          >
            {busy ? "Preparing…" : "Export"}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
