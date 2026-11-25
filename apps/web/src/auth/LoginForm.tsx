import { useState } from "react";
import { Link } from "react-router-dom";
import { LoginSchema } from "@dance/schemas";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { toUiError, type UiError } from "../api/error";
import { Button, ErrorSummary, Field, Input } from "../components/ui/Foundation";
import { PasswordInput } from "../components/ui/PasswordInput";
import { formatIssue } from "../i18n/errors";

export function LoginForm({ lockedEmail, recoveryLink }: { lockedEmail?: string; recoveryLink?: string }) {
  const { t, locale } = useTranslation();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<UiError | null>(null);
  const displayed = localError ?? error;
  const temporarilyUnavailable = displayed?.reason === "unexpected" || displayed?.reason === "invalidResponse";
  const fieldError = (name: string) => {
    const issue = displayed?.issues.find(value => value.path[0] === name);
    return issue ? formatIssue(issue, locale) : undefined;
  };
  return <form noValidate className="grid gap-4" onSubmit={event => {
    event.preventDefault(); clearError();
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) { setLocalError(toUiError(parsed.error)); return; }
    setLocalError(null);
    void login(parsed.data).then(() => setPassword("")).catch((err: unknown) => setLocalError(toUiError(err)));
  }}>
    <ErrorSummary error={displayed} title={t(displayed?.issues.length ? "Feedback.validation" : "Shell.loginFailure")}
      message={temporarilyUnavailable ? t("Shell.loginUnavailable") : undefined} fields={{ email: "login-email", password: "login-password" }} />
    <Field id="login-email" label={t("Shell.email")} error={fieldError("email")} required>{props => <Input {...props} type="email" name="email" autoComplete="username" spellCheck={false} value={email} readOnly={!!lockedEmail} onChange={event => setEmail(event.target.value)} />}</Field>
    <Field id="login-password" label={t("Shell.password")} error={fieldError("password")} required>{props => <PasswordInput {...props} name="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />}</Field>
    {recoveryLink && <Link className="workspace-recover-link" to={recoveryLink}>{t("Flow.forgot")}</Link>}
    <Button type="submit" pending={loading}>{t("Shell.login")}</Button>
  </form>;
}
