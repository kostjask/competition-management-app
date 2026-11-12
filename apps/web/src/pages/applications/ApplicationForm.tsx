import type { UiError } from "../../api/error";
import { AccountField } from "../../auth/AccountField";
import { useTranslation } from "../../i18n/useTranslation";

import { profileFields, contactFields, type ApplicationValues } from "./applicationFields";
export function ApplicationFields({ value, onChange, error, contact = false, prefix }: {
  value: ApplicationValues; onChange: (value: ApplicationValues) => void; error: UiError | null; contact?: boolean; prefix: string;
}) {
  const { t } = useTranslation();
  const types = { representativeEmail: "email", default: "text" };
  const label = { name: t("Flow.studioName"), country: t("Flow.country"), city: t("Flow.city"), directorName: t("Flow.directorName"), directorPhone: t("Flow.directorPhone"), representativeName: t("Application.contactName"), representativeEmail: t("Application.contactEmail") };
  return <>{(contact ? contactFields : profileFields).map(key => <AccountField key={key} id={prefix + key} path={key} label={label[key]} value={value[key]} onChange={text => onChange({ ...value, [key]: text })} error={error} type={key === "representativeEmail" ? types.representativeEmail : types.default} required={key === "name" || contact} />)}</>;
}
