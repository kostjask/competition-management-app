import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AcceptInvitationSchema, safeReturnPath, type InvitationPreviewSchema } from "@dance/schemas";
import type { z } from "zod";
import { getInvitation, acceptInvitation } from "../api/invitations";
import { useAuth } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { SwitchAccount } from "./SwitchAccount";
import { AccountField } from "./AccountField";
import { roleLabel } from "./roleLabel";
import { useTranslation } from "../i18n/useTranslation";
import { formatInstant } from "../i18n/format";
import { toUiError, type UiError } from "../api/error";
import { Alert, Button, ErrorSummary, LoadingState } from "../components/ui/Foundation";
export function InvitationPage(){
  const [params]=useSearchParams();const [token]=useState(()=>params.get("token"));const {user,loading,error:sessionError,refreshUser}=useAuth();const {t,locale}=useTranslation();
  const [preview,setPreview]=useState<z.infer<typeof InvitationPreviewSchema>|null>(null);const [attempt,setAttempt]=useState(0);const [name,setName]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [accepted,setAccepted]=useState(false);const [error,setError]=useState<UiError|null>(null);
  useEffect(()=>{if(token)window.history.replaceState(null,"",window.location.pathname);},[token]);
  useEffect(()=>{let active=true;if(token)void getInvitation(token).then(value=>{if(active){setPreview(value);setError(null);}}).catch((err:unknown)=>{if(active)setError(toUiError(err));});return()=>{active=false;};},[token,attempt]);
  const intended=!!user&&user.email===preview?.email;
  const accept=()=>{if(!token)return;const parsed=AcceptInvitationSchema.safeParse(preview?.accountExists||user?{token}:{token,name,password});if(!parsed.success){setError(toUiError(parsed.error));return;}setBusy(true);setError(null);void acceptInvitation(parsed.data).then(async()=>{setAccepted(true);setPassword("");await refreshUser();}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));};
  return <section className="mx-auto max-w-xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t("Flow.invitation")}</h1>
    <ErrorSummary error={error} title={t("Feedback.validation")} fields={{name:"invite-name",password:"invite-password"}}/>
    {!token?<Alert tone="warning">{t("Flow.missingLink")}</Alert>:!preview&&!error?<LoadingState label={t("Access.loading")}/>:null}
    {accepted?<Alert tone="success">{t("Flow.accepted")}</Alert>:preview&&<>
      <p className="my-3 break-words">{t("Flow.intended",{email:preview.email})}</p><p>{roleLabel(preview.roleKey,preview.roleKey,locale)}</p><p>{preview.event?.name}</p><p>{t("Flow.expires",{date:formatInstant(preview.expiresAt,locale,"long","short")})}</p>
      {preview.status!=="PENDING"?<Alert tone="warning">{t("Flow.terminal")}</Alert>:sessionError?<ErrorSummary error={sessionError} title={t("Feedback.validation")}/>:loading?<LoadingState label={t("Access.loading")}/>:user&&!intended?<><Alert tone="warning">{t("Flow.wrongAccount")}</Alert><SwitchAccount/></>:preview.accountExists&&!user?<><p className="my-4">{t("Flow.existing")}</p><LoginForm lockedEmail={preview.email}/><Link to="/auth/resend-verification">{t("Flow.resend")}</Link><Link className="ml-3" to="/auth/forgot-password">{t("Flow.forgot")}</Link></>:intended?<Button pending={busy} onClick={accept}>{t("Flow.invitation")}</Button>:<form noValidate className="mt-4" onSubmit={event=>{event.preventDefault();accept();}}>
        <p>{t("Flow.newAccount")}</p><AccountField id="invite-name" path="name" label={t("Shell.name")} value={name} onChange={setName} error={error} autoComplete="name"/>
        <AccountField id="invite-password" path="password" label={t("Shell.password")} value={password} onChange={setPassword} error={error} type="password" autoComplete="new-password"/>
        <Button type="submit" pending={busy}>{t("Flow.invitation")}</Button>
      </form>}
    </>}
    {error&&token&&<Button variant="quiet" onClick={()=>setAttempt(value=>value+1)}>{t("Shell.retry")}</Button>}
    {accepted&&<Link className="ui-button ui-button-primary mt-4" to={safeReturnPath(preview?.event?"/events/"+preview.event.id:"/")}>{t("Shell.continue")}</Link>}
  </section>;
}
