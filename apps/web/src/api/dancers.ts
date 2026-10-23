import { apiClient } from "./client.js";
import { DancerSchema, DancersSchema, type Dancer, type CreateDancerInput, type UpdateDancerInput } from "@dance/schemas";

export type { Dancer } from "@dance/schemas";
export type CreateDancerRequest = CreateDancerInput;
export type UpdateDancerRequest = UpdateDancerInput;

const collectionPath = (studioId: string) => `/studios/${encodeURIComponent(studioId)}/dancers`;
const itemPath = (studioId: string, dancerId: string) => `${collectionPath(studioId)}/${encodeURIComponent(dancerId)}`;

export const getDancers = async (studioId: string): Promise<Dancer[]> =>
  DancersSchema.parse(await apiClient.get<unknown>(collectionPath(studioId)));

export const getDancer = async (studioId: string, dancerId: string): Promise<Dancer> =>
  DancerSchema.parse(await apiClient.get<unknown>(itemPath(studioId, dancerId)));

export const createDancer = async (studioId: string, body: CreateDancerRequest): Promise<Dancer> =>
  DancerSchema.parse(await apiClient.post<unknown, CreateDancerRequest>(collectionPath(studioId), body));

export const updateDancer = async (studioId: string, dancerId: string, body: UpdateDancerRequest): Promise<Dancer> =>
  DancerSchema.parse(await apiClient.patch<unknown, UpdateDancerRequest>(itemPath(studioId, dancerId), body));

export const deleteDancer = (studioId: string, dancerId: string): Promise<void> =>
  apiClient.delete<void>(itemPath(studioId, dancerId));
