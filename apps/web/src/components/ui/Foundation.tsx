import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import type { UiError } from "../../api/error";
import { ErrorFeedback } from "../ErrorFeedback";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
export function Button({ variant = "primary", pending = false, className = "", disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; pending?: boolean }) {
  return <button type="button" {...props} disabled={disabled || pending} aria-busy={pending || undefined}
    className={`ui-button ui-button-${variant} ${className}`} />;
}
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input ${className}`} />;
}
export function Field({ id, label, hint, error, required = false, children }: {
  id: string; label: string; hint?: string; error?: string; required?: boolean;
  children: (attributes: { id: string; required: boolean; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div className="ui-field"><label htmlFor={id}>{label}</label>
    {hint && <p className="ui-help" id={`${id}-hint`}>{hint}</p>}
    {children({ id, required, "aria-invalid": !!error, "aria-describedby": describedBy })}
    {error && <p className="ui-field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}
export function ErrorSummary({ error, title, fields }: { error: UiError | null; title: string; fields?: Record<string, string> }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) root.current?.focus(); }, [error]);
  if (!error) return null;
  return <div ref={root} tabIndex={-1} className="ui-alert ui-tone-danger ui-error-summary">
    <h2>{title}</h2><ErrorFeedback error={error} fields={fields} />
  </div>;
}
export function Alert({ tone = "info", announce = true, children }: { tone?: Tone; announce?: boolean; children: ReactNode }) {
  const role = announce ? (tone === "danger" ? "alert" : "status") : undefined;
  return <div className={`ui-alert ui-tone-${tone}`} role={role}>{children}</div>;
}
export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ui-badge ui-tone-${tone}`}>{children}</span>;
}
export function LoadingState({ label }: { label: string }) {
  return <div className="ui-state" role="status" aria-busy="true"><span className="ui-loading-mark" aria-hidden="true" />{label}</div>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="ui-state"><h2>{title}</h2><p>{description}</p>{action}</section>;
}
