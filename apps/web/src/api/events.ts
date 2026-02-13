/**
 * Events API methods
 */

import { EventStageSchema, type CreateEventInput, type UpdateEventInput } from "@dance/schemas";
import { apiClient } from "./client.js";

export type EventStage = (typeof EventStageSchema)["options"][number];

export interface Event {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  stage: EventStage;
  createdAt: string;
  updatedAt: string;
  venue: string;
  country: string;
  city: string;
  description: string;
}

/**
 * Get all events
 */
export const getEvents = (): Promise<Event[]> => {
  return apiClient.get<Event[]>("/events");
};

/**
 * Get a single event by ID
 */
export const getEvent = (id: string): Promise<Event> => {
  return apiClient.get<Event>(`/events/${id}`);
};

/**
 * Create a new event (Admin only)
 */
export const createEvent = (body: CreateEventInput): Promise<Event> => {
  return apiClient.post<Event, CreateEventInput>("/events", body);
};

/**
 * Update an existing event (Admin only)
 */
export const updateEvent = (
  id: string,
  body: UpdateEventInput
): Promise<Event> => {
  return apiClient.patch<Event, UpdateEventInput>(`/events/${id}`, body);
};
