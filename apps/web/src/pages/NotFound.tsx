import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
export function NotFound() { const { t } = useTranslation(); return <section className="p-6"><h1 className="text-2xl font-semibold">{t("Shell.notFound")}</h1><Link className="ui-button ui-button-secondary" to="/">{t("Shell.home")}</Link></section>; }
