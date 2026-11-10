import {
  assertSuccess,
  creatorRequest,
  DataError,
  withTimeout,
  type CreatorData,
} from "./api";
import {
  decodePreferences,
  encodeColumns,
  type Preferences,
} from "./preferences";

export interface PreferenceStore {
  load(): Promise<Preferences>;
  save(preferences: Preferences): Promise<void>;
}

/** Scope is supplied by the session adapter; never trust a record outside it. */
export function createCacheStore(
  getApi: () => Promise<CreatorData>,
  scope: {
    owner?: string;
    criteria?: string;
    owns: (row: Record<string, unknown>) => boolean;
  },
): PreferenceStore {
  async function find() {
    const api = await getApi();
    const response = await creatorRequest(
      api.getRecords({
        app_name: "sungrowauservice",
        report_name: "crm_widget_cache_Report",
        field_config: "all",
        max_records: 200,
        ...(scope.criteria ? { criteria: scope.criteria } : {}),
      }),
    );
    if (response.code === 3100 || response.code === 9280)
      return { api, row: undefined };
    assertSuccess(response);
    if (!Array.isArray(response.data))
      throw new DataError("Unexpected cache response.");
    if (
      response.data.length > 1 ||
      response.record_cursor ||
      response.more_records
    )
      throw new DataError(
        "Multiple matching cache records exist. Resolve duplicates before saving preferences.",
      );
    const row = response.data[0];
    if (
      row &&
      (!scope.owns(row) ||
        typeof row.ID !== "string" ||
        typeof row.Cols_Order !== "string" ||
        typeof row.Filter !== "string")
    )
      throw new DataError(
        "The cache report must expose the correct owner, ID, Cols_Order and Filter fields.",
      );
    return { api, row };
  }
  return {
    async load() {
      const { row } = await find();
      return decodePreferences(
        String(row?.Cols_Order ?? ""),
        row && scope.owner
          ? JSON.stringify(JSON.parse(String(row.Filter)).filters)
          : String(row?.Filter ?? ""),
      );
    },
    async save(preferences) {
      const data = {
        Cols_Order: encodeColumns(preferences),
        Filter: JSON.stringify(
          scope.owner
            ? { version: 1, owner: scope.owner, filters: preferences.filters }
            : preferences.filters,
        ),
      };
      if (data.Cols_Order.length > 65535 || data.Filter.length > 65535)
        throw new DataError(
          "These preferences exceed the cache form's field limit.",
        );
      // Re-read before writing so a previous timed-out create cannot be blindly duplicated.
      const { api, row } = await find();
      const result = await creatorRequest(
        row
          ? api.updateRecordById({
              app_name: "sungrowauservice",
              report_name: "crm_widget_cache_Report",
              id: row.ID,
              payload: { data },
            })
          : api.addRecords({
              app_name: "sungrowauservice",
              form_name: "crm_widget_cache",
              payload: { data },
            }),
        true,
      );
      assertSuccess(result);
    },
  };
}

/** Demo preferences never read or write the production cache. */
export function createDemoCache(
  storage: Pick<Storage, "getItem" | "setItem">,
): PreferenceStore {
  const key = "clients-widget:demo:preferences:v1";
  return {
    async load() {
      const value = storage.getItem(key);
      if (!value) return decodePreferences("", "");
      const saved = JSON.parse(value);
      return decodePreferences(saved.Cols_Order, saved.Filter);
    },
    async save(value) {
      storage.setItem(
        key,
        JSON.stringify({
          Cols_Order: encodeColumns(value),
          Filter: JSON.stringify(value.filters),
        }),
      );
    },
  };
}

/** Use only the authenticated Creator session identity; missing identity never falls back to shared cache. */
export function createPortalCache(
  getApi: () => Promise<CreatorData>,
  getUser: () => Promise<unknown>,
): PreferenceStore {
  let session: Promise<PreferenceStore> | undefined;
  function resolve() {
    session ??= (async () => {
      await getApi();
      const user = await withTimeout(getUser());
      if (typeof user !== "string" || !user.trim())
        throw new DataError("Creator did not provide the signed-in user.");
      // Existing form has no user field. Keep the authenticated owner beside the
      // filters and query that exact JSON marker; verify it again before writes.
      const marker = `"owner":${JSON.stringify(user)}`;
      const quoted = JSON.stringify(marker);
      return createCacheStore(getApi, {
        owner: user,
        criteria: `Filter.contains(${quoted})`,
        owns: (row) => {
          try {
            const envelope = JSON.parse(String(row.Filter));
            return envelope.version === 1 && envelope.owner === user;
          } catch {
            return false;
          }
        },
      });
    })().catch((error) => {
      // A transient SDK/identity failure must not poison all subsequent retries.
      session = undefined;
      throw error;
    });
    return session;
  }
  return {
    load: async () => (await resolve()).load(),
    save: async (value) => (await resolve()).save(value),
  };
}
