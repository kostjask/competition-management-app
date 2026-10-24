import { isLocale, DEFAULT_LOCALE, type Locale } from "./locale";
export type PluralText = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type TranslationValue = Record<Locale, string | PluralText>;
export const translations = {
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
    stageCancelled: {
      et: 'Tühistatud',
      en: 'Cancelled',
      ru: 'Отменено'
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
  },
  Feedback: {
    fallback: { et: "Midagi läks valesti. Proovi uuesti.", en: "Something went wrong. Please try again.", ru: "Что-то пошло не так. Попробуйте ещё раз." },
    validation: { et: "Kontrolli märgitud välju.", en: "Check the highlighted fields.", ru: "Проверьте отмеченные поля." },
    selectedLanguage: { et: "Vali keel", en: "Choose language", ru: "Выберите язык" },
    items: { et: { one: "{count} kirje", other: "{count} kirjet" }, en: { one: "{count} item", other: "{count} items" }, ru: { one: "{count} запись", few: "{count} записи", many: "{count} записей", other: "{count} записи" } },
  },
} as const satisfies Record<string, Record<string, TranslationValue>>;

type Catalogue = typeof translations;
export type TranslationKey = { [S in keyof Catalogue]: { [K in keyof Catalogue[S]]: K extends string ? `${S}.${K}` : never }[keyof Catalogue[S]] }[keyof Catalogue];
type TextOf<V> = V extends string ? V : V extends object ? V[keyof V] : never;
type Placeholders<S> = S extends `${string}{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;
type ValueAt<K extends TranslationKey> = K extends `${infer S}.${infer T}` ? S extends keyof Catalogue ? T extends keyof Catalogue[S] ? Catalogue[S][T] : never : never : never;
type Parameters<K extends TranslationKey> = Placeholders<TextOf<TextOf<ValueAt<K>>>>;
export type TranslationArgs<K extends TranslationKey> = [Parameters<K>] extends [never] ? [] : [params: { [P in Parameters<K>]: P extends "count" | "minimum" | "maximum" ? number : string | number }];
const catalogue: Record<string, Record<string, TranslationValue>> = translations;
export function translate(key: string, locale: unknown, params: Record<string, string | number> = {}): string {
  const language = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const [section, name] = key.split(".");
  let value: string | PluralText | undefined = catalogue[section]?.[name]?.[language];
  if (value && typeof value !== "string") {
    const count = params.count;
    value = typeof count === "number" && Number.isFinite(count) ? value[new Intl.PluralRules(language).select(count)] ?? value.other : undefined;
  }
  if (typeof value !== "string" || !value.trim()) { console.warn("Invalid translation key or locale"); return translations.Feedback.fallback[language]; }
  let invalid = false;
  const output = value.replace(/\{(\w+)\}/g, (_match, parameter: string) => {
    const item = params[parameter];
    if ((typeof item !== "number" && typeof item !== "string") || (typeof item === "number" && !Number.isFinite(item))) { invalid = true; return ""; }
    return typeof item === "number" ? new Intl.NumberFormat(language).format(item) : item;
  });
  if (invalid) { console.warn("Invalid translation parameters"); return translations.Feedback.fallback[language]; }
  return output;
}
export function getTranslation<K extends TranslationKey>(key: K, locale: Locale, ...args: TranslationArgs<K>): string {
  return translate(key, locale, args[0]);
}
