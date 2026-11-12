import { ReviewOverviewSchema, type ReviewOverview } from "@dance/schemas";
import { apiClient, decode } from "./client";
export const getReview = async (eventId: string): Promise<ReviewOverview> =>
  decode(
    ReviewOverviewSchema,
    await apiClient.get(`/events/${encodeURIComponent(eventId)}/review`),
  );
export const retryReviewNotification = async (eventId: string, id: string): Promise<void> => {
  await apiClient.post(
    `/events/${encodeURIComponent(eventId)}/review/${encodeURIComponent(id)}/retry`,
    {},
  );
};
