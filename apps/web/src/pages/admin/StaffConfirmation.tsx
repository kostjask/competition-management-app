import { useEffect, useRef } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Button } from "../../components/ui/Foundation";

export function StaffConfirmation({ kind, target, busy, onCancel, onConfirm }: {
  kind: "remove" | "revoke"; target: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal(); cancel.current?.focus();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="staff-confirm-title" aria-describedby="staff-confirm-target staff-confirm-effect"
    className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl border border-slate-300 p-5 backdrop:bg-slate-900/50"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (!first) event.preventDefault();
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
    <h2 id="staff-confirm-title" className="text-xl font-semibold">{t(kind === "remove" ? "Staff.remove" : "Flow.revoke")}</h2>
    <p id="staff-confirm-target" className="my-4 [overflow-wrap:anywhere]">{target}</p>
    <p id="staff-confirm-effect">{t(kind === "remove" ? "Staff.removeEffect" : "Staff.revokeEffect")}</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button ref={cancel} type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={onCancel}>{t("Staff.cancel")}</button>
      <Button variant="danger" pending={busy} onClick={onConfirm}>{t(kind === "remove" ? "Staff.remove" : "Flow.revoke")}</Button>
    </div>
  </dialog>;
}
