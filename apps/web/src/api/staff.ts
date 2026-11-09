import { RemoveStaffSchema, StaffAssignmentParamsSchema, StaffOverviewSchema } from "@dance/schemas";
import { apiClient, decode } from "./client.js";

export const getStaff = async (eventId: string) =>
  decode(StaffOverviewSchema, await apiClient.get(`/events/${encodeURIComponent(eventId)}/staff`));

export async function removeStaff(eventId: string, assignmentId: string): Promise<void> {
  const params = StaffAssignmentParamsSchema.parse({ eventId, assignmentId });
  await apiClient.post(`/events/${encodeURIComponent(params.eventId)}/staff/${encodeURIComponent(params.assignmentId)}/remove`, RemoveStaffSchema.parse({}));
}
