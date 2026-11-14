import { useTranslation } from "../../i18n/useTranslation";
export default function EntryLoading() {
  const { t } = useTranslation();
  return <div className="entry-loading" role="status"><p>{t("Access.loading")}</p>
    <div aria-hidden="true">{[0, 1, 2].map(row => <div key={row}><span /><span /></div>)}</div>
  </div>;
}
