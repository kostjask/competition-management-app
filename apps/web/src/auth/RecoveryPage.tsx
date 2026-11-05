import { useState } from "react";
import { Link } from "react-router-dom";
import { ResendVerificationSchema, RequestPasswordResetSchema, CorrectEmailSchema } from "@dance/schemas";
import { resendVerification, requestPasswordReset, correctEmail } from "../api/auth";
import { useTranslation } from "../i18n/useTranslation";
import { toUiError, type UiError } from "../api/error";
import { AccountField } from "./AccountField";
import { Alert, Button, ErrorSummary } from "../components/ui/Foundation";
export function RecoveryPage({kind}:{kind:"resend"|"recovery"|"correction"}){
  const {t}=useTranslation();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [newEmail,setNewEmail]=useState("");const [busy,setBusy]=useState(false);const [accepted,setAccepted]=useState(false);const [error,setError]=useState<UiError|null>(null);
  return <section className="mx-auto max-w-md p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t(kind==="resend"?"Flow.resend":kind==="recovery"?"Flow.forgot":"Flow.correct")}</h1>
    {accepted&&<Alert tone="success">{t("Flow.unconfirmed")}</Alert>}
    {kind==="correction"&&<p className="my-4">{t("Flow.correctionHelp")}</p>}
    <form noValidate onSubmit={event=>{event.preventDefault();setError(null);setAccepted(false);
      const run=async()=>{if(kind==="resend")await resendVerification(ResendVerificationSchema.parse({email}));else if(kind==="recovery")await requestPasswordReset(RequestPasswordResetSchema.parse({email}));else await correctEmail(CorrectEmailSchema.parse({email,password,newEmail}));};
      setBusy(true);void run().then(()=>{setAccepted(true);setPassword("");}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));
    }}>
      <ErrorSummary error={error} title={t("Feedback.validation")} fields={{email:"recovery-email",password:"recovery-password",newEmail:"recovery-newEmail"}}/>
      <AccountField id="recovery-email" path="email" label={t("Shell.email")} value={email} onChange={setEmail} error={error} type="email" autoComplete="email"/>
      {kind==="correction"&&<><AccountField id="recovery-password" path="password" label={t("Shell.password")} value={password} onChange={setPassword} error={error} type="password" autoComplete="current-password"/><AccountField id="recovery-newEmail" path="newEmail" label={t("Flow.newEmail")} value={newEmail} onChange={setNewEmail} error={error} type="email" autoComplete="email"/></>}
      <Button type="submit" pending={busy}>{t("Flow.send")}</Button>
    </form><div className="my-4 flex flex-wrap gap-3"><Link to="/auth/login">{t("Shell.login")}</Link><Link to="/auth/onboarding">{t("Flow.onboarding")}</Link></div>
  </section>;
}
