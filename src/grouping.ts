import { groupClients, type Client } from "./model";

export const groupingFields = [
  { key: "priority", label: "Priority tier" },
  { key: "state", label: "State" },
] as const;
export type GroupField = (typeof groupingFields)[number]["key"];
export interface GroupLayer {
  id: string;
  field?: GroupField;
  label: string;
  depth: number;
  count: number;
  members: Client[];
  rows: Client[];
}
/** Flatten visible group headings while retaining full ancestor paths for collapse identity.
 * Only leaf groups own records, so nested headings never duplicate client rows.
 */
export function groupClientLayers(
  clients: Client[],
  fields: readonly GroupField[],
  collapsed: ReadonlySet<string> = new Set(),
): GroupLayer[] {
  const levels = [...new Set(fields)];
  if (!levels.length)
    return [
      {
        id: "all",
        label: "",
        depth: 0,
        count: clients.length,
        members: clients,
        rows: clients,
      },
    ];
  function visit(
    rows: Client[],
    depth: number,
    path: [GroupField, string][],
  ): GroupLayer[] {
    const field = levels[depth];
    return groupClients(rows, field).flatMap(([label, members]) => {
      const nextPath: [GroupField, string][] = [...path, [field, label]];
      const id = JSON.stringify(nextPath);
      const closed = collapsed.has(id);
      const leaf = depth === levels.length - 1;
      const layer: GroupLayer = {
        id,
        field,
        label,
        depth,
        count: members.length,
        members,
        rows: leaf && !closed ? members : [],
      };
      return [
        layer,
        ...(closed || leaf ? [] : visit(members, depth + 1, nextPath)),
      ];
    });
  }
  return visit(clients, 0, []);
}
