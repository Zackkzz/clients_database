import { performance } from "node:perf_hooks";
import { queryClients, groupClients } from "../src/model.ts";
import { demoClients } from "../src/demo.ts";
const rows = Array.from({ length: 10000 }, (_, i) => ({
  ...demoClients[i % 24],
  id: String(i),
  name: `Client ${(i * 7919) % 10000}`,
  priority: "Tier 1",
}));
for (const [name, run] of [
  [
    "sort",
    () =>
      queryClients(rows, {
        search: "",
        state: "",
        priority: "",
        type: "",
        sort: "name",
        direction: "asc",
      }),
  ],
  ["group", () => groupClients(rows, "priority")],
] as const) {
  const samples = [];
  for (let i = 0; i < 6; i++) {
    let t = performance.now();
    run();
    if (i) samples.push(performance.now() - t);
  }
  samples.sort((a, b) => a - b);
  console.log(
    name,
    Math.round(samples[2] * 100) / 100,
    "ms median, 10000 synthetic clients",
  );
}
