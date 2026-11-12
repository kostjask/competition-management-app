import { useEffect, useState, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  StudioEventMembershipSchema,
  StudioApprovalStatusSchema,
  type ReviewOverview,
  type StudioRegistration,
} from "@dance/schemas";
import { getReview, retryReviewNotification } from "../../api/review";
import { updateStudioApproval, updateStudioRegistration } from "../../api/studios";
import { toUiError, type UiError } from "../../api/error";
import { Button, Field, Alert, ErrorSummary, LoadingState } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
import "../events/Organizer.css";
const CURRENT_PAGE = "page";
const reasons = ["CONTACT_ORGANIZER", "INCOMPLETE_DETAILS", "INELIGIBLE", "CAPACITY"] as const;
type Reason = (typeof reasons)[number];
type Item = ReviewOverview["applications"][number];
export default function ReviewRoute() {
  const { eventId } = useParams();
  return <ReviewPage key={eventId} />;
}
function ReviewPage() {
  const { eventId = "" } = useParams();
  const { t, locale } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<ReviewOverview | null>(null),
    [error, setError] = useState<UiError | null>(null),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [saved, setSaved] = useState(false);
  const refresh = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (saved && !busy && !stale) refresh.current?.focus();
  }, [saved, busy, stale]);
  const load = async () => {
    setBusy(true);
    try {
      setData(await getReview(eventId));
      setStale(false);
      setError(null);
    } catch (e) {
      setError(toUiError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    getReview(eventId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(toUiError(e));
      });
    return () => {
      active = false;
    };
  }, [eventId]);
  const status = (value: StudioRegistration["status"]) =>
    ({
      PENDING: t("Registration.pending"),
      APPROVED: t("Registration.approved"),
      REJECTED: t("Registration.rejected"),
      LOCKED: t("Registration.locked"),
      CANCELLED: t("Registration.cancelled"),
    })[value];
  const filter = params.get("filter") ?? "all";
  const selected = data?.applications.find((item) => item.studio.id === params.get("studio"));
  const items = data?.applications.filter((item) =>
    filter === "organization"
      ? item.studio.approvalStatus === "PENDING"
      : filter === "event"
        ? item.registration.status === "PENDING"
        : true,
  );
  const mutate = async (action: () => Promise<unknown>) => {
    if (busy || stale) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await action();
      setSaved(true);
      const result = await getReview(eventId);
      setData(result);
      refresh.current?.focus();
    } catch (e) {
      setError(toUiError(e));
      setStale(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="organizer">
      <nav className="ui-actions">
        <Link to="/admin">{t("Organizer.title")}</Link>
        <Link to={`/admin/events/${encodeURIComponent(eventId)}/setup`}>
          {t("Organizer.setup")}
        </Link>
      </nav>
      <h1>{t("Organizer.review")}</h1>
      {data && <h2>{data.event.name}</h2>}
      <p>{t("Organizer.independent")}</p>
      <ErrorSummary error={error} title={t("Organizer.review")} />
      {stale && <Alert tone="warning">{t("Organizer.stale")}</Alert>}
      {saved && <Alert tone="success">{t("Organizer.savedDecision")}</Alert>}
      <button
        ref={refresh}
        className="ui-button ui-button-secondary"
        disabled={busy}
        onClick={() => void load()}
      >
        {t("Organizer.refresh")}
      </button>
      {!data && !error && <LoadingState label={t("Events.loading")} />}
      <Field id="review-filter" label={t("Organizer.filter")}>
        {(attrs) => (
          <select
            {...attrs}
            className="ui-input"
            value={filter}
            onChange={(e) => setParams({ filter: e.target.value })}
          >
            <option value="all">{t("Organizer.all")}</option>
            <option value="organization">{t("Organizer.pendingOrg")}</option>
            <option value="event">{t("Organizer.pendingEvent")}</option>
          </select>
        )}
      </Field>
      {data && (
        <div className="organizer-grid">
          <div>
            {items?.length === 0 && <p>{t("Organizer.empty")}</p>}
            <ul className="organizer-list">
              {items?.map((item) => (
                <li key={item.studio.id}>
                  <Link
                    aria-current={selected?.studio.id === item.studio.id ? CURRENT_PAGE : undefined}
                    to={`?filter=${encodeURIComponent(filter)}&studio=${encodeURIComponent(item.studio.id)}`}
                  >
                    {item.studio.name}
                  </Link>
                  <p>
                    {t("Organizer.organization")}: {status(item.studio.approvalStatus)}
                  </p>
                  <p>
                    {t("Organizer.eventApproval")}: {status(item.registration.status)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {selected ? (
              <ReviewDetail
                key={selected.studio.id}
                item={selected}
                stage={data.event.stage}
                busy={busy || stale}
                mutate={mutate}
              />
            ) : (
              <p>{t(params.has("studio") ? "Organizer.missingApplication" : "Organizer.select")}</p>
            )}
            {selected && (
              <>
                <h2>{t("Organizer.history")}</h2>
                {!selected.history.length && <p>{t("Organizer.noHistory")}</p>}
                <ol>
                  {selected.history.map((entry) => (
                    <li key={entry.id}>
                      <time dateTime={entry.createdAt}>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: data.event.timeZone,
                        }).format(new Date(entry.createdAt))}
                      </time>
                      {entry.revision && (
                        <p>
                          {t("Organizer.revision")}: {entry.revision}
                        </p>
                      )}
                      {entry.toStatus && (
                        <p>
                          {entry.action === "STUDIO_APPROVAL_CHANGED"
                            ? t("Organizer.organization")
                            : t("Organizer.eventApproval")}
                          : {status(StudioEventMembershipSchema.shape.status.parse(entry.toStatus))}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
                <h2>{t("Organizer.notifications")}</h2>
                {selected.notifications.length === 0 && <p>{t("Organizer.noNotifications")}</p>}
                <ul>
                  {selected.notifications.map((n) => (
                    <li key={n.id}>
                      {n.kind === "ORGANIZATION"
                        ? t("Organizer.organization")
                        : t("Organizer.eventApproval")}
                      : {status(n.status)}
                      <p>
                        {t(
                          n.delivery === "TEST_ONLY"
                            ? "Organizer.testOnly"
                            : n.delivery === "ACCEPTED"
                              ? "Organizer.accepted"
                              : n.delivery === "CANCELLED"
                                ? "Organizer.expired"
                                : "Organizer.queued",
                        )}
                      </p>
                      {n.delivery === "CANCELLED" && (
                        <Button
                          variant="secondary"
                          disabled={busy || stale}
                          onClick={() => void mutate(() => retryReviewNotification(eventId, n.id))}
                        >
                          {t("Organizer.retryMail")}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
function ReviewDetail({
  item,
  stage,
  busy,
  mutate,
}: {
  item: Item;
  stage: ReviewOverview["event"]["stage"];
  busy: boolean;
  mutate: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { studio, registration } = item;
  const [organization, setOrganization] = useState(studio.approvalStatus);
  const [eventStatus, setEventStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
    registration.status === "APPROVED" || registration.status === "REJECTED"
      ? registration.status
      : "PENDING",
  );
  const [reason, setReason] = useState<Reason>(registration.decisionReason ?? "CONTACT_ORGANIZER"),
    [corrections, setCorrections] = useState(registration.canEditDuringReview);
  const allowed =
    ["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW"].includes(stage) &&
    !["CANCELLED", "LOCKED"].includes(registration.status);
  const statusLabel = (s: "PENDING" | "APPROVED" | "REJECTED") =>
    s === "PENDING"
      ? t("Registration.pending")
      : s === "APPROVED"
        ? t("Registration.approved")
        : t("Registration.rejected");
  const reasonLabel = (r: Reason) =>
    ({
      CONTACT_ORGANIZER: t("Registration.contactOrganizer"),
      INCOMPLETE_DETAILS: t("Registration.incompleteDetails"),
      INELIGIBLE: t("Registration.ineligible"),
      CAPACITY: t("Registration.capacity"),
    })[r];
  return (
    <section>
      <h2>{studio.name}</h2>
      <p>
        {t("Organizer.revision")}: {registration.revision}
      </p>
      <p>
        {registration.nextActor === "ORGANIZER"
          ? t("Registration.organizerNext")
          : registration.nextActor === "APPLICANT"
            ? t("Registration.applicantNext")
            : t("Organizer.nextNone")}
      </p>
      <dl>
        <dt>{t("Common.country")}</dt>
        <dd>{studio.country ?? t("Organizer.notProvided")}</dd>
        <dt>{t("Common.city")}</dt>
        <dd>{studio.city ?? t("Organizer.notProvided")}</dd>
        <dt>{t("Organizer.studioContact")}</dt>
        <dd>
          {studio.directorName ?? studio.directorPhone ?? t("Organizer.notProvided")} {studio.directorName ? studio.directorPhone : null}
        </dd>
        {studio.representatives.map((rep) => (
          <dd key={rep.id}>
            {rep.name}: {rep.email}
          </dd>
        ))}
        <dt>{t("Organizer.billing")}</dt>
        <dd>{studio.invoiceDetails ? JSON.stringify(studio.invoiceDetails) : t("Organizer.notProvided")}</dd>
      </dl>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void mutate(() =>
            updateStudioApproval(studio.id, {
              status: organization,
              eventId: registration.eventId,
              revision: registration.revision,
            }),
          );
        }}
      >
        <fieldset disabled={busy}>
          <legend>{t("Organizer.organization")}</legend>
          <Field id="organization-status" label={t("Organizer.organization")}>
            {(attrs) => (
              <select
                {...attrs}
                className="ui-input"
                value={organization}
                onChange={(e) => setOrganization(StudioApprovalStatusSchema.parse(e.target.value))}
              >
                {StudioApprovalStatusSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Button type="submit" disabled={busy}>
            {t("Organizer.saveOrg")}
          </Button>
        </fieldset>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!allowed) return;
          void mutate(() =>
            updateStudioRegistration(registration.eventId, studio.id, {
              status: eventStatus,
              revision: registration.revision,
              reason: eventStatus === "REJECTED" ? reason : null,
              canEditDuringReview: corrections,
            }),
          );
        }}
      >
        <fieldset disabled={busy || !allowed}>
          <legend>{t("Organizer.eventApproval")}</legend>
          <Field id="event-decision" label={t("Organizer.eventApproval")}>
            {(attrs) => (
              <select
                {...attrs}
                className="ui-input"
                value={eventStatus}
                onChange={(e) => setEventStatus(StudioApprovalStatusSchema.parse(e.target.value))}
              >
                {StudioApprovalStatusSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {eventStatus === "REJECTED" && (
            <Field id="decision-reason" label={t("Organizer.reason")}>
              {(attrs) => (
                <select
                  {...attrs}
                  className="ui-input"
                  value={reason}
                  onChange={(e) => {
                    const value = reasons.find((r) => r === e.target.value);
                    if (value) setReason(value);
                  }}
                >
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {reasonLabel(r)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <label>
            <input
              type="checkbox"
              checked={corrections}
              onChange={(e) => setCorrections(e.target.checked)}
            />
            {t("Organizer.corrections")}
          </label>
          <p className="ui-help">{t("Organizer.correctionsHelp")}</p>
          <Button type="submit" disabled={busy || !allowed}>
            {t("Organizer.saveEvent")}
          </Button>
        </fieldset>
        {!allowed && <p>{t("Organizer.reviewLocked")}</p>}
      </form>
    </section>
  );
}
