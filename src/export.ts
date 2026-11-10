import { columnValue, displayValue, type Client, type Column } from "./model";
/** Quote RFC 4180 cells and neutralize spreadsheet formulas, including leading whitespace. */
export function clientsCsv(
  clients: Client[],
  columns: Column[],
  selected: ReadonlySet<string> = new Set(),
): string {
  const rows = selected.size
    ? clients.filter((client) => selected.has(client.id))
    : clients;
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      columns.map((column) => column.label),
      ...rows.map((client) =>
        columns.map((column) => displayValue(columnValue(client, column.key))),
      ),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
/** Export selected matching rows when present; otherwise export every matching row. */
export function downloadCsv(
  clients: Client[],
  columns: Column[],
  selected: ReadonlySet<string> = new Set(),
): void {
  const url = URL.createObjectURL(
    new Blob([clientsCsv(clients, columns, selected)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
