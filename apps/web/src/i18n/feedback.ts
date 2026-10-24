import type { ErrorReason, FieldIssue, SuccessMessageId } from "@dance/schemas";
import type { Locale } from "./locale";
export const errorMessages = {
  "unexpected": {
    "et": "Midagi läks valesti. Proovi uuesti.",
    "en": "Something went wrong. Please try again.",
    "ru": "Что-то пошло не так. Попробуйте ещё раз."
  },
  "invalidInput": {
    "et": "Kontrolli sisestatud andmeid.",
    "en": "Check the supplied information.",
    "ru": "Проверьте введённые данные."
  },
  "authenticationRequired": {
    "et": "Logi uuesti sisse.",
    "en": "Please sign in again.",
    "ru": "Войдите снова."
  },
  "permissionDenied": {
    "et": "Sul puudub selleks õigus.",
    "en": "You do not have permission for this action.",
    "ru": "У вас нет прав на это действие."
  },
  "recordNotFound": {
    "et": "Kirjet ei leitud.",
    "en": "Record not found.",
    "ru": "Запись не найдена."
  },
  "conflict": {
    "et": "Andmed on muutunud või juba olemas. Värskenda ja proovi uuesti.",
    "en": "The data changed or already exists. Refresh and try again.",
    "ru": "Данные изменились или уже существуют. Обновите страницу и повторите попытку."
  },
  "network": {
    "et": "Kontrolli võrguühendust ja proovi uuesti.",
    "en": "Check your connection and try again.",
    "ru": "Проверьте подключение и повторите попытку."
  },
  "invalidResponse": {
    "et": "Serveri vastust ei saanud töödelda. Proovi uuesti.",
    "en": "The server response could not be processed. Please try again.",
    "ru": "Не удалось обработать ответ сервера. Попробуйте ещё раз."
  },
  "invalidCredentials": {
    "et": "E-post või parool on vale.",
    "en": "Email or password is incorrect.",
    "ru": "Неверный адрес почты или пароль."
  },
  "accountDisabled": {
    "et": "Konto on keelatud. Võta ühendust korraldajaga.",
    "en": "This account is disabled. Contact the organizer.",
    "ru": "Учётная запись отключена. Свяжитесь с организатором."
  },
  "emailRegistered": {
    "et": "See e-post on juba registreeritud.",
    "en": "This email is already registered.",
    "ru": "Этот адрес почты уже зарегистрирован."
  },
  "emailVerified": {
    "et": "E-post on juba kinnitatud.",
    "en": "Email is already verified.",
    "ru": "Адрес почты уже подтверждён."
  },
  "stageLocked": {
    "et": "Sündmuse praeguses etapis ei saa andmeid muuta.",
    "en": "Changes are unavailable in the current event stage.",
    "ru": "На текущем этапе события изменения недоступны."
  },
  "studioApprovalRequired": {
    "et": "Stuudio vajab esmalt kinnitamist.",
    "en": "The studio must be approved first.",
    "ru": "Сначала необходимо одобрить студию."
  },
  "ownershipRequired": {
    "et": "Sul puudub sellele stuudiole juurdepääs.",
    "en": "You do not have access to this studio.",
    "ru": "У вас нет доступа к этой студии."
  },
  "pendingRequired": {
    "et": "Tühistada saab ainult ootel taotlusi.",
    "en": "Only pending applications can be cancelled.",
    "ru": "Можно отменить только ожидающие заявки."
  },
  "concurrentChange": {
    "et": "Andmeid muudeti samal ajal. Värskenda ja proovi uuesti.",
    "en": "The data changed concurrently. Refresh and try again.",
    "ru": "Данные были изменены одновременно. Обновите страницу и повторите попытку."
  },
  "duplicateName": {
    "et": "See nimi on juba kasutusel.",
    "en": "This name is already in use.",
    "ru": "Это название уже используется."
  },
  "relationshipConflict": {
    "et": "Seotud kirjed takistavad seda toimingut.",
    "en": "Related records prevent this action.",
    "ru": "Связанные записи не позволяют выполнить действие."
  },
  "invalidConfiguration": {
    "et": "Vali selle sündmuse kehtiv seadistus.",
    "en": "Select valid configuration for this event.",
    "ru": "Выберите допустимые настройки этого события."
  },
  "invalidParticipants": {
    "et": "Vali selle stuudio aktiivsed tantsijad.",
    "en": "Select active dancers belonging to this studio.",
    "ru": "Выберите активных танцоров этой студии."
  },
  "ambiguousStudio": {
    "et": "Esituse stuudio vajab korraldaja kontrolli.",
    "en": "The performance studio requires organizer review.",
    "ru": "Студия выступления требует проверки организатором."
  },
  "orderReserved": {
    "et": "See järjekorranumber on juba kasutusel.",
    "en": "This stage order is already reserved.",
    "ru": "Этот номер в порядке выступлений уже занят."
  },
  "inactiveUser": {
    "et": "Mitteaktiivset kasutajat ei saa määrata.",
    "en": "An inactive user cannot be assigned.",
    "ru": "Нельзя назначить неактивного пользователя."
  },
  "judgeAssigned": {
    "et": "Kasutaja on juba selle sündmuse kohtunik.",
    "en": "This user is already a judge for this event.",
    "ru": "Этот пользователь уже является судьёй события."
  },
  "invitationUsed": {
    "et": "Kutse on juba kasutatud.",
    "en": "This invitation has already been used.",
    "ru": "Это приглашение уже использовано."
  },
  "invitationExpired": {
    "et": "Kutse on aegunud.",
    "en": "This invitation has expired.",
    "ru": "Срок действия приглашения истёк."
  },
  "invitationExists": {
    "et": "Aktiivne kutse on juba olemas.",
    "en": "An active invitation already exists.",
    "ru": "Активное приглашение уже существует."
  },
  "roleAssigned": {
    "et": "Kasutajal on see roll juba olemas.",
    "en": "This user already has this role.",
    "ru": "У пользователя уже есть эта роль."
  },
  "uploadMissing": {
    "et": "Vali üleslaadimiseks fail.",
    "en": "Choose a file to upload.",
    "ru": "Выберите файл для загрузки."
  },
  "uploadTooLarge": {
    "et": "Fail on liiga suur.",
    "en": "The file is too large.",
    "ru": "Файл слишком большой."
  },
  "uploadType": {
    "et": "See failitüüp ei ole lubatud.",
    "en": "This file type is not allowed.",
    "ru": "Этот тип файла не разрешён."
  },
  "uploadInvalid": {
    "et": "Faili üleslaadimine ebaõnnestus. Kontrolli faili.",
    "en": "Upload failed. Please check the file.",
    "ru": "Не удалось загрузить файл. Проверьте файл."
  }
} satisfies Record<ErrorReason, Record<Locale, string>>;
export const validationMessages = {
  "invalid": {
    "et": "Kontrolli seda väärtust.",
    "en": "Check this value.",
    "ru": "Проверьте это значение."
  },
  "invalid_type": {
    "et": "Sisesta õiget tüüpi väärtus.",
    "en": "Enter a value of the correct type.",
    "ru": "Введите значение правильного типа."
  },
  "too_small": {
    "et": "Väärtus peab olema vähemalt {minimum}.",
    "en": "The value must be at least {minimum}.",
    "ru": "Значение должно быть не меньше {minimum}."
  },
  "too_big": {
    "et": "Väärtus võib olla kuni {maximum}.",
    "en": "The value must be at most {maximum}.",
    "ru": "Значение должно быть не больше {maximum}."
  },
  "invalid_format": {
    "et": "Kasuta nõutud vormingut.",
    "en": "Use the required format.",
    "ru": "Используйте требуемый формат."
  },
  "invalid_value": {
    "et": "Vali lubatud väärtus.",
    "en": "Select an allowed value.",
    "ru": "Выберите допустимое значение."
  },
  "unrecognized_keys": {
    "et": "Eemalda toetamata väljad.",
    "en": "Remove unsupported fields.",
    "ru": "Удалите неподдерживаемые поля."
  },
  "not_multiple_of": {
    "et": "Kasuta lubatud sammu.",
    "en": "Use an allowed increment.",
    "ru": "Используйте допустимый шаг."
  },
  "invalid_union": {
    "et": "Kontrolli väärtuse vormingut.",
    "en": "Check the value format.",
    "ru": "Проверьте формат значения."
  },
  "invalid_key": {
    "et": "Kontrolli välja nime.",
    "en": "Check the field name.",
    "ru": "Проверьте название поля."
  },
  "invalid_element": {
    "et": "Kontrolli loendi kirjet.",
    "en": "Check the list item.",
    "ru": "Проверьте элемент списка."
  },
  "dateOrder": {
    "et": "Lõpp peab olema pärast algust.",
    "en": "The end must be after the start.",
    "ru": "Окончание должно быть после начала."
  },
  "calendarDate": {
    "et": "Sisesta kehtiv kuupäev.",
    "en": "Enter a valid calendar date.",
    "ru": "Введите допустимую календарную дату."
  },
  "nonemptyPatch": {
    "et": "Muuda vähemalt üht välja.",
    "en": "Change at least one field.",
    "ru": "Измените хотя бы одно поле."
  },
  "duplicate": {
    "et": "Eemalda korduvad valikud.",
    "en": "Remove duplicate selections.",
    "ru": "Удалите повторяющиеся значения."
  },
  "participantRange": {
    "et": "Miinimum ei tohi ületada maksimumi.",
    "en": "The minimum cannot exceed the maximum.",
    "ru": "Минимум не может превышать максимум."
  },
  "ageRange": {
    "et": "Vanuse alampiir ei tohi ületada ülempiiri.",
    "en": "The minimum age cannot exceed the maximum age.",
    "ru": "Минимальный возраст не может превышать максимальный."
  }
} satisfies Record<FieldIssue["rule"], Record<Locale, string>>;
export const successMessages = {
  "registered": {
    "et": "Konto on loodud. Kinnita e-post saadetud lingi kaudu.",
    "en": "Account created. Use the emailed link to verify your email.",
    "ru": "Учётная запись создана. Подтвердите почту по отправленной ссылке."
  },
  "emailVerified": {
    "et": "E-post on kinnitatud.",
    "en": "Email verified.",
    "ru": "Адрес почты подтверждён."
  },
  "invitationSent": {
    "et": "Kutse on saadetud.",
    "en": "Invitation sent.",
    "ru": "Приглашение отправлено."
  },
  "invitationAccepted": {
    "et": "Kutse on vastu võetud.",
    "en": "Invitation accepted.",
    "ru": "Приглашение принято."
  },
  "saved": {
    "et": "Salvestatud.",
    "en": "Saved.",
    "ru": "Сохранено."
  }
} satisfies Record<SuccessMessageId, Record<Locale, string>>;
