import {
  fetchClientFormContext,
  type ClientFormContext,
} from "./client-form-context";
import { clientCreateDefaults, clientEditDefaults } from "./client-load-rules";
import { fetchFollowUpFrequency } from "./form-rules";
import {
  decodeClient,
  encodePatch,
  encodeCreate,
  clientLookups,
  type Client,
  type ClientLookups,
} from "./model";
import { demoClients } from "./demo";

interface ApiResponse {
  code: number;
  message?: string;
  data?: Record<string, unknown>[] | Record<string, unknown>;
  record_cursor?: string;
  more_records?: boolean;
  result?: ApiResponse[];
}
export interface CreatorData {
  getRecords(config: Record<string, unknown>): Promise<ApiResponse>;
  updateRecordById(config: Record<string, unknown>): Promise<ApiResponse>;
  addRecords(config: Record<string, unknown>): Promise<ApiResponse>;
  deleteRecordById(config: Record<string, unknown>): Promise<ApiResponse>;
}
declare global {
  interface Window {
    ZOHO?: {
      CREATOR?: {
        DATA?: CreatorData;
        META?: import("./form-metadata").CreatorMetadataApi;
        FILE?: {
          uploadFile(config: Record<string, unknown>): Promise<unknown>;
        };
        UTIL?: { getInitParams(): Promise<{ loginUser?: string }> };
      };
    };
  }
}
export interface ClientLoadProgress {
  records: Client[];
  hasMore: boolean;
}

export interface ClientRepository {
  mode: "demo" | "zoho";
  list(onProgress?: (progress: ClientLoadProgress) => void): Promise<Client[]>;
  update(id: string, patch: Partial<Client>): Promise<void>;
  create(client: Client): Promise<Client>;
  remove(id: string): Promise<void>;
  lookups(clients?: Client[]): Promise<ClientLookups>;
}

export class DataError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "DataError";
  }
}

/** SDK failures may be plain objects or contain JSON inside responseText. */
function responseBody(value: unknown): Record<string, unknown> {
  let body = value;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return { message: body };
      }
    } else if (body && typeof body === "object" && "responseText" in body) {
      body = body.responseText;
    } else break;
  }
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
}

/** Show only the service's code/message, never entire SDK requests or responses. */
export function creatorError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  const body = responseBody(error);
  const code =
    typeof body.code === "string" || typeof body.code === "number"
      ? body.code
      : undefined;
  const message =
    typeof body.message === "string"
      ? body.message
      : typeof body.description === "string"
        ? body.description
        : error instanceof Error
          ? error.message
          : "Creator rejected the request without an error description.";
  const safeMessage = message
    .replace(/(?:[\w-]*token|Bearer)\s+\S+/gi, "<REDACTED>")
    .slice(0, 400);
  return new DataError(
    code === undefined ? safeMessage : `Zoho error ${code}: ${safeMessage}`,
    code,
  );
}

/** Normalize resolved/rejected SDK envelopes and recognize empty read results. */
export async function creatorRequest(
  request: Promise<unknown>,
  writing = false,
): Promise<ApiResponse> {
  try {
    const body = responseBody(await withTimeout(request, writing));
    if (typeof body.code !== "number") throw creatorError(body);
    return body as unknown as ApiResponse;
  } catch (reason) {
    const error = creatorError(reason);
    if (!writing && [3100, 9280].includes(Number(error.code)))
      return { code: Number(error.code) };
    throw error;
  }
}

/** SDK requests can hang outside the portal; never automatically retry a write. */
export async function withTimeout<T>(
  request: Promise<T>,
  writing = false,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DataError(
            writing
              ? "The save outcome is unknown. Refresh the database before retrying to avoid duplicate changes."
              : "The Zoho data request timed out after 20 seconds. Retry loading; if it persists, check the portal connection and report access.",
          ),
        ),
      20000,
    );
  });
  try {
    return await Promise.race([request, deadline]);
  } catch (error) {
    throw creatorError(error);
  } finally {
    clearTimeout(timer!);
  }
}

export function assertSuccess(result: ApiResponse): void {
  for (const item of result.result ?? []) assertSuccess(item);
  if (result.code !== 3000)
    throw creatorError({
      code: result.code,
      message:
        result.message || "Check your report permissions and field validation.",
    });
}

/** Follow every cursor. Progress snapshots are available for explicit partial exports. */
export async function fetchClients(
  api: CreatorData,
  onProgress?: (progress: ClientLoadProgress) => void,
): Promise<Client[]> {
  const records = new Map<string, Client>();
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const result = await creatorRequest(
      api.getRecords({
        app_name: "sungrowauservice",
        report_name: "Client_Legacy",
        field_config: "all",
        max_records: 1000,
        ...(cursor ? { record_cursor: cursor } : {}),
      }),
    );
    if ((result.code === 3100 || result.code === 9280) && records.size === 0)
      return [];
    assertSuccess(result);
    if (!Array.isArray(result.data))
      throw new DataError("Zoho returned an unexpected record format.");
    for (const row of result.data) {
      const client = decodeClient(row);
      records.set(client.id, client);
    }
    cursor = result.record_cursor;
    if (result.more_records && !cursor)
      throw new DataError(
        "Zoho indicated more records without a cursor. Results cannot be displayed as complete.",
      );
    if (cursor && seen.has(cursor))
      throw new DataError(
        "Zoho returned a repeated page cursor. Please retry.",
      );
    if (cursor) seen.add(cursor);
    onProgress?.({ records: [...records.values()], hasMore: Boolean(cursor) });
  } while (cursor);
  return [...records.values()];
}

async function initializeSdk(): Promise<CreatorData> {
  // The SDK must be loaded by widget.html before the iframe load event. Injecting
  // it from a React effect can miss the host's one-time registration message.
  const creator = window.ZOHO?.CREATOR;
  if (!creator?.DATA || !creator.UTIL)
    throw new DataError(
      "The Zoho widget SDK did not load. Reload the widget and check access to static.zohocdn.com.",
    );
  try {
    // DATA exists before the SDK has received portal registration/init parameters.
    // Share this readiness barrier across clients, preferences and field visibility.
    await withTimeout(creator.UTIL.getInitParams());
  } catch {
    throw new DataError(
      "The widget could not establish its connection to the Zoho portal. Reload the portal page. If it persists, check the browser console for blocked SDK or iframe messages.",
    );
  }
  return creator.DATA;
}

let sdkPromise: Promise<CreatorData> | undefined;
/** Share SDK initialization between client data and preference requests. */
export function loadSdk(): Promise<CreatorData> {
  sdkPromise ??= initializeSdk().catch((error) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}

export function createRepository(
  mode: "demo" | "zoho",
  getSdk: () => Promise<CreatorData> = loadSdk,
  getContext: () => Promise<ClientFormContext | null> = () =>
    fetchClientFormContext(getSdk),
): ClientRepository {
  if (mode === "demo") {
    let rows = structuredClone(demoClients);
    return {
      mode,
      async list() {
        return structuredClone(rows);
      },
      async lookups(clients = rows) {
        return clientLookups(clients);
      },
      async create(client) {
        encodeCreate(client);
        const created = { ...client, id: `demo-${crypto.randomUUID()}` };
        rows.push(created);
        return created;
      },
      async remove(id) {
        rows = rows.filter((row) => row.id !== id);
      },
      async update(id, patch) {
        encodePatch(patch);
        rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      },
    };
  }
  return {
    mode,
    async list(onProgress) {
      const api = await getSdk();
      return fetchClients(api, onProgress);
    },
    async lookups(clients) {
      // Reuse the fully paginated Client records already loaded by the grid.
      return clientLookups(clients ?? (await fetchClients(await getSdk())));
    },
    async create(client) {
      const data: Record<string, unknown> = {
        ...encodeCreate(client),
        ...clientCreateDefaults(await getContext()),
      };
      if (client.priority)
        data.Follow_Up_Frequency = await fetchFollowUpFrequency(
          client.priority,
          getSdk,
        );
      const api = await getSdk();
      const result = await creatorRequest(
        api.addRecords({
          app_name: "sungrowauservice",
          form_name: "Client",
          payload: { data },
        }),
        true,
      );
      assertSuccess(result);
      const item = result.result?.[0]?.data ?? result.data;
      const record = Array.isArray(item) ? item[0] : item;
      if (typeof record?.ID !== "string")
        throw new DataError(
          "Creator accepted the request but did not return a record ID. Refresh the grid before trying again.",
        );
      return { ...client, id: record.ID };
    },
    async remove(id) {
      const api = await getSdk();
      assertSuccess(
        await creatorRequest(
          api.deleteRecordById({
            app_name: "sungrowauservice",
            report_name: "Client_Legacy",
            id,
            payload: {},
          }),
          true,
        ),
      );
    },
    async update(id, patch) {
      const data = encodePatch(patch);
      if (
        patch.priority &&
        patch.detailChanges?.Follow_Up_Frequency === undefined
      )
        data.Follow_Up_Frequency = await fetchFollowUpFrequency(
          patch.priority,
          getSdk,
        );
      if (!Object.keys(data).length) return;
      const payloadData = { ...data, ...clientEditDefaults() };
      const api = await getSdk();
      const result = await creatorRequest(
        api.updateRecordById({
          app_name: "sungrowauservice",
          report_name: "Client_Legacy",
          id,
          payload: { data: payloadData },
        }),
        true,
      );
      assertSuccess(result);
    },
  };
}
