import { useCallback, useEffect, useState } from "react";
import { CreateInvitationSchema, RecipientLocaleSchema, type InvitationsSchema, type EventsSchema } from "@dance/schemas";
import type { z } from "zod";
import { createInvitation, getInvitations, resendInvitation, revokeInvitation } from "../../api/invitations";
import { getEvents } from "../../api/events";
import { useTranslation } from "../../i18n/useTranslation";
import { formatSuccess } from "../../i18n/errors";
import { formatInstant } from "../../i18n/format";
import { languageNames } from "../../i18n/locale";
import { roleLabel } from "../../auth/roleLabel";
import { AccountField } from "../../auth/AccountField";
import { Alert, Button, ErrorSummary, Field, LoadingState } from "../../components/ui/Foundation";
import { toUiError, type UiError } from "../../api/error";
export default function InvitationsPage(){
  const {t,locale}=useTranslation();const [rows,setRows]=useState<z.infer<typeof InvitationsSchema>|null>(null);const [events,setEvents]=useState<z.infer<typeof EventsSchema>>([]);const [email,setEmail]=useState("");const [roleKey,setRoleKey]=useState<"judge"|"moderator">("judge");const [eventId,setEventId]=useState("");const [mailLocale,setMailLocale]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState<UiError|null>(null);const [notice,setNotice]=useState<"invitationCreated"|"invitationResent"|"invitationRevoked"|null>(null);
  const load=useCallback(async()=>{const [invitations,eventRows]=await Promise.all([getInvitations(),getEvents()]);setRows(invitations);setEvents(eventRows);},[]);
  useEffect(()=>{let active=true;void Promise.all([getInvitations(),getEvents()]).then(([items,eventRows])=>{if(active){setRows(items);setEvents(eventRows);}}).catch((err:unknown)=>{if(active)setError(toUiError(err));});return()=>{active=false;};},[]);
  return <section className="mx-auto max-w-4xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t("Flow.manage")}</h1>
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={{email:"staff-email",eventId:"staff-event",roleKey:"staff-role"}}/>
    {notice&&<Alert tone="success">{formatSuccess(notice,locale)}</Alert>}
    {!rows&&!error&&<LoadingState label={t("Access.loading")}/>}
    <form noValidate className="my-6 rounded-xl border border-slate-200 bg-white p-4" onSubmit={event=>{event.preventDefault();const parsed=CreateInvitationSchema.safeParse({email,roleKey,eventId,...(mailLocale?{locale:mailLocale}:{})});if(!parsed.success){setError(toUiError(parsed.error));return;}setBusy(true);setError(null);setNotice(null);void createInvitation(parsed.data).then(async()=>{setNotice("invitationCreated");await load();}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));}}>
      <AccountField id="staff-email" path="email" label={t("Shell.email")} value={email} onChange={setEmail} error={error} type="email" autoComplete="email"/>
      <Field id="staff-event" label={t("Flow.event")} required>{props=><select {...props} className="ui-input" value={eventId} onChange={event=>setEventId(event.target.value)}><option value="">{t("Flow.event")}</option>{events.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
      <Field id="staff-role" label={t("Flow.role")} required>{props=><select {...props} className="ui-input" value={roleKey} onChange={event=>setRoleKey(CreateInvitationSchema.shape.roleKey.parse(event.target.value))}><option value="judge">{t("Shell.judge")}</option><option value="moderator">{t("Shell.moderator")}</option></select>}</Field>
      <Field id="staff-locale" label={t("Flow.language")}>{props=><select {...props} className="ui-input" value={mailLocale} onChange={event=>setMailLocale(event.target.value?RecipientLocaleSchema.parse(event.target.value):"")}><option value="">{t("Flow.defaultLanguage")}</option>{Object.entries(languageNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}</Field>
      <Button type="submit" pending={busy} disabled={!events.length}>{t("Flow.invite")}</Button>
    </form>
    <Button variant="quiet" disabled={busy} onClick={()=>{setError(null);void load().catch((err:unknown)=>setError(toUiError(err)));}}>{t("Shell.retry")}</Button>
    {rows?.length===0&&<p className="my-4">{t("Flow.none")}</p>}
    <ul className="my-4 grid gap-4">{rows?.map(row=><li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere]">
      <p className="font-semibold">{row.email}</p><p>{roleLabel(row.roleKey,row.roleKey,locale)}</p><p>{events.find(event=>event.id===row.eventId)?.name??row.eventId}</p>
      <p>{t(row.status==="PENDING"?"Flow.pending":row.status==="ACCEPTED"?"Flow.acceptedStatus":row.status==="REVOKED"?"Flow.revoked":row.status==="SUPERSEDED"?"Flow.superseded":"Flow.expired")}</p><p>{t("Flow.expires",{date:formatInstant(row.expiresAt,locale,"long","short")})}</p>
      {row.status==="PENDING"&&<div className="mt-3 flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>{setBusy(true);setError(null);setNotice(null);void resendInvitation(row.id,row.expiresAt).then(async()=>{setNotice("invitationResent");await load();}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));}}>{t("Flow.renew")}</Button><Button variant="quiet" disabled={busy} onClick={()=>{if(!window.confirm(t("Flow.revokeConfirm")))return;setBusy(true);setError(null);setNotice(null);void revokeInvitation(row.id,row.expiresAt).then(async()=>{setNotice("invitationRevoked");await load();}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));}}>{t("Flow.revoke")}</Button></div>}
    </li>)}</ul>
  </section>;
}
