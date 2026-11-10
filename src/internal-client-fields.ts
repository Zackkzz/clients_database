/** Workflow-only fields are excluded from both grid columns and user filters. */
export const internalClientFields = new Set<string>([
  "field:BOM_Display",
  "field:Business_Name_Upper",
  "field:Show_BOM",
]);
