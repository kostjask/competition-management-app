import { EventSchema, EventsSchema, type Event, type CreateEventInput, type UpdateEventInput } from "@dance/schemas";
import { apiClient } from "./client.js";
export type { Event, EventStage } from "@dance/schemas";
const itemPath = (id: string) => `/events/${encodeURIComponent(id)}`;
export const getEvents = async (): Promise<Event[]> =>
  EventsSchema.parse(await apiClient.get<unknown>("/events"));
export const getEvent = async (id: string): Promise<Event> =>
  EventSchema.parse(await apiClient.get<unknown>(itemPath(id)));
export const createEvent = async (body: CreateEventInput): Promise<Event> =>
  EventSchema.parse(await apiClient.post<unknown, CreateEventInput>("/events", body));
export const updateEvent = async (id: string, body: UpdateEventInput): Promise<Event> =>
  EventSchema.parse(await apiClient.patch<unknown, UpdateEventInput>(itemPath(id), body));
