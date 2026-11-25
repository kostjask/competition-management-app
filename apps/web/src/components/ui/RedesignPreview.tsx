import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Field, Input, StatusBadge } from "./Foundation";
import { PasswordInput } from "./PasswordInput";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/useLanguage";
import { languageNames, isLocale, SUPPORTED_LOCALES } from "../../i18n/locale";
import "./redesign-preview.css";

const preview = {
  title: { et: "Uue kujunduse eelvaade", en: "Redesign preview", ru: "Предпросмотр нового дизайна" },
  examples: { et: "Näidisandmed", en: "Sample data", ru: "Пример данных" },
  layout: { et: "Navigeerimine", en: "Navigation layout", ru: "Вид навигации" },
  rail: { et: "Külgmenüü", en: "Sidebar", ru: "Боковое меню" },
  bar: { et: "Ülamenüü", en: "Top bar", ru: "Верхнее меню" },
  event: { et: "Talvine tantsuvõistlus", en: "Winter Dance Festival", ru: "Зимний фестиваль танца" },
  date: { et: "5.–6. detsember, Tallinn", en: "5–6 December, Tallinn", ru: "5–6 декабря, Таллинн" },
  organizer: { et: "Korraldaja", en: "Organizer", ru: "Организатор" },
  applicant: { et: "Taotleja", en: "Applicant", ru: "Заявитель" },
  eventReady: { et: "Lava on tööks valmis", en: "Stage is ready", ru: "Сцена готова" },
  viewEvent: { et: "Ava sündmus", en: "Open event", ru: "Открыть событие" },
  overview: { et: "Ülevaade", en: "Overview", ru: "Обзор" },
  stage: { et: "Pealava", en: "Main stage", ru: "Главная сцена" },
  morning: { et: "Hommikune sessioon", en: "Morning session", ru: "Утренняя сессия" },
  performance: { et: "Paber ja valgus", en: "Paper and Light", ru: "Бумага и свет" },
  following: { et: "Talvejoon", en: "Winter Line", ru: "Линия зимы" },
  studio: { et: "Stuudio Põhi", en: "North Studio", ru: "Студия «Север»" },
  accepted: { et: "Kinnitatud", en: "Approved", ru: "Одобрено" },
  entryTask: { et: "Lisa oma esimene etteaste", en: "Add your first performance", ru: "Добавьте первое выступление" },
  applicationReady: { et: "Mõlemad otsused on kinnitatud. Nüüd saad lisada etteasteid.", en: "Both approvals are complete. You can now add performances.", ru: "Обе проверки пройдены. Теперь можно добавить выступления." },
  nextStep: { et: "Järgmine samm", en: "Next step", ru: "Следующий шаг" },
  taskDone: { et: "Etteaste mustand loodud", en: "Performance draft created", ru: "Черновик выступления создан" },
  performanceName: { et: "Etteaste pealkiri", en: "Performance title", ru: "Название выступления" },
  technique: { et: "Tehnika", en: "Technique", ru: "Техника" },
  timing: { et: "Rütmitaju", en: "Timing", ru: "Чувство ритма" },
  demoAccount: { et: "Näidiskonto. Kasuta näidisparooli 1234.", en: "Demo account. Use the sample password 1234.", ru: "Демонстрационная учётная запись. Введите пароль 1234." },
  demoPassword: { et: "Sisesta näidisparool 1234.", en: "Enter the sample password 1234.", ru: "Введите демонстрационный пароль 1234." },
  waitingSheets: { et: "Oota ülejäänud hindamislehte.", en: "Waiting for the remaining score sheet.", ru: "Ожидается последний оценочный лист." },
  expire: { et: "Näita aegunud seanssi", en: "Preview session expiry", ru: "Показать истечение сеанса" },
} as const;

export default function RedesignPreview() {
  const { t, locale } = useTranslation();
  const { setLocale } = useLanguage();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const journeyParam = query.get("journey");
  const journey = journeyParam === "applicant" || journeyParam === "judge" ? journeyParam : "organizer";
  const step = query.get("step");
  const [appearance, setAppearance] = useState<"day" | "night" | null>(null);
  const [layout, setLayout] = useState<"rail" | "bar">("rail");
  const [paused, setPaused] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedEntry, setSavedEntry] = useState("");
  const [scores, setScores] = useState({ technique: "", timing: "" });
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState("");
  const [badPassword, setBadPassword] = useState(false);
  const [review, setReview] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const copy = (key: keyof typeof preview) => preview[key][locale];
  const path = (screen: typeof journey, next?: string) => "?" + new URLSearchParams({ journey: screen, ...(next && { step: next }) }).toString();
  const mode = appearance ?? (journey === "judge" || step === "live" ? "night" : "day");
  const scoring = journey === "judge" && step === "score";
  const signIn = journey === "judge" && !scoring;
  const live = journey === "organizer" && step === "live";
  const eventOpen = journey === "organizer" && (step === "event" || live);
  const scoreReady = Object.values(scores).every(score => /^\d+(?:[.,][05])?$/.test(score) && Number(score.replace(",", ".")) <= 10);

  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [journey, step]);

  const eventNav = eventOpen && <nav className="redesign-event-nav" aria-label={t("Shell.navigation")}>
    <Link aria-current={!live ? "page" : undefined} to={path("organizer", "event")}>{copy("overview")}</Link>
    <Link aria-current={live ? "page" : undefined} to={path("organizer", "live")}>{t("Moderator.title")}</Link>
  </nav>;

  return <div className="redesign-preview" data-mode={mode} data-layout={layout}>
    <header className="redesign-top">
      <div className="redesign-wrap redesign-toolbar">
        <div><strong>{copy("title")}</strong><small>{copy("examples")}</small></div>
        <div className="redesign-controls">
          <select aria-label={t("Feedback.selectedLanguage")} value={locale}
            onChange={event => { if (isLocale(event.target.value)) setLocale(event.target.value); }}>
            {SUPPORTED_LOCALES.map(lang => <option key={lang} value={lang} lang={lang}>{languageNames[lang]}</option>)}
          </select>
          <select aria-label={t("Shell.appearance")} value={mode}
            onChange={event => setAppearance(event.target.value === "night" ? "night" : "day")}>
            <option value="day">{t("Shell.day")}</option><option value="night">{t("Shell.night")}</option>
          </select>
        </div>
      </div>
      <div className="redesign-wrap redesign-switch">
        <nav aria-label={t("Shell.workspaces")}>
          <Link to={path("organizer")} aria-current={journey === "organizer" ? "page" : undefined}>{copy("organizer")}</Link>
          <Link to={path("applicant")} aria-current={journey === "applicant" ? "page" : undefined}>{copy("applicant")}</Link>
          <Link to={path("judge")} aria-current={journey === "judge" ? "page" : undefined}>{t("Shell.judge")}</Link>
        </nav>
        {eventOpen && <select className="redesign-layout-choice" aria-label={copy("layout")} value={layout}
          onChange={event => setLayout(event.target.value === "rail" ? "rail" : "bar")}>
          <option value="rail">{copy("rail")}</option><option value="bar">{copy("bar")}</option>
        </select>}
      </div>
    </header>

    <main className="redesign-wrap redesign-main">
      {journey === "organizer" && !eventOpen && <>
        <h1 ref={title} tabIndex={-1}>{t("Shell.events")}</h1>
        <article className="redesign-ledger">
          <div><h2>{copy("event")}</h2><p>{copy("date")}</p></div>
          <StatusBadge tone="success">{copy("eventReady")}</StatusBadge>
          <Link to={path("organizer", "event")} className="ui-button ui-button-primary">{copy("viewEvent")}</Link>
        </article>
      </>}
      {eventOpen && <>
        <Link className="redesign-back" to={path("organizer")}>{t("Events.backToList")}</Link>
        <div className="redesign-event">
          <div className="redesign-context"><p>{copy("event")}</p>{eventNav}</div>
          <div className="redesign-event-work">
            <h1 ref={title} tabIndex={-1}>{live ? t("Moderator.title") : copy("overview")}</h1>
            <p className="redesign-meta">{t("Judge.stage", { stage: copy("stage"), session: copy("morning") })}</p>
            {!live ? <article className="redesign-ledger">
              <div><h2>{copy("eventReady")}</h2><p>{copy("date")}</p></div>
              <Link className="ui-button ui-button-primary" to={path("organizer", "live")}>{t("Moderator.title")}</Link>
            </article> : <>
              <div className="redesign-queue">
                <article><p>{t("Moderator.current")}</p><h2>{copy("performance")}</h2><small>{t("Moderator.completion", { locked: "1", required: "2" })}</small></article>
                <article><p>{t("Moderator.next")}</p><h2>{copy("following")}</h2></article>
              </div>
              <div className="redesign-command">
                <p id="preview-readiness">{copy("waitingSheets")}</p>
                <div className="redesign-actions"><Button disabled aria-describedby="preview-readiness">{t("Moderator.ADVANCE")}</Button>
                  <Button variant="secondary" onClick={() => setPaused(value => !value)}>{t(paused ? "Moderator.resume" : "Moderator.PAUSE")}</Button></div>
                <small role="status">{t(paused ? "Schedule.PAUSED" : "Schedule.RUNNING")}</small>
              </div>
            </>}
          </div>
        </div>
      </>}
      {journey === "applicant" && <>
        {step && <Link className="redesign-back" to={path("applicant")}>{t("Application.title")}</Link>}
        <h1 ref={title} tabIndex={-1}>{step === "entry" ? copy("entryTask") : step === "application" ? copy("studio") : t("Application.title")}</h1>
        <p className="redesign-meta">{copy("event")}</p>
        {step === "entry" ? <form className="redesign-form" onSubmit={event => { event.preventDefault(); setSavedEntry(draft.trim()); }}>
          <Field id="preview-entry" label={copy("performanceName")} required>{attrs => <Input {...attrs} value={draft} onChange={event => setDraft(event.target.value)} />}</Field>
          <Button type="submit" disabled={!draft.trim()}>{t("Performance.saveDraft")}</Button>
          {savedEntry && <p role="status">{copy("taskDone")}: {savedEntry}</p>}
        </form> : <article className="redesign-application">
          {step !== "application" && <h2>{copy("studio")}</h2>}
          <dl><div><dt>{t("Application.organization")}</dt><dd>{copy("accepted")}</dd></div><div><dt>{t("Application.event")}</dt><dd>{copy("accepted")}</dd></div></dl>
          <div className="redesign-next"><p>{copy("nextStep")}</p><h2>{copy("entryTask")}</h2><p>{copy("applicationReady")}</p>
            <Link className="ui-button ui-button-primary" to={path("applicant", "entry")}>{copy("entryTask")}</Link>
            {!step && <Link className="redesign-inline" to={path("applicant", "application")}>{t("Application.view")}</Link>}
          </div>
        </article>}
      </>}
      {signIn && <section className="redesign-auth">
        <h1 ref={title} tabIndex={-1}>{t(step === "expired" ? "Shell.expired" : "Shell.login")}</h1>
        <p className="redesign-meta">{copy("event")}</p>
        {step === "expired" && <p role="status">{t("Judge.unsaved")}</p>}
        <form className="redesign-form" noValidate onSubmit={event => {
          event.preventDefault();
          if (password !== "1234") { setBadPassword(true); return; }
          setPassword(""); setBadPassword(false);
          navigate(path("judge", "score"));
        }}>
          <Field id="preview-email" label={t("Shell.email")}>{attrs => <Input {...attrs} type="email" value="judge@example.test" readOnly />}</Field>
          <Field id="preview-password" label={t("Shell.password")} hint={copy("demoAccount")} required
            error={badPassword ? copy("demoPassword") : undefined}>{attrs =>
              <PasswordInput {...attrs} id="preview-password" value={password} autoComplete="off" onChange={event => { setPassword(event.target.value); setBadPassword(false); }} />}
          </Field>
          <Button type="submit">{t("Shell.login")}</Button>
        </form>
      </section>}
      {scoring && <>
        <p className="redesign-meta">{t("Judge.stage", { stage: copy("stage"), session: copy("morning") })}</p>
        <h1 ref={title} tabIndex={-1}>{copy("performance")}</h1>
        <div className="redesign-score-status"><StatusBadge tone="success">{t(submitted ? "Judge.locked" : "Judge.connected")}</StatusBadge>
          <span>{t("Judge.progress", { filled: String(Object.values(scores).filter(Boolean).length), total: "2" })}</span></div>
        <form className="redesign-score" onSubmit={event => { event.preventDefault(); if (scoreReady) setReview(true); }}>
          {(["technique", "timing"] as const).map(criterion => <Field key={criterion} id={`preview-${criterion}`} label={copy(criterion)}
            hint={t("Judge.range", { min: "0", max: "10", step: "0.5" })}>{attrs =>
              <Input {...attrs} inputMode="decimal" value={scores[criterion]} readOnly={submitted || review}
                onChange={event => setScores(value => ({ ...value, [criterion]: event.target.value }))} />}
          </Field>)}
          {!submitted && !review && <Button type="submit" disabled={!scoreReady}>{t("Judge.review")}</Button>}
          {review && <section className="redesign-command" aria-label={t("Judge.confirmTitle")}>
            <p>{t("Judge.confirmHelp", { title: copy("performance") })}</p>
            <div className="redesign-actions"><Button onClick={() => { setReview(false); setSubmitted(true); }}>{t("Judge.submit")}</Button>
              <Button variant="secondary" onClick={() => setReview(false)}>{t("Common.cancel")}</Button></div>
          </section>}
        </form>
        {!submitted && <Link className="redesign-inline" to={path("judge", "expired")}>{copy("expire")}</Link>}
      </>}
    </main>
  </div>;
}
