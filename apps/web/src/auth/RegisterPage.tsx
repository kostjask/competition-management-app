import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RegisterSchema, RecipientLocaleSchema } from "@dance/schemas";
import { register } from "../api/auth";
import { toUiError, type UiError } from "../api/error";
import { useTranslation } from "../i18n/useTranslation";
import { Button, ErrorSummary, Field } from "../components/ui/Foundation";
import { AccountField } from "./AccountField";
import { StudioFields } from "./StudioFields";
import { studioFields, emptyStudioDetails } from "./studioDetails";
import { languageNames } from "../i18n/locale";

export function RegisterPage() {
  const { t, locale } = useTranslation(); const [params] = useSearchParams();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [details,setDetails]=useState(emptyStudioDetails); const [mailLocale,setMailLocale]=useState(locale);
  const [operationId]=useState(()=>crypto.randomUUID()); const [busy,setBusy]=useState(false); const [success,setSuccess]=useState(false); const [error,setError]=useState<UiError|null>(null);
  const fields = {name:"signup-name",email:"signup-email",password:"signup-password",...Object.fromEntries(studioFields.map(key=>["onboarding.details."+key,"signup-"+key]))};
  return <section className="mx-auto max-w-xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{t(success ? "Flow.checkEmail" : "Flow.signup")}</h1>
    {success ? <><p role="status" className="my-4">{t("Flow.unconfirmed")}</p><Link className="ui-button ui-button-primary" to="/auth/onboarding">{t("Flow.onboarding")}</Link><Link className="ui-button ui-button-secondary" to="/auth/resend-verification">{t("Flow.resend")}</Link></> : <>
      <p className="my-4">{t("Flow.intent")}</p><form noValidate className="grid gap-3" onSubmit={event=>{
        event.preventDefault(); const parsed=RegisterSchema.safeParse({name,email,password,locale:mailLocale,onboarding:{operationId,revision:0,intendedEventId:params.get("eventId"),details}});
        if(!parsed.success){setError(toUiError(parsed.error));return;} setBusy(true);setError(null);
        void register(parsed.data).then(()=>{setSuccess(true);setPassword("");}).catch((err:unknown)=>setError(toUiError(err))).finally(()=>setBusy(false));
      }}>
        <ErrorSummary error={error} title={t("Feedback.validation")} fields={fields}/>
        <AccountField id="signup-name" path="name" label={t("Shell.name")} value={name} onChange={setName} error={error} autoComplete="name"/>
        <AccountField id="signup-email" path="email" label={t("Shell.email")} value={email} onChange={setEmail} error={error} type="email" autoComplete="username"/>
        <AccountField id="signup-password" path="password" label={t("Shell.password")} value={password} onChange={setPassword} error={error} type="password" autoComplete="new-password"/>
        <StudioFields prefix="signup-" pathPrefix="onboarding.details." value={details} onChange={setDetails} error={error} required/>
        <Field id="signup-locale" label={t("Flow.language")}>{props=><select {...props} className="ui-input" value={mailLocale} onChange={event=>setMailLocale(RecipientLocaleSchema.parse(event.target.value))}>{Object.entries(languageNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}</Field>
        <Button type="submit" pending={busy}>{t("Flow.signup")}</Button>
      </form></>}
    <div className="my-4 flex flex-wrap gap-3"><Link to="/auth/login">{t("Shell.login")}</Link><Link to="/auth/onboarding">{t("Flow.resume")}</Link></div>
  </section>;
}
