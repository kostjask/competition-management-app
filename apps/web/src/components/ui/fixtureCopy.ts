import type { Locale } from "../../i18n/locale";
export const fixtureCopy = {
  et: {
    title: "Kasutajaliidese olekud", note: "Ainult sünteetilised näited. See vorm ei saada andmeid.",
    form: "Taastatav stuudio mustand", name: "Stuudio nimi (kohustuslik)", hint: "Sisesta vähemalt kaks märki. Andmed säilivad ka keele vahetamisel.",
    error: "Kontrolli vormi", save: "Salvesta mustand", cancel: "Tühista", remove: "Eemalda ligipääs", quiet: "Vaata üksikasju",
    loading: "Laadime viimati kinnitatud andmeid…", empty: "Taotlusi veel ei ole", emptyText: "Selles näites puuduvad taotlused. Alustamiseks salvesta mustand.",
    accepted: "Päring on vastu võetud. Kirja kohaletoimetamine ei ole kinnitatud.",
    failed: "Kirja kohaletoimetamine ei ole kinnitatud. Taustaprotsess proovib uuesti; ära loo uut kontot.",
    saved: "Sünteetiline mustand on salvestatud.", disabled: "Esitamine pole saadaval enne e-posti kinnitamist.",
    submit: "Esita taotlus", pending: "Ootab kinnitamist", approved: "Heaks kiidetud", locked: "Lukustatud", rejected: "Tagasi lükatud", busy: "Salvestame…", states: "Teavitused ja olekud",
  },
  en: {
    title: "Interface state fixtures", note: "Synthetic examples only. This form sends no data.",
    form: "Recoverable studio draft", name: "Studio name (required)", hint: "Enter at least two characters. Your input stays when you change language.",
    error: "Check the form", save: "Save draft", cancel: "Cancel", remove: "Remove access", quiet: "View details",
    loading: "Loading the last confirmed information…", empty: "No applications yet", emptyText: "This example has no applications. Save a draft to get started.",
    accepted: "Request accepted. Email delivery is unconfirmed.",
    failed: "Email delivery is unconfirmed. A background retry is scheduled; do not create another account.",
    saved: "Synthetic draft saved.", disabled: "Submission is unavailable until your email is verified.",
    submit: "Submit application", pending: "Awaiting verification", approved: "Approved", locked: "Locked", rejected: "Rejected", busy: "Saving…", states: "Notifications and states",
  },
  ru: {
    title: "Примеры состояний интерфейса", note: "Только синтетические примеры. Эта форма не отправляет данные.",
    form: "Восстанавливаемый черновик студии", name: "Название студии (обязательно)", hint: "Введите не менее двух символов. Введённые данные сохраняются при смене языка.",
    error: "Проверьте форму", save: "Сохранить черновик", cancel: "Отмена", remove: "Удалить доступ", quiet: "Посмотреть подробности",
    loading: "Загружаем последние подтверждённые данные…", empty: "Заявок пока нет", emptyText: "В этом примере нет заявок. Для начала сохраните черновик.",
    accepted: "Запрос принят. Доставка письма не подтверждена.",
    failed: "Доставка письма не подтверждена. Повторная попытка запланирована; не создавайте ещё один аккаунт.",
    saved: "Синтетический черновик сохранён.", disabled: "Отправка заявки недоступна до подтверждения адреса электронной почты.",
    submit: "Отправить заявку", pending: "Ожидает подтверждения", approved: "Одобрено", locked: "Заблокировано", rejected: "Отклонено", busy: "Сохраняем…", states: "Уведомления и состояния",
  },
} satisfies Record<Locale, Record<string, string>>;
