import { type Locale } from './LanguageContext';

/**
 * Translation Naming Convention:
 * - Section names: PascalCase (e.g., "Auth", "Studio", "Judge")
 * - Key names: camelCase (e.g., "loginButton", "formName", "scoreTechnique")
 * - Full key path: "Section.keyName" (e.g., "Auth.loginButton")
 * 
 * Structure:
 * ```
 * {
 *   SectionName: {
 *     keyName: {
 *       et: "Estonian translation",
 *       en: "English translation",
 *       ru: "Russian translation"
 *     }
 *   }
 * }
 * ```
 */

type TranslationValue = {
  et: string;
  en: string;
  ru: string;
};

type TranslationSection = {
  [key: string]: TranslationValue;
};

type Translations = {
  [section: string]: TranslationSection;
};

export const translations: Translations = {
  Auth: {
    loginSubmit: {
      et: 'Sisselogimine',
      en: 'Login',
      ru: 'Вход'
    },
    loginButton: {
      et: 'Logi sisse',
      en: 'Sign In',
      ru: 'Войти'
    },
    registerButton: {
      et: 'Registreeri',
      en: 'Register',
      ru: 'Зарегистрироваться'
    }
  },
  Studio: {
    formName: {
      et: 'Stuudio nimi',
      en: 'Studio Name',
      ru: 'Название студии'
    },
    formDescription: {
      et: 'Kirjeldus',
      en: 'Description',
      ru: 'Описание'
    }
  },
  Judge: {
    scoreTechnique: {
      et: 'Tehnika',
      en: 'Technique',
      ru: 'Техника'
    },
    scoreArtistry: {
      et: 'Kunstilisus',
      en: 'Artistry',
      ru: 'Артистизм'
    }
  },
  Common: {
    save: {
      et: 'Salvesta',
      en: 'Save',
      ru: 'Сохранить'
    },
    cancel: {
      et: 'Tühista',
      en: 'Cancel',
      ru: 'Отмена'
    },
    delete: {
      et: 'Kustuta',
      en: 'Delete',
      ru: 'Удалить'
    }
  }
};

export const getTranslation = (key: string, locale: Locale): string => {
  const [section, keyName] = key.split('.');
  
  if (!section || !keyName) {
    console.warn(`Invalid translation key format: ${key}. Expected format: "Section.keyName"`);
    return key;
  }

  const translationValue = translations[section]?.[keyName];
  
  if (!translationValue) {
    console.warn(`Translation not found: ${key}`);
    return key;
  }

  return translationValue[locale];
};
