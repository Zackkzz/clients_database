import { useEffect, useState } from "react";

/** Ignore late responses after a different country is chosen. Never reuse another country's choices. */
export function useCountryStates(
  country: string,
  load: (id: string) => Promise<string[]>,
) {
  const [result, setResult] = useState<{
    country: string;
    choices: string[];
    error: string;
  }>({ country: "", choices: [], error: "" });
  useEffect(() => {
    let canceled = false;
    if (!country) {
      setResult({ country, choices: [], error: "" });
      return;
    }
    load(country)
      .then((choices) => {
        if (!canceled) setResult({ country, choices, error: "" });
      })
      .catch((error) => {
        if (!canceled)
          setResult({
            country,
            choices: [],
            error:
              error instanceof Error ? error.message : "Cannot load states.",
          });
      });
    return () => {
      canceled = true;
    };
  }, [country, load]);
  return result.country === country
    ? { ...result, loading: false }
    : { country, choices: [], error: "", loading: !!country };
}
