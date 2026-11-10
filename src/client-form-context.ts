import {
  assertSuccess,
  creatorRequest,
  DataError,
  loadSdk,
  withTimeout,
  type CreatorData,
} from "./api";

export interface ClientFormContext {
  teamId: string;
  sales: boolean;
}

/** Resolve the workflow's Staff[User_name == zoho.loginuser] using the portal session. */
export async function fetchClientFormContext(
  getApi: () => Promise<CreatorData> = loadSdk,
  getLogin: () => Promise<string | undefined> = async () =>
    (await window.ZOHO?.CREATOR?.UTIL?.getInitParams())?.loginUser,
): Promise<ClientFormContext | null> {
  const api = await getApi();
  const login = await withTimeout(getLogin());
  if (!login)
    throw new DataError(
      "Cannot identify the signed-in user for Client form visibility.",
    );
  const response = await creatorRequest(
    api.getRecords({
      app_name: "sungrowauservice",
      report_name: "Staff_List",
      criteria: `User_name == ${JSON.stringify(login)}`,
      field_config: "custom",
      fields: "ID,Team",
      max_records: 200,
    }),
  );
  // A successful empty lookup is not a workflow error: staff.count() == 0
  // skips both the Sales and non-Sales branches. Permission failures still throw.
  if ([3100, 9280].includes(response.code)) return null;
  assertSuccess(response);
  if (Array.isArray(response.data) && response.data.length === 0) return null;
  if (!Array.isArray(response.data) || response.data.length !== 1)
    throw new DataError(
      "Cannot resolve your staff team. Check Staff_List access.",
    );
  const team = response.data[0].Team;
  if (
    !team ||
    typeof team !== "object" ||
    !("ID" in team) ||
    !("display_value" in team) ||
    !/^\d+$/.test(String(team.ID)) ||
    typeof team.display_value !== "string"
  )
    throw new DataError(
      "Staff_List must expose Team with its ID and name. Team-dependent sections are hidden.",
    );
  return {
    teamId: String(team.ID),
    sales: team.display_value.includes("Sales"),
  };
}
