import { apiClient } from "./client.js";
import { JudgeSchema, JudgesSchema, type Judge, type CreateJudgeInput, type UpdateJudgeInput } from "@dance/schemas";

export type { Judge, CreateJudgeInput, UpdateJudgeInput } from "@dance/schemas";
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/judges`;
const itemPath = (eventId: string, judgeId: string) => `${collectionPath(eventId)}/${encodeURIComponent(judgeId)}`;

export const getJudges = async (eventId: string): Promise<Judge[]> =>
  JudgesSchema.parse(await apiClient.get<unknown>(collectionPath(eventId)));
export const getJudge = async (eventId: string, judgeId: string): Promise<Judge> =>
  JudgeSchema.parse(await apiClient.get<unknown>(itemPath(eventId, judgeId)));
export const createJudge = async (eventId: string, body: CreateJudgeInput): Promise<Judge> =>
  JudgeSchema.parse(await apiClient.post<unknown, CreateJudgeInput>(collectionPath(eventId), body));
export const updateJudge = async (eventId: string, judgeId: string, body: UpdateJudgeInput): Promise<Judge> =>
  JudgeSchema.parse(await apiClient.patch<unknown, UpdateJudgeInput>(itemPath(eventId, judgeId), body));
export const deleteJudge = (eventId: string, judgeId: string): Promise<void> =>
  apiClient.delete<void>(itemPath(eventId, judgeId));
