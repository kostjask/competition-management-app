import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { CategorySchema, CategoriesSchema, type Category, type CreateCategoryInput, type UpdateCategoryInput } from "@dance/schemas";

export type { Category, CreateCategoryInput, UpdateCategoryInput } from "@dance/schemas";
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/categories`;
const itemPath = (eventId: string, categoryId: string) => `${collectionPath(eventId)}/${encodeURIComponent(categoryId)}`;

export const getCategories = async (eventId: string): Promise<Category[]> =>
  decode(CategoriesSchema, await apiClient.get(collectionPath(eventId)));
export const getCategory = async (eventId: string, categoryId: string): Promise<Category> =>
  decode(CategorySchema, await apiClient.get(itemPath(eventId, categoryId)));
export const createCategory = async (eventId: string, body: CreateCategoryInput): Promise<Category> =>
  decode(CategorySchema, await apiClient.post<CreateCategoryInput>(collectionPath(eventId), body));
export const updateCategory = async (eventId: string, categoryId: string, body: UpdateCategoryInput): Promise<Category> =>
  decode(CategorySchema, await apiClient.patch<UpdateCategoryInput>(itemPath(eventId, categoryId), body));
export const deleteCategory = (eventId: string, categoryId: string): Promise<void> =>
  apiClient.delete(itemPath(eventId, categoryId));
