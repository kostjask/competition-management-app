import { ScoringWorkspaceSchema, ScoringPreviewBodySchema, ScoringPreviewSchema, ScoringCommandSchema, ScoringReceiptSchema, type ScoringSetupInput, type ScoringCommand } from "@dance/schemas";
import { apiClient, decode } from "./client";
const base = (eventId: string) => `/events/${encodeURIComponent(eventId)}/scoring`;
export const getScoring = async (eventId: string) => decode(ScoringWorkspaceSchema, await apiClient.get(base(eventId), { cache: "no-store" }));
export const previewScoring = async (eventId: string, expectedRevision: number, setup: ScoringSetupInput) => decode(ScoringPreviewSchema, await apiClient.post(`${base(eventId)}/preview`, ScoringPreviewBodySchema.parse({ expectedRevision, setup })));
export const commandScoring = async (eventId: string, command: ScoringCommand) => decode(ScoringReceiptSchema, await apiClient.post(`${base(eventId)}/commands`, ScoringCommandSchema.parse(command)));
