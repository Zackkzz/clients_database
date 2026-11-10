import { indexLookupOptions, filterLookupOptions } from "../src/lookup-options";
import { performance } from "node:perf_hooks";
const options = Array.from({ length: 10000 }, (_, i) => ({
  id: String(i),
  label: `Client follow-up task ${i}`,
}));
const selected = options.slice(-500).map((o) => o.id);
const queries = ["task", "follow", "999", "no match", "  CLIENT  "];
function baseline() {
  let total = 0;
  for (const query of queries) {
    total += options.filter(
      (o) =>
        !selected.includes(o.id) &&
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
    ).length;
    for (const value of selected) {
      total += (options.find((o) => o.id === value)?.label || "").length;
      total += (options.find((o) => o.id === value)?.label || "").length;
    }
  }
  return total;
}

const index = indexLookupOptions(options);
const selectedIds = new Set(selected);
function optimized() {
  let total = 0;
  for (const query of queries) {
    total += filterLookupOptions(index, query, selectedIds).length;
    for (const value of selected) {
      total += (index.byId.get(value)?.label || "").length;
      total += (index.byId.get(value)?.label || "").length;
    }
  }
  return total;
}
if (baseline() !== optimized()) throw new Error("Results differ");
function measure(fn: () => number) {
  for (let i = 0; i < 3; i++) fn();
  const samples = [];
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return samples.sort((a, b) => a - b)[3];
}
console.log(
  JSON.stringify({
    options: options.length,
    selected: selected.length,
    queries: queries.length,
    baselineMs: measure(baseline),
    indexedMs: measure(optimized),
    checksum: optimized(),
  }),
);
