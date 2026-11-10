import { useEffect, useRef, useState } from "react";
import type { PreferenceStore } from "./cache";
import type { Preferences } from "./preferences";

/** Restore before enabling edits; serialize saves so slow writes cannot overtake newer edits. */
export function usePreferences(
  store: PreferenceStore,
  value: Preferences,
  restore: (value: Preferences) => void,
) {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState("");
  const apply = useRef(restore);
  apply.current = restore;
  const serialized = JSON.stringify(value);
  useEffect(() => {
    let disposed = false;
    store
      .load()
      .then((preferences) => {
        if (disposed) return;
        setSaved(JSON.stringify(preferences));
        apply.current(preferences);
        setRestored(true);
        setLoaded(true);
      })
      .catch((reason) => {
        if (disposed) return;
        setError(
          `Could not restore your view. ${reason instanceof Error ? reason.message : "Check cache permissions."} Retry restoring before saving preferences.`,
        );
        setLoaded(true);
      });
    return () => {
      disposed = true;
    };
  }, [store, loadRetry]);
  useEffect(() => {
    if (!restored || saving || error || serialized === saved) return;
    const timer = setTimeout(() => {
      setSaving(true);
      store
        .save(JSON.parse(serialized))
        .then(() => {
          setSaved(serialized);
        })
        .catch((reason) => {
          setError(
            `View not saved. ${reason instanceof Error ? reason.message : "Check cache permissions."}`,
          );
        })
        .finally(() => setSaving(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [store, restored, saving, error, serialized, retry, saved]);
  return {
    loaded,
    saving: saving || (restored && !error && serialized !== saved),
    error,
    canRetry: !!error,
    retryLabel: restored ? "Retry saving view" : "Retry restoring view",
    retry: () => {
      setError("");
      if (restored) setRetry((value) => value + 1);
      else {
        setLoaded(false);
        setLoadRetry((value) => value + 1);
      }
    },
  };
}
