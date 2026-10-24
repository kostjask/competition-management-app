import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { DancerSchema, DancersSchema, type Dancer, type CreateDancerInput, type UpdateDancerInput } from "@dance/schemas";

export type { Dancer } from "@dance/schemas";
export type CreateDancerRequest = CreateDancerInput;
export type UpdateDancerRequest = UpdateDancerInput;

const collectionPath = (studioId: string) => `/studios/${encodeURIComponent(studioId)}/dancers`;
const itemPath = (studioId: string, dancerId: string) => `${collectionPath(studioId)}/${encodeURIComponent(dancerId)}`;

export const getDancers = async (studioId: string): Promise<Dancer[]> =>
  decode(DancersSchema, await apiClient.get(collectionPath(studioId)));

export const getDancer = async (studioId: string, dancerId: string): Promise<Dancer> =>
  decode(DancerSchema, await apiClient.get(itemPath(studioId, dancerId)));

export const createDancer = async (studioId: string, body: CreateDancerRequest): Promise<Dancer> =>
  decode(DancerSchema, await apiClient.post<CreateDancerRequest>(collectionPath(studioId), body));

export const updateDancer = async (studioId: string, dancerId: string, body: UpdateDancerRequest): Promise<Dancer> =>
  decode(DancerSchema, await apiClient.patch<UpdateDancerRequest>(itemPath(studioId, dancerId), body));

export const deleteDancer = (studioId: string, dancerId: string): Promise<void> =>
  apiClient.delete(itemPath(studioId, dancerId));
