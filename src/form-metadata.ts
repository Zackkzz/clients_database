import { creatorRequest, creatorError, DataError, loadSdk } from "./api";

export interface CreatorFieldMetadata {
  link_name: string;
  display_name: string;
  type: number;
  mandatory?: boolean;
  [key: string]: unknown;
}
export interface CreatorMetadataApi {
  getFields(config: { app_name: string; form_name: string }): Promise<unknown>;
}
/** Read definitions in the signed-in session. Metadata does not execute form workflows. */
export async function getCreatorFormFields(
  formName: string,
  getApi: () => Promise<CreatorMetadataApi> = async () => {
    await loadSdk();
    const api = window.ZOHO?.CREATOR?.META;
    if (!api)
      throw new DataError(
        "Form metadata is unavailable in this Creator session.",
      );
    return api;
  },
): Promise<CreatorFieldMetadata[]> {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(formName))
    throw new DataError("Invalid form link name.");
  const api = await getApi();
  const response = await creatorRequest(
    api.getFields({
      app_name: "sungrowauservice",
      form_name: formName,
    }) as Parameters<typeof creatorRequest>[0],
  );
  if (response.code !== 3000) throw creatorError(response);
  const fields = (response as unknown as { fields?: unknown }).fields;
  if (
    !Array.isArray(fields) ||
    fields.some(
      (field) =>
        !field ||
        typeof field.link_name !== "string" ||
        typeof field.display_name !== "string" ||
        typeof field.type !== "number",
    )
  ) {
    throw new DataError("Creator returned invalid form field definitions.");
  }
  return fields;
}
