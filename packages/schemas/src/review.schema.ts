import { z } from "zod";
import { EventSchema } from "./event.schema.js";
import { StudioSchema, StudioApprovalStatusSchema } from "./studio.schema.js";
import { StudioRegistrationSchema } from "./studio-registration.schema.js";
import { IdSchema } from "./common.schema.js";

export const ReviewNotificationSchema = z.strictObject({
  id: IdSchema,
  kind: z.enum(["ORGANIZATION", "EVENT"]),
  status: StudioApprovalStatusSchema,
  revision: z.int().positive(),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  delivery: z.enum(["TEST_ONLY", "PENDING", "ACCEPTED", "CANCELLED"]),
});
export const ReviewOverviewSchema = z.strictObject({
  event: EventSchema,
  applications: z.array(
    z.strictObject({
      registration: StudioRegistrationSchema,
      studio: StudioSchema,
      history: z.array(
        z.strictObject({
          id: IdSchema,
          action: z.string(),
          createdAt: z.iso.datetime(),
          fromStatus: z.string().nullable(),
          toStatus: z.string().nullable(),
          revision: z.int().nullable(),
        }),
      ),
      notifications: z.array(ReviewNotificationSchema),
    }),
  ),
});
export type ReviewOverview = z.infer<typeof ReviewOverviewSchema>;
