import { useEffect, useRef, type RefObject } from "react";
import { Button } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export function Confirmation({ target, effect, busy, onCancel, onConfirm, fallbackFocus }: { target: string; effect: string; busy: boolean; onCancel: () => void; onConfirm: () => void; fallbackFocus: RefObject<HTMLElement | null> }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { const element = ref.current; const previous = document.activeElement; const fallback = fallbackFocus.current; element?.showModal(); cancel.current?.focus();
    return () => { element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); if (document.activeElement !== previous || !previous?.isConnected) fallback?.focus(); }; }, [fallbackFocus]);
  return <dialog ref={ref} className="setup-dialog" aria-labelledby="application-confirm" aria-describedby="application-confirm-effect"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="application-confirm">{target}</h2><p id="application-confirm-effect">{effect}</p>
    <div className="application-actions"><button ref={cancel} type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={onCancel}>{t("Staff.cancel")}</button>
      <Button pending={busy} onClick={onConfirm}>{t("Application.confirm")}</Button></div>
  </dialog>;
}
