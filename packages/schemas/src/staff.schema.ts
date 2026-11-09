import { z } from "zod";
import { IdSchema } from "./common.schema.js";
import { EmailSchema } from "./common.schema.js";
import { InvitationsSchema } from "./invitation.schema.js";
export const StaffEventParamsSchema = z.strictObject({ eventId: IdSchema });
export const StaffAssignmentParamsSchema = z.strictObject({ eventId: IdSchema, assignmentId: IdSchema });
export const RemoveStaffSchema = z.strictObject({});
export const StaffAssignmentSchema = z.strictObject({
  id: IdSchema, user: z.strictObject({ id: IdSchema, name: z.string(), email: EmailSchema }),
  roleKey: z.enum(["judge", "moderator"]), removedAt: z.iso.datetime().nullable(),
  status: z.enum(["ACTIVE", "REMOVED", "ACCOUNT_UNAVAILABLE", "JUDGE_MISSING"]),
});
export const StaffOverviewSchema = z.strictObject({
  event: z.strictObject({ id: IdSchema, name: z.string() }),
  invitations: InvitationsSchema, assignments: z.array(StaffAssignmentSchema),
});
export type StaffOverview = z.infer<typeof StaffOverviewSchema>;
export type StaffAssignment = z.infer<typeof StaffAssignmentSchema>;
