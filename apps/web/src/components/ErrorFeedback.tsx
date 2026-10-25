import type { UiError } from "../api/error";
import { useLanguage } from "../i18n/useLanguage";
import { formatError, formatIssue } from "../i18n/errors";
export function ErrorFeedback({ error, fields = {} }: { error: UiError | null; fields?: Record<string, string> }) {
  const { locale } = useLanguage();
  if (!error) return null;
  return <div role="alert"><p>{formatError(error, locale)}</p>{error.issues.length > 0 && <ul>{error.issues.map((issue, index) => {
    const field = issue.path.join(".");
    const target = Object.hasOwn(fields, field) ? fields[field] : undefined;
    return <li key={index}>{target ? <a className="underline" href={"#" + target} onClick={() => document.getElementById(target)?.focus()}>{formatIssue(issue, locale)}</a> : formatIssue(issue, locale)}</li>;
  })}</ul>}</div>;
}
