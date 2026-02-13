import { type Locale } from './LanguageContext';

/**
 * Translation Naming Convention:
 * - Section names: PascalCase (e.g., "Auth", "Studio", "Judge")
 * - Key names: camelCase (e.g., "enterName", "noEvents", "selectStage")
 * - Full key path: "Section.keyName" (e.g., "Auth.loginButton")
 * - Meaningful keys shortly describing literal text (noEvents -> "No events yet")
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
    },
    welcome: {
      et: 'Tere tulemast',
      en: 'Welcome',
      ru: 'Добро пожаловать'
    },
    events: {
      et: 'Sündmused',
      en: 'Events',
      ru: 'События'
    },
    eventPhoto: {
      et: 'Sündmuse foto',
      en: 'Event photo',
      ru: 'Фото события'
    },
    city: {
      et: 'Linn',
      en: 'City',
      ru: 'Город'
    },
    country: {
      et: 'Riik',
      en: 'Country',
      ru: 'Страна'
    },
    eventId: {
      et: 'Sündmuse ID',
      en: 'Event ID',
      ru: 'ID события'
    },
  },
  Events: {
    listTitle: {
      et: 'Sündmused',
      en: 'Events',
      ru: 'События'
    },
    listSubtitle: {
      et: 'Halda oma võistluste ajakava ja etappe.',
      en: 'Manage your competition schedule and stages.',
      ru: 'Управляйте расписанием и этапами соревнований.'
    },
    createTitle: {
      et: 'Loo sündmus',
      en: 'Create event',
      ru: 'Создать событие'
    },
    editTitle: {
      et: 'Muuda sündmust',
      en: 'Edit event',
      ru: 'Редактировать событие'
    },
    createButton: {
      et: 'Uus sündmus',
      en: 'New event',
      ru: 'Новое событие'
    },
    createSubmit: {
      et: 'Loo sündmus',
      en: 'Create event',
      ru: 'Создать событие'
    },
    saveChanges: {
      et: 'Salvesta muudatused',
      en: 'Save changes',
      ru: 'Сохранить изменения'
    },
    editButton: {
      et: 'Muuda',
      en: 'Edit',
      ru: 'Редактировать'
    },
    registerButton: {
      et: 'Registreeru',
      en: 'Register',
      ru: 'Зарегистрироваться'
    },
    nameLabel: {
      et: 'Sündmuse nimi',
      en: 'Event name',
      ru: 'Название события'
    },
    startsAtLabel: {
      et: 'Algab',
      en: 'Starts at',
      ru: 'Начало'
    },
    startsAt: {
      et: 'Algab',
      en: 'Starts at',
      ru: 'Начало'
    },
    endsAtLabel: {
      et: 'Lõpeb',
      en: 'Ends at',
      ru: 'Окончание'
    },
    endsAt: {
      et: 'Lõpeb',
      en: 'Ends at',
      ru: 'Окончание'
    },
    stageLabel: {
      et: 'Etapp',
      en: 'Stage',
      ru: 'Этап'
    },
    stagePreRegistration: {
      et: 'Eelregistreerimine',
      en: 'Pre-registration',
      ru: 'Предрегистрация'
    },
    stageRegistrationOpen: {
      et: 'Registreerimine avatud',
      en: 'Registration open',
      ru: 'Регистрация открыта'
    },
    stageDataReview: {
      et: 'Andmete kontroll',
      en: 'Data review',
      ru: 'Проверка данных'
    },
    stageFinalized: {
      et: 'Kinnitatud',
      en: 'Finalized',
      ru: 'Утверждено'
    },
    stageEnded: {
      et: 'Lõppenud',
      en: 'Ended',
      ru: 'Завершено'
    },
    venue: {
      et: 'Asukoht',
      en: 'Venue',
      ru: 'Место проведения'
    },
    createdAt: {
      et: 'Loodud',
      en: 'Created at',
      ru: 'Создано'
    },
    updatedAt: {
      et: 'Muudetud',
      en: 'Updated at',
      ru: 'Обновлено'
    },
    addStudio: {
      et: 'Lisa stuudio',
      en: 'Add studio',
      ru: 'Добавить студию'
    },
    noEventsYet: {
      et: 'Sündmusi pole veel',
      en: 'No events yet',
      ru: 'Пока нет событий'
    },
    createFirstEvent: {
      et: 'Loo esimene sündmus, et alustada registreerimist.',
      en: 'Create your first event to open registrations.',
      ru: 'Создайте первое событие, чтобы открыть регистрацию.'
    },
    loading: {
      et: 'Laen sündmusi...',
      en: 'Loading events...',
      ru: 'Загрузка событий...'
    },
    loadError: {
      et: 'Sündmuste laadimine ebaõnnestus.',
      en: 'Failed to load events.',
      ru: 'Не удалось загрузить события.'
    },
    submitError: {
      et: 'Sündmuse salvestamine ebaõnnestus.',
      en: 'Failed to save event.',
      ru: 'Не удалось сохранить событие.'
    },
    backToList: {
      et: 'Tagasi sündmuste juurde',
      en: 'Back to events',
      ru: 'Назад к событиям'
    },
    formHint: {
      et: 'Kellaajad on sinu kohaliku ajavööndi järgi.',
      en: 'Times are shown in your local timezone.',
      ru: 'Время указано в вашем часовом поясе.'
    },
    details : {
      et: 'Detailid',
      en: 'Details',
      ru: 'Детали'
    },
    learnMore : {
      et: 'Lisateave',
      en: 'Learn more',
      ru: 'Узнать больше'
    },
    moreInfo : {
      et: 'Rohkem teavet',
      en: 'More info',
      ru: 'Подробнее'
    },
    upcoming : {
      et: 'Eelseisvad sündmused',
      en: 'Upcoming events',
      ru: 'Предстоящее'
    },
    past : {
      et: 'Minevikusündmused',
      en: 'Past events',
      ru: 'Прошедшие события'
    },
    current : {
      et: 'Praegused sündmused',
      en: 'Current events',
      ru: 'Текущие события'
    },
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
