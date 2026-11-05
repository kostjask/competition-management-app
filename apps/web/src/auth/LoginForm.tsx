import { useState } from "react";
import { LoginSchema } from "@dance/schemas";
import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { toUiError, type UiError } from "../api/error";
import { Button, ErrorSummary, Field, Input } from "../components/ui/Foundation";
import { formatIssue } from "../i18n/errors";

export function LoginForm({ onSuccess, lockedEmail }: { onSuccess?: () => void; lockedEmail?: string }) {
  const { t, locale } = useTranslation();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const passwordType = visible ? "text" : "password";
  const [localError, setLocalError] = useState<UiError | null>(null);
  const displayed = localError ?? error;
  const fieldError = (name: string) => {
    const issue = displayed?.issues.find(value => value.path[0] === name);
    return issue ? formatIssue(issue, locale) : undefined;
  };
  return <form noValidate className="grid gap-4" onSubmit={event => {
    event.preventDefault(); clearError();
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) { setLocalError(toUiError(parsed.error)); return; }
    setLocalError(null);
    void login(parsed.data).then(() => { setPassword(""); onSuccess?.(); }).catch((err: unknown) => setLocalError(toUiError(err)));
  }}>
    <ErrorSummary error={localError ?? error} title={t("Feedback.validation")} fields={{ email: "login-email", password: "login-password" }} />
    <Field id="login-email" label={t("Shell.email")} error={fieldError("email")} required>{props => <Input {...props} type="email" autoComplete="username" value={email} readOnly={!!lockedEmail} onChange={event => setEmail(event.target.value)} />}</Field>
    <Field id="login-password" label={t("Shell.password")} error={fieldError("password")} required>{props => <Input {...props} type={passwordType} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />}</Field>
    <Button variant="quiet" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{t(visible ? "Shell.hidePassword" : "Shell.showPassword")}</Button>
    <Button type="submit" pending={loading}>{t("Shell.login")}</Button>
  </form>;
}
