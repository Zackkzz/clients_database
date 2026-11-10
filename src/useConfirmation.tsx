import { useEffect, useRef, useState } from "react";
import { DiscardClientDialog } from "./DiscardClientDialog";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
};

/** Await an in-app decision without unmounting the underlying draft. Unmount cancels pending work. */
export function useConfirmation() {
  const [prompt, setPrompt] = useState<Confirmation | null>(null);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  useEffect(() => () => pending.current?.(false), []);
  function confirm(options: Confirmation): Promise<boolean> {
    if (pending.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      pending.current = resolve;
      setPrompt(options);
    });
  }
  function settle(confirmed: boolean) {
    const resolve = pending.current;
    pending.current = null;
    setPrompt(null);
    resolve?.(confirmed);
  }
  return {
    confirm,
    confirmation: prompt && (
      <DiscardClientDialog
        {...prompt}
        onKeep={() => settle(false)}
        onDiscard={() => settle(true)}
      />
    ),
  };
}
