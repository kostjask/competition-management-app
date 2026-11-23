import { ResultsCommandSchema, ResultsReceiptSchema, ResultsWorkspaceSchema, type ResultsCommand } from "@dance/schemas";
import { apiClient, decode } from "./client";

const path = (eventId: string) => `/events/${encodeURIComponent(eventId)}/results`;

export async function getResults(eventId: string, query: { operationId?: string; revision?: string }, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (query.operationId) params.set("operationId", query.operationId);
  if (query.revision) params.set("revision", query.revision);
  const suffix = params.size ? `?${params}` : "";
  return decode(ResultsWorkspaceSchema, await apiClient.get(path(eventId) + suffix, { cache: "no-store", signal }));
}

export async function saveResults(eventId: string, command: ResultsCommand, signal: AbortSignal) {
  return decode(ResultsReceiptSchema, await apiClient.post(`${path(eventId)}/commands`, ResultsCommandSchema.parse(command), { signal }));
}
