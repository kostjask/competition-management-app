import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ResetPasswordSchema } from "@dance/schemas";
import { resetPassword } from "../api/auth";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { formatSuccess } from "../i18n/errors";
import { toUiError, type UiError } from "../api/error";
import { AccountField } from "./AccountField";
import { ErrorFeedback } from "../components/ErrorFeedback";
import { SwitchAccount } from "./SwitchAccount";
import { Alert, Button, ErrorSummary, LoadingState } from "../components/ui/Foundation";
export function ResetPasswordPage(){
  const [params]=useSearchParams();const [token]=useState(()=>params.get("token"));const {user,loading,error:sessionError}=useAuth();const {t,locale}=useTranslation();
  const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [success,setSuccess]=useState(false);const [error,setError]=useState<UiError|null>(null);
  useEffect(()=>{if(token)window.history.replaceState(null,"",window.location.pathname);},[token]);
  return <section className="mx-auto max-w-md p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t("Flow.reset")}</h1><p className="my-4">{t("Flow.resetHelp")}</p>
    {sessionError?<ErrorFeedback error={sessionError}/>:loading?<LoadingState label={t("Access.loading")}/>:success?<Alert tone="success">{formatSuccess("passwordReset",locale)}</Alert>:user?<><p>{t("Flow.switchForLink")}</p><SwitchAccount/></>:!token?<Alert tone="warning">{t("Flow.missingLink")}</Alert>:<form noValidate onSubmit={event=>{event.preventDefault();const parsed=ResetPasswordSchema.safeParse({token,password});if(!parsed.success){setError(toUiError(parsed.error));return;}setBusy(true);setError(null);void resetPassword(parsed.data).then(()=>{setSuccess(true);setPassword("");}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));}}>
      <ErrorSummary error={error} title={t("Feedback.validation")} fields={{password:"reset-password"}}/>
      <AccountField id="reset-password" path="password" label={t("Shell.password")} value={password} onChange={setPassword} error={error} type="password" autoComplete="new-password"/>
      <Button type="submit" pending={busy}>{t("Flow.reset")}</Button>
    </form>}
    <div className="my-4 flex flex-wrap gap-3"><Link to="/auth/forgot-password">{t("Flow.forgot")}</Link><Link to="/auth/login">{t("Shell.login")}</Link></div>
  </section>;
}
