import type { z } from "zod";
import { ValidationRuleSchema, type FieldIssue, type MessageParams } from "./message.schema.js";
// Shared by API and UI. No input values, technical messages or unknown-key lists cross the boundary.
export function validationIssues(issues: readonly z.core.$ZodIssue[]): FieldIssue[] {
  return issues.map(issue => {
    const custom: unknown = issue.code === "custom" ? issue.params?.reason : undefined;
    const candidate = ValidationRuleSchema.safeParse(custom ?? (issue.code === "invalid_format" && issue.format === "date" ? "calendarDate" : issue.code));
    const params: MessageParams = {};
    if ("minimum" in issue && typeof issue.minimum === "number" && Number.isFinite(issue.minimum)) params.minimum = issue.minimum;
    if ("maximum" in issue && typeof issue.maximum === "number" && Number.isFinite(issue.maximum)) params.maximum = issue.maximum;
    return { path: issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number"), rule: candidate.success ? candidate.data : "invalid", params };
  });
}
