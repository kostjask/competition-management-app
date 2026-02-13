import { useTranslation } from "@i18n/useTranslation";

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('Common.welcome')}</h1>
      <p className="mt-2 text-slate-600">Welcome to the competition app.</p>
    </div>
  );
}