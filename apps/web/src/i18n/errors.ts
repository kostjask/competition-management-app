import type { FieldIssue, SuccessMessageId } from "@dance/schemas";
import type { UiError } from "../api/error";
import type { Locale } from "./locale";
import { errorMessages, validationMessages, successMessages } from "./feedback";
export function formatIssue(issue: FieldIssue, locale: Locale): string {
  if ((issue.rule === "too_small" && issue.params.minimum === undefined) || (issue.rule === "too_big" && issue.params.maximum === undefined)) return validationMessages.invalid[locale];
  return validationMessages[issue.rule][locale].replace(/\{(minimum|maximum)\}/g, (_match, key: "minimum" | "maximum") => {
    const value = issue.params[key]; return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : "";
  });
}
export function formatError(error: UiError | null, locale: Locale): string | null { return error ? errorMessages[error.reason][locale] : null; }
export function formatSuccess(messageId: SuccessMessageId, locale: Locale): string { return successMessages[messageId][locale]; }
