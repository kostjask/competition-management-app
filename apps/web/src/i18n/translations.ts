import { isLocale, DEFAULT_LOCALE, type Locale } from "./locale";
import { formatNumber } from "./format";
export type PluralText = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type TranslationValue = Record<Locale, string | PluralText>;
export const translations = {
  Flow: {
    verificationRequired: { et: "Enne sisselogimist tuleb e-post kinnitada.", en: "Verify your email before signing in.", ru: "Перед входом подтвердите адрес почты." },
    correctionHelp: { et: "Vastus ei kinnita aadressi muutmist. Mustandi taastamiseks kasuta konto praegust aadressi ja parooli.", en: "The acknowledgement does not confirm an address change. Recover your draft with the account's current email and password.", ru: "Ответ не подтверждает изменение адреса. Восстановите черновик с текущим адресом и паролем аккаунта." },
    switchForLink: { et: "Teise konto lingi kasutamiseks logi kõigepealt välja.", en: "Sign out before using a link for a different account.", ru: "Выйдите, прежде чем использовать ссылку другого аккаунта." },
    reload: { et: "Laadi salvestatud andmed uuesti", en: "Reload saved details", ru: "Загрузить сохранённые данные" },
    reloadConfirm: { et: "Kas laadida salvestatud mustand? Salvestamata muudatused asendatakse.", en: "Reload the saved draft? Unsaved changes will be replaced.", ru: "Загрузить сохранённый черновик? Несохранённые изменения будут заменены." },
    defaultLanguage: { et: "Saaja eelistus või eesti keel", en: "Recipient preference or Estonian", ru: "Предпочтение получателя или эстонский" },
    signup: { et: "Alusta stuudio registreerimist", en: "Start studio signup", ru: "Начать регистрацию студии" },
    intent: { et: "Salvestame sinu stuudio andmed mustandina. Konto loomine ei anna rolli ega osalemisluba.", en: "Your studio details are saved as a draft. Creating an account grants no role or event approval.", ru: "Данные студии сохранятся как черновик. Создание аккаунта не даёт роль или разрешение на участие." },
    studioName: { et: "Stuudio nimi", en: "Studio name", ru: "Название студии" },
    country: { et: "Riik", en: "Country", ru: "Страна" },
    city: { et: "Linn", en: "City", ru: "Город" },
    directorName: { et: "Juhi nimi", en: "Director name", ru: "Имя руководителя" },
    directorPhone: { et: "Juhi telefon (valikuline)", en: "Director phone (optional)", ru: "Телефон руководителя (необязательно)" },
    checkEmail: { et: "Kontrolli oma e-posti", en: "Check your email", ru: "Проверьте почту" },
    unconfirmed: { et: "Päring on vastu võetud. Kirja kohaletoimetamine ei ole kinnitatud.", en: "The request was accepted. Email delivery is unconfirmed.", ru: "Запрос принят. Доставка письма не подтверждена." },
    onboarding: { et: "Minu stuudio mustand", en: "My studio draft", ru: "Черновик моей студии" },
    prove: { et: "Salvestatud andmete taastamiseks tõenda konto omanikuks olemist. Kinnitamata konto ei saa tavapärast ligipääsu.", en: "Prove account ownership to recover saved details. An unverified account receives no ordinary access.", ru: "Подтвердите владение аккаунтом для восстановления данных. Неподтверждённый аккаунт не получает обычный доступ." },
    resume: { et: "Taasta mustand", en: "Recover draft", ru: "Восстановить черновик" },
    save: { et: "Salvesta mustand", en: "Save draft", ru: "Сохранить черновик" },
    saved: { et: "Mustand on salvestatud.", en: "Draft saved.", ru: "Черновик сохранён." },
    cancel: { et: "Tühista mustand", en: "Cancel draft", ru: "Отменить черновик" },
    cancelConfirm: { et: "Kas tühistada mustand? Konto säilib; tühistatud mustandit enam muuta ei saa.", en: "Cancel the draft? Your account remains; a cancelled draft cannot be edited.", ru: "Отменить черновик? Аккаунт сохранится; отменённый черновик нельзя изменить." },
    cancelled: { et: "Mustand on tühistatud. Konto ja ajalugu säilivad.", en: "The draft is cancelled. Your account and history remain.", ru: "Черновик отменён. Аккаунт и история сохранены." },
    completed: { et: "Mustandi menetlus on lõpetatud.", en: "The draft has been completed.", ru: "Работа с черновиком завершена." },
    noDraft: { et: "Salvestatud mustandit pole. Saad luua oma stuudio mustandi.", en: "There is no saved draft. You can create your studio draft.", ru: "Сохранённого черновика нет. Можно создать черновик студии." },
    forgetProof: { et: "Sulge omanikukinnitus", en: "Close owner proof", ru: "Закрыть подтверждение владельца" },
    resend: { et: "Taotle uut kinnituskirja", en: "Request a new verification email", ru: "Запросить новое письмо подтверждения" },
    correct: { et: "Paranda kinnitamata e-posti aadress", en: "Correct an unverified email address", ru: "Исправить неподтверждённый адрес почты" },
    newEmail: { et: "Uus e-posti aadress", en: "New email address", ru: "Новый адрес почты" },
    forgot: { et: "Taasta parool", en: "Recover password", ru: "Восстановить пароль" },
    reset: { et: "Määra uus parool", en: "Set a new password", ru: "Установить новый пароль" },
    send: { et: "Saada taotlus", en: "Submit request", ru: "Отправить запрос" },
    resetHelp: { et: "Kasuta parooli taastamise kirjas olevat linki. Pärast muutmist logi uuesti sisse.", en: "Use the link in your password recovery email. Sign in again after changing it.", ru: "Используйте ссылку из письма восстановления. После изменения войдите снова." },
    missingLink: { et: "Link puudub või ei ole enam saadaval. Ava viimane kiri või taotle uut linki.", en: "The link is missing or unavailable. Reopen the latest email or request a new link.", ru: "Ссылка отсутствует или недоступна. Откройте последнее письмо или запросите новую ссылку." },
    invitation: { et: "Võta kutse vastu", en: "Accept invitation", ru: "Принять приглашение" },
    intended: { et: "Kutse on mõeldud kontole {email}.", en: "This invitation is intended for {email}.", ru: "Приглашение предназначено для {email}." },
    existing: { et: "Logi sisse kutse saanud kontoga. Parooli ega profiili vastuvõtmisel ei muudeta.", en: "Sign in with the invited account. Acceptance does not replace its password or profile.", ru: "Войдите в приглашённый аккаунт. Принятие не меняет его пароль или профиль." },
    wrongAccount: { et: "Oled sisse logitud teise kontoga. Vahetamiseks logi välja.", en: "You are signed in to a different account. Sign out to switch.", ru: "Вы вошли в другой аккаунт. Выйдите, чтобы сменить его." },
    newAccount: { et: "Loo kutsega kinnitatud konto. Stuudio registreerimist ei ole vaja.", en: "Set up the account verified by this invitation. Studio signup is not required.", ru: "Создайте аккаунт, подтверждённый приглашением. Регистрация студии не требуется." },
    accepted: { et: "Kutse on vastu võetud. Töötaja täiendav seadistamine võib olla veel pooleli.", en: "Invitation accepted. Further staff setup may still be pending.", ru: "Приглашение принято. Дополнительная настройка сотрудника может быть не завершена." },
    terminal: { et: "Seda kutset ei saa vastu võtta. Uue kutse saamiseks pöördu korraldaja poole.", en: "This invitation cannot be accepted. Contact the organizer for a new invitation.", ru: "Это приглашение нельзя принять. Обратитесь к организатору за новым приглашением." },
    manage: { et: "Kutsed", en: "Invitations", ru: "Приглашения" },
    event: { et: "Võistlus", en: "Event", ru: "Конкурс" },
    role: { et: "Roll", en: "Role", ru: "Роль" },
    invite: { et: "Loo kutse", en: "Create invitation", ru: "Создать приглашение" },
    renew: { et: "Saada kutse uuesti", en: "Resend invitation", ru: "Повторно отправить приглашение" },
    revoke: { et: "Tühista ootel kutse", en: "Revoke pending invitation", ru: "Отозвать ожидающее приглашение" },
    revokeConfirm: { et: "Kas tühistada see ootel kutse? Vastuvõetud ligipääsu see ei eemalda.", en: "Revoke this pending invitation? This does not remove accepted access.", ru: "Отозвать ожидающее приглашение? Это не удаляет уже принятый доступ." },
    pending: { et: "Ootel", en: "Pending", ru: "Ожидает принятия" },
    expired: { et: "Aegunud", en: "Expired", ru: "Срок истёк" },
    revoked: { et: "Tühistatud", en: "Revoked", ru: "Отозвано" },
    superseded: { et: "Asendatud", en: "Superseded", ru: "Заменено" },
    acceptedStatus: { et: "Vastu võetud", en: "Accepted", ru: "Принято" },
    expires: { et: "Kehtib kuni {date}", en: "Expires {date}", ru: "Срок действия: {date}" },
    none: { et: "Kutseid pole.", en: "There are no invitations.", ru: "Приглашений нет." },
    language: { et: "Saaja kirjade keel", en: "Recipient email language", ru: "Язык писем получателя" },
  },
  Shell: {
    brand: { et: "Tantsuvõistlus", en: "Dance competition", ru: "Танцевальный конкурс" },
    home: { et: "Avaleht", en: "Home", ru: "Главная" },
    events: { et: "Võistlused", en: "Events", ru: "Конкурсы" },
    skip: { et: "Liigu põhisisu juurde", en: "Skip to main content", ru: "Перейти к основному содержимому" },
    navigation: { et: "Peamenüü", en: "Main navigation", ru: "Главная навигация" },
    account: { et: "Konto", en: "Account", ru: "Аккаунт" },
    profile: { et: "Minu profiil", en: "My profile", ru: "Мой профиль" },
    login: { et: "Logi sisse", en: "Sign in", ru: "Войти" },
    logout: { et: "Logi kõigis seadmetes välja", en: "Sign out on all devices", ru: "Выйти на всех устройствах" },
    logoutConfirm: { et: "Kas logida kõigis seadmetes välja? Salvestamata töö läheb kaotsi.", en: "Sign out on all devices? Unsaved work will be lost.", ru: "Выйти на всех устройствах? Несохранённые данные будут потеряны." },
    cancel: { et: "Tühista", en: "Cancel", ru: "Отмена" },
    retry: { et: "Proovi uuesti", en: "Try again", ru: "Повторить" },
    unavailable: { et: "Andmeid ei saa praegu laadida.", en: "The information is unavailable right now.", ru: "Сейчас не удалось загрузить данные." },
    signInRequired: { et: "Võistluse andmete vaatamiseks logi sisse.", en: "Sign in to view protected event information.", ru: "Войдите, чтобы просмотреть закрытые данные конкурса." },
    notFound: { et: "Lehte ei leitud", en: "Page not found", ru: "Страница не найдена" },
    welcome: { et: "Vali oma järgmine tegevus", en: "Choose your next step", ru: "Выберите следующее действие" },
    welcomeText: { et: "Vaata võistlusi ja oma kontole antud ligipääsu.", en: "Browse events and review the access assigned to your account.", ru: "Просматривайте конкурсы и права доступа своего аккаунта." },
    noRoles: { et: "Sulle pole veel rolle määratud. Võistlusi saad vaadata; osalemisavalduste esitamine pole veel saadaval.", en: "You have no roles yet. You can browse events; applications are not available yet.", ru: "Роли пока не назначены. Можно просматривать конкурсы; подача заявок пока недоступна." },
    pendingFeature: { et: "Selle tööruumi tegevused pole veel saadaval.", en: "Actions in this workspace are not available yet.", ru: "Действия в этом рабочем разделе пока недоступны." },
    administrator: { et: "Administraator", en: "Administrator", ru: "Администратор" },
    judge: { et: "Kohtunik", en: "Judge", ru: "Судья" },
    moderator: { et: "Moderaator", en: "Moderator", ru: "Модератор" },
    representative: { et: "Stuudio esindaja", en: "Studio representative", ru: "Представитель студии" },
    customRole: { et: "Muu roll: {name}", en: "Custom role: {name}", ru: "Другая роль: {name}" },
    global: { et: "Üldine ligipääs", en: "Global access", ru: "Общий доступ" },
    unsupportedScope: { et: "See määrang ei anna ligipääsu.", en: "This assignment does not grant access.", ru: "Это назначение не предоставляет доступ." },
    eventContext: { et: "Valitud võistlus: {name}", en: "Selected event: {name}", ru: "Выбранный конкурс: {name}" },
    joined: { et: "Liitunud {date}", en: "Joined {date}", ru: "Дата регистрации: {date}" },
    readOnly: { et: "Profiil on ainult lugemiseks.", en: "This profile is read-only.", ru: "Профиль доступен только для просмотра." },
    name: { et: "Nimi", en: "Name", ru: "Имя" },
    email: { et: "E-post", en: "Email", ru: "Эл. почта" },
    roles: { et: "Rollid ja võistlused", en: "Roles and events", ru: "Роли и конкурсы" },
    password: { et: "Parool", en: "Password", ru: "Пароль" },
    showPassword: { et: "Näita parooli", en: "Show password", ru: "Показать пароль" },
    hidePassword: { et: "Peida parool", en: "Hide password", ru: "Скрыть пароль" },
    expired: { et: "Seanss on aegunud või ligipääs muutunud", en: "Your session expired or access changed", ru: "Сеанс истёк или права доступа изменились" },
    recover: { et: "Jätkamiseks logi uuesti sisse. Selle vahekaardi töö säilib. Tegevusi automaatselt ei korrata.", en: "Sign in again to continue. Work in this tab stays in place. Actions are not retried automatically.", ru: "Войдите снова, чтобы продолжить. Данные в этой вкладке сохранятся. Действия не будут повторены автоматически." },
    verify: { et: "Kinnita e-posti aadress", en: "Verify email", ru: "Подтвердить адрес почты" },
    verifyHelp: { et: "Kinnitamiseks kasuta oma e-postile saadetud linki.", en: "Use the verification link sent to your email.", ru: "Используйте ссылку подтверждения из письма." },
    verifySuccess: { et: "E-post on kinnitatud", en: "Email verified", ru: "Адрес почты подтверждён" },
    continue: { et: "Jätka", en: "Continue", ru: "Продолжить" },
    switchAccount: { et: "Teise konto kinnitamiseks logi kõigepealt välja.", en: "Sign out before verifying a different account.", ru: "Выйдите, прежде чем подтверждать другой аккаунт." },
    utc: { et: "Ajad on UTC ajavööndis.", en: "Times are shown in UTC.", ru: "Время указано в UTC." },
    registrationUnavailable: { et: "Võistlusele kandideerimine pole veel saadaval.", en: "Event applications are not available yet.", ru: "Подача заявок на конкурс пока недоступна." },
  },
  Access: {
    home: { et: "Avalehele", en: "Go to home", ru: "На главную" },
    loading: { et: "Laadimine…", en: "Loading…", ru: "Загрузка…" },
    allowed: { et: "Ligipääs lubatud", en: "Access allowed", ru: "Доступ разрешён" },
    denied: { et: "Ligipääs keelatud", en: "Access denied", ru: "Доступ запрещён" },
  },
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
    return typeof item === "number" ? formatNumber(item, language) : item;
  });
  if (invalid) { console.warn("Invalid translation parameters"); return translations.Feedback.fallback[language]; }
  return output;
}
export function getTranslation<K extends TranslationKey>(key: K, locale: Locale, ...args: TranslationArgs<K>): string {
  return translate(key, locale, args[0]);
}
