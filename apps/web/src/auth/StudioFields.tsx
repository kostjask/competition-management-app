import { studioFields, type StudioDetails } from "./studioDetails";
import { AccountField } from "./AccountField";
import { useTranslation } from "../i18n/useTranslation";
import type { UiError } from "../api/error";
export function StudioFields({ value, onChange, error, prefix, pathPrefix = "", required = false, omitName = false }: { value: StudioDetails; onChange: (value: StudioDetails) => void; error: UiError | null; prefix: string; pathPrefix?: string; required?: boolean; omitName?: boolean }) {
  const { t } = useTranslation();
  return <>{studioFields.filter(key => !omitName || key !== "studioName").map(key => <AccountField key={key} id={prefix+key} path={pathPrefix+key} label={t(key === "studioName" ? "Flow.studioName" : key === "country" ? "Flow.country" : key === "city" ? "Flow.city" : key === "directorName" ? "Flow.directorName" : "Flow.directorPhone")} value={value[key]} onChange={text => onChange({...value,[key]:text})} error={error} required={required && key !== "directorPhone"} />)}</>;
}
