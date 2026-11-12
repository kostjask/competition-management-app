import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OnboardingProofSchema, OnboardingSaveSchema, type OnboardingContextSchema, type OnboardingReadSchema } from "@dance/schemas";
import type { z } from "zod";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { readOnboarding, saveOnboarding, cancelOnboarding } from "../api/onboarding";
import { toUiError, type UiError } from "../api/error";
import { AccountField } from "./AccountField";
import { StudioFields } from "./StudioFields";
import { studioFields, emptyStudioDetails } from "./studioDetails";
import { Alert, Button, ErrorSummary, LoadingState } from "../components/ui/Foundation";

type Context = z.infer<typeof OnboardingContextSchema>;
type Proof = z.infer<typeof OnboardingReadSchema>;
const sessionProof: Proof = {};
const applicationsPath = "/applications";
function DraftEditor({ proof, close }: { proof: Proof; close?: () => void }) {
  const { t } = useTranslation(); const [context,setContext]=useState<Context|null>(null); const [details,setDetails]=useState(emptyStudioDetails);
  const [operationId,setOperationId]=useState(()=>crypto.randomUUID()); const [dirty,setDirty]=useState(false); const [busy,setBusy]=useState(true); const [error,setError]=useState<UiError|null>(null); const [saved,setSaved]=useState(false);
  const install=useCallback((value:Context)=>{setContext(value);setDetails(value.draft?.details??emptyStudioDetails);setDirty(false);setError(null);setOperationId(crypto.randomUUID());},[]);
  useEffect(()=>{let active=true;void readOnboarding(proof).then(value=>{if(active)install(value);}).catch((err:unknown)=>{if(active)setError(toUiError(err));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[proof,install]);
  const reload=()=>{if(dirty&&!window.confirm(t("Flow.reloadConfirm")))return;setBusy(true);void readOnboarding(proof).then(install).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));};
  return <><ErrorSummary error={error} title={t("Feedback.validation")} fields={Object.fromEntries(studioFields.map(key=>["draft.details."+key,"draft-"+key]))}/>
    {busy&&!context&&<LoadingState label={t("Access.loading")}/>}
    {saved&&<Alert tone="success">{t("Flow.saved")}</Alert>}
    {context&&<>
      <p className="my-4 break-words">{context.email}</p>
      {!context.emailVerified&&<Alert>{t("Flow.verificationRequired")}</Alert>}
      {context.draft?.status==="CANCELLED"?<Alert>{t("Flow.cancelled")}</Alert>:context.draft?.status==="COMPLETED"?<Alert>{t("Flow.completed")}</Alert>:<form noValidate onSubmit={event=>{
        event.preventDefault();const parsed=OnboardingSaveSchema.safeParse({operationId,revision:context.draft?.revision??0,intendedEventId:context.draft?.intendedEventId??null,details});
        if(!parsed.success){const invalid=toUiError(parsed.error);setError({...invalid,issues:invalid.issues.map(issue=>({...issue,path:["draft",...issue.path]}))});return;}setBusy(true);setError(null);setSaved(false);
        void saveOnboarding({...proof,draft:parsed.data}).then(value=>{install(value);setSaved(true);}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));
      }}>
        {!context.draft&&<p>{t("Flow.noDraft")}</p>}
        <p>{t("Flow.intent")}</p>
        <fieldset disabled={busy}><StudioFields prefix="draft-" pathPrefix="draft.details." value={details} onChange={value=>{setDetails(value);setDirty(true);setSaved(false);}} error={error}/>
        <div className="flex flex-wrap gap-3"><Button type="submit" pending={busy}>{t("Flow.save")}</Button>
        {context.draft&&<Button variant="quiet" disabled={busy} onClick={()=>{if(!window.confirm(t("Flow.cancelConfirm")))return;setBusy(true);setError(null);setSaved(false);void cancelOnboarding({...proof,revision:context.draft?.revision??0}).then(install).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));}}>{t("Flow.cancel")}</Button>}</div></fieldset>
      </form>}
      {context.emailVerified&&<Link className="ui-button ui-button-secondary mt-4" to={context.draft?.status === "DRAFT" && context.draft.intendedEventId ? `/events/${encodeURIComponent(context.draft.intendedEventId)}/register` : applicationsPath}>{t("Shell.continue")}</Link>}
    </>}
    <div className="my-4 flex flex-wrap gap-3"><Button variant="quiet" disabled={busy} onClick={reload}>{t("Flow.reload")}</Button>{close&&<Button variant="quiet" onClick={close}>{t("Flow.forgetProof")}</Button>}<Link to="/auth/resend-verification">{t("Flow.resend")}</Link><Link to="/auth/correct-email">{t("Flow.correct")}</Link></div>
  </>;
}
export function OnboardingPage(){
  const {user,loading}=useAuth();const {t}=useTranslation();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [proof,setProof]=useState<Proof|null>(null);const [error,setError]=useState<UiError|null>(null);
  return <section className="mx-auto max-w-xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t("Flow.onboarding")}</h1>
    {loading&&!user?<LoadingState label={t("Access.loading")}/>:user?<DraftEditor key={user.id} proof={sessionProof}/>:proof?<DraftEditor proof={proof} close={()=>setProof(null)}/>:<>
      <p className="my-4">{t("Flow.prove")}</p><form noValidate onSubmit={event=>{event.preventDefault();const parsed=OnboardingProofSchema.safeParse({email,password});if(!parsed.success){setError(toUiError(parsed.error));return;}setProof(parsed.data);setPassword("");}}>
        <ErrorSummary error={error} title={t("Feedback.validation")} fields={{email:"owner-email",password:"owner-password"}}/>
        <AccountField id="owner-email" path="email" label={t("Shell.email")} value={email} onChange={setEmail} error={error} type="email" autoComplete="username"/>
        <AccountField id="owner-password" path="password" label={t("Shell.password")} value={password} onChange={setPassword} error={error} type="password" autoComplete="current-password"/>
        <Button type="submit">{t("Flow.resume")}</Button>
      </form>
    </>}
  </section>;
}
