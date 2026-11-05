import { Field, Input } from "../components/ui/Foundation";
import { useTranslation } from "../i18n/useTranslation";
import { formatIssue } from "../i18n/errors";
import type { UiError } from "../api/error";
export function AccountField({ id, path, label, value, onChange, error, type = "text", autoComplete, required = true }: {
  id: string; path: string; label: string; value: string; onChange: (value: string) => void; error: UiError | null; type?: string; autoComplete?: string; required?: boolean;
}) {
  const { locale } = useTranslation(); const issue = error?.issues.find(item => item.path.join(".") === path);
  return <Field id={id} label={label} required={required} error={issue ? formatIssue(issue,locale) : undefined}>{props => <Input {...props} type={type} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} />}</Field>;
}
