import { JudgeScoringWorkspaceSchema, ScoringWorkspaceSchema, ScoringPreviewBodySchema, ScoringPreviewSchema, ScoringCommandSchema, ScoringReceiptSchema, type ScoringSetupInput, type ScoringCommand } from "@dance/schemas";
import { apiClient, decode } from "./client";
const base = (eventId: string) => `/events/${encodeURIComponent(eventId)}/scoring`;
export const getScoring = async (eventId: string) => decode(ScoringWorkspaceSchema, await apiClient.get(base(eventId), { cache: "no-store" }));
export const getJudgeScoring = async (eventId: string, operationId: string | undefined, signal: AbortSignal) => {
  const query = operationId ? `?${new URLSearchParams({ operationId })}` : "";
  return decode(JudgeScoringWorkspaceSchema, await apiClient.get(`${base(eventId)}/judge${query}`, { cache: "no-store", signal }));
};
export const previewScoring = async (eventId: string, expectedRevision: number, setup: ScoringSetupInput) => decode(ScoringPreviewSchema, await apiClient.post(`${base(eventId)}/preview`, ScoringPreviewBodySchema.parse({ expectedRevision, setup })));
export const commandScoring = async (eventId: string, command: ScoringCommand, signal?: AbortSignal) => decode(ScoringReceiptSchema, await apiClient.post(`${base(eventId)}/commands`, ScoringCommandSchema.parse(command), { signal }));
