import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { AgeGroupSchema, AgeGroupsSchema, type AgeGroup, type CreateAgeGroupInput, type UpdateAgeGroupInput } from "@dance/schemas";

export type { AgeGroup, CreateAgeGroupInput, UpdateAgeGroupInput } from "@dance/schemas";
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/age-groups`;
const itemPath = (eventId: string, ageGroupId: string) => `${collectionPath(eventId)}/${encodeURIComponent(ageGroupId)}`;

export const getAgeGroups = async (eventId: string): Promise<AgeGroup[]> =>
  decode(AgeGroupsSchema, await apiClient.get(collectionPath(eventId)));
export const getAgeGroup = async (eventId: string, ageGroupId: string): Promise<AgeGroup> =>
  decode(AgeGroupSchema, await apiClient.get(itemPath(eventId, ageGroupId)));
export const createAgeGroup = async (eventId: string, body: CreateAgeGroupInput): Promise<AgeGroup> =>
  decode(AgeGroupSchema, await apiClient.post<CreateAgeGroupInput>(collectionPath(eventId), body));
export const updateAgeGroup = async (eventId: string, ageGroupId: string, body: UpdateAgeGroupInput): Promise<AgeGroup> =>
  decode(AgeGroupSchema, await apiClient.patch<UpdateAgeGroupInput>(itemPath(eventId, ageGroupId), body));
export const deleteAgeGroup = (eventId: string, ageGroupId: string): Promise<void> =>
  apiClient.delete(itemPath(eventId, ageGroupId));
