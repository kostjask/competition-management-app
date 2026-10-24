import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { JudgeSchema, JudgesSchema, type Judge, type CreateJudgeInput, type UpdateJudgeInput } from "@dance/schemas";

export type { Judge, CreateJudgeInput, UpdateJudgeInput } from "@dance/schemas";
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/judges`;
const itemPath = (eventId: string, judgeId: string) => `${collectionPath(eventId)}/${encodeURIComponent(judgeId)}`;

export const getJudges = async (eventId: string): Promise<Judge[]> =>
  decode(JudgesSchema, await apiClient.get(collectionPath(eventId)));
export const getJudge = async (eventId: string, judgeId: string): Promise<Judge> =>
  decode(JudgeSchema, await apiClient.get(itemPath(eventId, judgeId)));
export const createJudge = async (eventId: string, body: CreateJudgeInput): Promise<Judge> =>
  decode(JudgeSchema, await apiClient.post<CreateJudgeInput>(collectionPath(eventId), body));
export const updateJudge = async (eventId: string, judgeId: string, body: UpdateJudgeInput): Promise<Judge> =>
  decode(JudgeSchema, await apiClient.patch<UpdateJudgeInput>(itemPath(eventId, judgeId), body));
export const deleteJudge = (eventId: string, judgeId: string): Promise<void> =>
  apiClient.delete(itemPath(eventId, judgeId));
