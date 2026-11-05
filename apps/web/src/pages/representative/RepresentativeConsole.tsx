import { useTranslation } from "../../i18n/useTranslation";
export default function Workspace() { const { t } = useTranslation(); return <section className="p-6"><h1 className="text-2xl font-semibold">{t("Shell.representative")}</h1><p className="my-4">{t("Shell.pendingFeature")}</p></section>; }
