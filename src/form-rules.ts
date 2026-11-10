import {
  assertSuccess,
  creatorRequest,
  DataError,
  loadSdk,
  type CreatorData,
} from "./api";

/** Country.States is a subform of the Country entity, not a fixed Australian state list. */
export function decodeCountryStates(record: Record<string, unknown>): string[] {
  if (!Object.hasOwn(record, "States"))
    throw new DataError("The Countries report must expose its States field.");
  if (record.States === null || record.States === "") return [];
  if (!Array.isArray(record.States))
    throw new DataError("Creator returned invalid country states.");
  return [
    ...new Set(
      record.States.map((row) => {
        const value =
          typeof row === "string"
            ? row
            : (row?.State ?? row?.display_value ?? row?.zc_display_value);
        if (typeof value !== "string")
          throw new DataError("The Countries report must expose States.State.");
        return value.trim();
      }).filter(Boolean),
    ),
  ];
}
export async function fetchCountryStates(
  countryId: string,
  getApi: () => Promise<CreatorData> = loadSdk,
): Promise<string[]> {
  if (!countryId) return [];
  if (!/^\d+$/.test(countryId)) throw new DataError("Invalid country ID.");
  const api = await getApi();
  const response = await creatorRequest(
    api.getRecords({
      app_name: "sungrowauservice",
      report_name: "Countries",
      criteria: `ID == ${countryId}`,
      field_config: "custom",
      fields: "ID,States",
      max_records: 200,
    }),
  );
  assertSuccess(response);
  if (!Array.isArray(response.data) || response.data.length !== 1)
    throw new DataError(
      "Cannot read the selected country's states. Check Countries report access.",
    );
  return decodeCountryStates(response.data[0]);
}
export async function fetchFollowUpFrequency(
  priority: string,
  getApi: () => Promise<CreatorData> = loadSdk,
): Promise<string> {
  if (!["Tier 1", "Tier 2", "Tier 3"].includes(priority))
    throw new DataError("Choose a valid priority tier.");
  const api = await getApi();
  const response = await creatorRequest(
    api.getRecords({
      app_name: "sungrowauservice",
      report_name: "Meta_Data_Client",
      criteria: `Key == "${priority} Follow-Up Frequency (per N days)"`,
      field_config: "all",
      max_records: 200,
    }),
  );
  assertSuccess(response);
  if (
    !Array.isArray(response.data) ||
    response.data.length !== 1 ||
    !/^\d+$/.test(String(response.data[0].Value))
  )
    throw new DataError(
      "Cannot read the configured priority follow-up frequency. Check Meta_Data_Client report access.",
    );
  return String(response.data[0].Value);
}
export function stateSelectionError(
  country: string,
  state: string,
  choices: string[],
): string {
  if (!country && state) return "Select a country before selecting a state.";
  return state && !choices.includes(state)
    ? "Choose a state belonging to the selected country."
    : "";
}
