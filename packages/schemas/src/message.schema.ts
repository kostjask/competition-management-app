import { z } from "zod";
export const ErrorReasonSchema = z.enum([
  "unexpected", "invalidInput", "authenticationRequired", "permissionDenied", "recordNotFound", "conflict", "network", "invalidResponse",
  "invalidCredentials", "accountDisabled", "emailRegistered", "emailVerified", "stageLocked", "studioApprovalRequired", "ownershipRequired", "pendingRequired", "concurrentChange", "duplicateName", "relationshipConflict", "invalidConfiguration", "invalidParticipants", "ambiguousStudio", "orderReserved", "inactiveUser", "judgeAssigned",
  "invitationUsed", "invitationExpired", "invitationExists", "roleAssigned", "uploadMissing", "uploadTooLarge", "uploadType", "uploadInvalid",
]);
export const ValidationRuleSchema = z.enum(["invalid", "invalid_type", "too_small", "too_big", "invalid_format", "invalid_value", "unrecognized_keys", "not_multiple_of", "invalid_union", "invalid_key", "invalid_element", "dateOrder", "calendarDate", "nonemptyPatch", "duplicate", "participantRange", "ageRange"]);
export const MessageParamsSchema = z.strictObject({ minimum: z.number().finite().optional(), maximum: z.number().finite().optional(), count: z.number().finite().optional() });
export const FieldIssueSchema = z.strictObject({ path: z.array(z.union([z.string(), z.number().int()])), rule: ValidationRuleSchema, params: MessageParamsSchema });
export const SuccessMessageIdSchema = z.enum(["registered", "emailVerified", "invitationSent", "invitationAccepted", "saved"]);
export type ErrorReason = z.infer<typeof ErrorReasonSchema>;
export type FieldIssue = z.infer<typeof FieldIssueSchema>;
export type MessageParams = z.infer<typeof MessageParamsSchema>;
export type SuccessMessageId = z.infer<typeof SuccessMessageIdSchema>;
