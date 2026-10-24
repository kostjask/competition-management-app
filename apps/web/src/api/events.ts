import { decode } from "./client.js";
import { EventSchema, EventsSchema, type Event, type CreateEventInput, type UpdateEventInput } from "@dance/schemas";
import { apiClient } from "./client.js";
export type { Event, EventStage } from "@dance/schemas";
const itemPath = (id: string) => `/events/${encodeURIComponent(id)}`;
export const getEvents = async (): Promise<Event[]> =>
  decode(EventsSchema, await apiClient.get("/events"));
export const getEvent = async (id: string): Promise<Event> =>
  decode(EventSchema, await apiClient.get(itemPath(id)));
export const createEvent = async (body: CreateEventInput): Promise<Event> =>
  decode(EventSchema, await apiClient.post<CreateEventInput>("/events", body));
export const updateEvent = async (id: string, body: UpdateEventInput): Promise<Event> =>
  decode(EventSchema, await apiClient.patch<UpdateEventInput>(itemPath(id), body));
