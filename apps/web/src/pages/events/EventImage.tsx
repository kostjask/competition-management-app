import { useEffect, useState } from "react";
import { downloadImage, uploadEventImage } from "../../api/images";
import { toUiError, type UiError } from "../../api/error";
import { Button, Field, ErrorSummary, Alert } from "../../components/ui/Foundation";
import { useTranslation } from "../../i18n/useTranslation";

export function EventImage({
  id,
  url,
  editable = false,
  onSaved,
}: {
  id: string;
  url: string | null;
  editable?: boolean;
  onSaved?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    if (url)
      downloadImage(url)
        .then((blob) => {
          if (active) {
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          }
        })
        .catch((e) => {
          if (active) setError(toUiError(e));
        });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return (
    <section>
      {src && (
        <img
          className="max-h-80 max-w-full object-contain"
          src={src}
          alt={t("Common.eventPhoto")}
        />
      )}
      <ErrorSummary error={error} title={t("Common.eventPhoto")} />
      {editable && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file || busy || uncertain) return;
            setBusy(true);
            setError(null);
            try {
              await uploadEventImage(id, file);
              await onSaved?.();
              setFile(null);
            } catch (err) {
              setError(toUiError(err));
              setUncertain(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field id="event-image" label={t("Common.eventPhoto")} hint={t("Organizer.imageHelp")}>
            {(attrs) => (
              <input
                {...attrs}
                className="ui-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            )}
          </Field>
          <Button type="submit" disabled={!file || uncertain} pending={busy}>
            {t("Organizer.saveImage")}
          </Button>
          {uncertain && (
            <Alert tone="warning">
              {t("Organizer.stale")}
              <Button
                variant="secondary"
                onClick={async () => {
                  await onSaved?.();
                  setUncertain(false);
                }}
              >
                {t("Organizer.refresh")}
              </Button>
            </Alert>
          )}
        </form>
      )}
    </section>
  );
}
