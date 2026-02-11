import { useLanguage } from './useLanguage';
import { getTranslation } from './translations';

export const useTranslation = () => {
  const { locale } = useLanguage();

  const t = (key: string): string => {
    return getTranslation(key, locale);
  };

  return { t, locale };
};
