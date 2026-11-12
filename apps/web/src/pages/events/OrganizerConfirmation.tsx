import { useRef, useEffect } from "react";
import { Button } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";
export function OrganizerConfirmation({
  title,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="organizer ui-panel"
      ref={ref}
      aria-labelledby="organizer-confirm"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="organizer-confirm">{title}</h2>
      {children}
      <div className="ui-actions">
        <button autoFocus className="ui-button ui-button-secondary" onClick={onCancel}>
          {t("Common.cancel")}
        </button>
        <Button onClick={onConfirm}>{t("Events.saveChanges")}</Button>
      </div>
    </dialog>
  );
}
