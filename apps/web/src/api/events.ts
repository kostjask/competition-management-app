/**
 * Events API methods
 */

import { apiClient } from "./client.js";

export interface Event {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  stage: "PRE_REGISTRATION" | "REGISTRATION_OPEN" | "DATA_REVIEW" | "FINALIZED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  name: string;
  startsAt: string;
  endsAt: string;
  stage?: "PRE_REGISTRATION" | "REGISTRATION_OPEN" | "DATA_REVIEW" | "FINALIZED";
}

export interface UpdateEventRequest {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  stage?: "PRE_REGISTRATION" | "REGISTRATION_OPEN" | "DATA_REVIEW" | "FINALIZED";
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
export const createEvent = (body: CreateEventRequest): Promise<Event> => {
  return apiClient.post<Event, CreateEventRequest>("/events", body);
};

/**
 * Update an existing event (Admin only)
 */
export const updateEvent = (
  id: string,
  body: UpdateEventRequest
): Promise<Event> => {
  return apiClient.patch<Event, UpdateEventRequest>(`/events/${id}`, body);
};
