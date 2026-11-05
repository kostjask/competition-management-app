import { useParams } from "react-router-dom";
import { RequireRole } from "./RequireRole";
import { RoleGate } from "./RoleGate";
import { useTranslation } from "../i18n/useTranslation";
import { useState } from "react";
import { useAuth } from "./useAuth";
import { Field, Input } from "../components/ui/Foundation";

// Development-only scoped guard fixture. Authentication uses the normal provider.
export default function AccessFixture() {
  const { eventId } = useParams();
  const { t, locale } = useTranslation();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  return <RequireRole role="judge" eventId={eventId}>
    <main lang={locale} className="p-6">
      <h1>{t("Access.allowed")}</h1>
      <Field id="recovery-fixture-name" label={t("Shell.name")}>{props => <Input {...props} value={name} onChange={event => setName(event.target.value)} />}</Field>
      <RoleGate roles={["judge"]} requireAuth permissions={["score.submit"]} eventId={eventId} fallback={<p>{t("Access.denied")}</p>}>
        <button type="button" onClick={() => { void refreshUser().catch(() => {}); }}>{t("Access.allowed")}</button>
      </RoleGate>
    </main>
  </RequireRole>;
}
