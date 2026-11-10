import type { ClientFormContext } from "./client-form-context";

/** Initial load does not fire Country's input handler. Edit preserves its saved State. */
export function clientStateVisible(
  event: "create" | "edit",
  initialState: string,
  countryInput: boolean,
  country: string,
  choices: readonly string[],
): boolean {
  if (countryInput) return !!country && choices.length > 0;
  return event === "edit" && !!initialState;
}

/** Defaults assigned by the shared/create Client load scripts, not metadata defaults. */
export function clientCreateDefaults(context: ClientFormContext | null) {
  return { Is_Subform: true, ...(context ? { Team: context.teamId } : {}) };
}

/** Client's masked Staff controls write raw values only when the input is unmasked.
 * Keep this conversion at the API boundary so masks never overwrite original contacts.
 */
export function clientStaffContactPayload(values: Record<string, unknown>) {
  const data = { ...values };
  for (const field of ["Contact_Number", "Contact_Email"]) {
    const masked = `${field}_Encrypted`;
    if (typeof values[masked] !== "string") continue;
    const input = values[masked] as string;
    if (!input.includes("*")) data[field] = input;
    if (field === "Contact_Number" && input) {
      const chars = [...input];
      data[masked] = chars
        .map((char, i) =>
          i > chars.length - 8 && i < chars.length - 3 ? "*" : char,
        )
        .join("");
    } else if (field === "Contact_Email" && input.includes("@")) {
      data[masked] = `***@${input.split("@")[1]}`;
    }
  }
  return data;
}

/** Edit_Load3 resets transient BOM controls before any Client save. In particular,
 * a stale BOM_Display must not enter the parent success workflow's BOM rebuild branch.
 */
export function clientEditDefaults() {
  return { Is_Subform: true, Show_BOM: true, BOM_Display: null };
}
