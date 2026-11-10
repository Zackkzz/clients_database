import {
  encodePatch,
  priorityChoices,
  type Client,
  type ClientLookups,
} from "./model";
import { stateSelectionError } from "./form-rules";

export type BulkField = "priority" | "types" | "country" | "state";
export interface BulkChanges {
  fields: BulkField[];
  priority: string;
  typeIds: string[];
  countryId: string;
  state: string;
}
export interface BulkResult {
  id: string;
  name: string;
  status: "saved" | "unconfirmed" | "not-attempted";
  message?: string;
}

/** Country must be shared before a standalone State change can apply to every target. */
export function commonCountry(clients: readonly Client[]): string {
  const id = clients[0]?.countryId ?? "";
  return id && clients.every((client) => client.countryId === id) ? id : "";
}

/** Validate all shared changes before any writes; only explicitly chosen fields enter the patch. */
export async function prepareBulkPatch(
  clients: readonly Client[],
  changes: BulkChanges,
  lookups: ClientLookups,
  loadStates: (id: string) => Promise<string[]>,
  loadFrequency: (priority: string) => Promise<string>,
): Promise<Partial<Client>> {
  if (!clients.length || !changes.fields.length)
    throw new Error("Select clients and at least one field to change.");
  const enabled = new Set(changes.fields);
  const patch: Partial<Client> = {};
  if (enabled.has("priority")) {
    if (changes.priority && !priorityChoices.includes(changes.priority))
      throw new Error("Choose a valid priority tier.");
    patch.priority = changes.priority;
    if (changes.priority)
      patch.detailChanges = {
        Follow_Up_Frequency: await loadFrequency(changes.priority),
      };
  }
  if (enabled.has("types")) {
    patch.typeIds = [...new Set(changes.typeIds)];
    const types = patch.typeIds.map((id) =>
      lookups.customerTypes.find((option) => option.id === id),
    );
    if (types.some((option) => !option))
      throw new Error(
        "Customer type choices changed. Reopen bulk editing and choose again.",
      );
    patch.types = types.map((option) => option!.label);
  }
  let country = commonCountry(clients);
  if (enabled.has("country")) {
    const option = lookups.countries.find(
      (option) => option.id === changes.countryId,
    );
    if (!option) throw new Error("Choose a country.");
    country = option.id;
    patch.countryId = option.id;
    patch.country = option.label;
    patch.countryCode = option.code;
    // Mirror Country's input workflow: never retain a State from the previous country.
    patch.state = "";
  }
  if (enabled.has("state")) {
    if (!country)
      throw new Error(
        "Choose a country for all selected clients before editing State.",
      );
    const error = stateSelectionError(
      country,
      changes.state,
      await loadStates(country),
    );
    if (error) throw new Error(error);
    patch.state = changes.state;
  }
  encodePatch(patch);
  return patch;
}

/** Each record is a separate standard Creator write. Never retry an unconfirmed outcome automatically. */
export async function applyBulkPatch(
  clients: readonly Client[],
  patch: Partial<Client>,
  update: (id: string, patch: Partial<Client>) => Promise<void>,
  progress: (results: BulkResult[]) => void,
  shouldStop: () => boolean = () => false,
): Promise<BulkResult[]> {
  encodePatch(patch);
  const results: BulkResult[] = [];
  for (const client of clients) {
    if (shouldStop())
      results.push({
        id: client.id,
        name: client.name,
        status: "not-attempted",
      });
    else {
      try {
        await update(client.id, structuredClone(patch));
        results.push({ id: client.id, name: client.name, status: "saved" });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          status: "unconfirmed",
          message:
            error instanceof Error
              ? error.message
              : "Creator did not confirm this update.",
        });
      }
    }
    progress([...results]);
  }
  return results;
}
