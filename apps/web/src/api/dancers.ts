import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { DancerSchema, DancersSchema, CreateDancerBodySchema, UpdateDancerBodySchema, DancerArchiveBodySchema, type Dancer, type CreateDancerInput, type UpdateDancerInput } from "@dance/schemas";
import type { z } from "zod";

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
  decode(DancerSchema, await apiClient.post(collectionPath(studioId), CreateDancerBodySchema.parse(body)));

export const updateDancer = async (studioId: string, dancerId: string, body: UpdateDancerRequest): Promise<Dancer> =>
  decode(DancerSchema, await apiClient.patch(itemPath(studioId, dancerId), UpdateDancerBodySchema.parse(body)));

export const deleteDancer = async (studioId: string, dancerId: string, body: z.infer<typeof DancerArchiveBodySchema>): Promise<void> => {
  await apiClient.delete(itemPath(studioId, dancerId), DancerArchiveBodySchema.parse(body));
};
