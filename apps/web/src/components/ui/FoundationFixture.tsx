import { useState } from "react";
import { RegisterSchema } from "@dance/schemas";
import { toUiError, type UiError } from "../../api/error";
import { useLanguage } from "../../i18n/useLanguage";
import { formatIssue } from "../../i18n/errors";
import { LanguageSelector } from "../LanguageSelector";
import { Alert, Button, EmptyState, ErrorSummary, Field, Input, LoadingState, StatusBadge } from "./Foundation";
import { fixtureCopy } from "./fixtureCopy";

export default function FoundationFixture() {
  const { locale } = useLanguage(); const text = fixtureCopy[locale];
  const [name, setName] = useState(""); const [error, setError] = useState<UiError | null>(null);
  const [saved, setSaved] = useState(false);
  const issue = error?.issues.find(item => item.path[0] === "name");
  return <main className="ui-fixture" lang={locale}>
    <LanguageSelector /><h1>{text.title}</h1><p>{text.note}</p>
    <div className="ui-fixture-grid"><section className="ui-panel"><h2>{text.form}</h2>
      <form noValidate onSubmit={event => {
        event.preventDefault(); setSaved(false);
        const parsed = RegisterSchema.pick({ name: true }).safeParse({ name });
        if (!parsed.success) setError(toUiError(parsed.error));
        else { setError(null); setSaved(true); }
      }}>
        <ErrorSummary error={error} title={text.error} fields={{ name: "fixture-name" }} />
        <Field id="fixture-name" label={text.name} hint={text.hint} required error={issue ? formatIssue(issue, locale) : undefined}>
          {attributes => <Input {...attributes} value={name} onChange={event => setName(event.target.value)} autoComplete="organization" />}
        </Field>
        <div className="ui-actions"><Button type="submit">{text.save}</Button><Button variant="secondary" onClick={() => { setName(""); setError(null); setSaved(false); }}>{text.cancel}</Button></div>
        {saved && <Alert tone="success">{text.saved}</Alert>}
      </form>
      <p id="fixture-disabled">{text.disabled}</p><Button disabled aria-describedby="fixture-disabled">{text.submit}</Button>
      <div className="ui-actions"><Button variant="danger">{text.remove}</Button><Button variant="quiet">{text.quiet}</Button><Button pending>{text.busy}</Button></div>
    </section><section className="ui-panel"><h2>{text.states}</h2>
      <Alert announce={false}>{text.accepted}</Alert><Alert tone="danger" announce={false}>{text.failed}</Alert>
      <div className="ui-actions"><StatusBadge tone="warning">{text.pending}</StatusBadge><StatusBadge tone="success">{text.approved}</StatusBadge><StatusBadge>{text.locked}</StatusBadge><StatusBadge tone="danger">{text.rejected}</StatusBadge></div>
      <LoadingState label={text.loading} /><EmptyState title={text.empty} description={text.emptyText} />
    </section></div>
  </main>;
}
