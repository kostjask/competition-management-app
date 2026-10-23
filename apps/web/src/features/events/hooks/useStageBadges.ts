import { useMemo } from "react";
import { type Event } from "@api/events";
import { getTranslation } from "@i18n/translations";
import { type Locale } from "@i18n/LanguageContext";

export type StageBadge = {
  label: string;
  className: string;
};

export const useStageBadges = (
  locale: Locale,
): Record<Event["stage"], StageBadge> => {
  return useMemo(
    () => ({
      PRE_REGISTRATION: {
        label: getTranslation("Events.stagePreRegistration", locale),
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      },
      REGISTRATION_OPEN: {
        label: getTranslation("Events.stageRegistrationOpen", locale),
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      },
      DATA_REVIEW: {
        label: getTranslation("Events.stageDataReview", locale),
        className: "bg-sky-100 text-sky-700 border border-sky-200",
      },
      FINALIZED: {
        label: getTranslation("Events.stageFinalized", locale),
        className: "bg-emerald-200 text-emerald-700 border border-emerald-300",
      },
      ENDED: {
        label: getTranslation("Events.stageEnded", locale),
        className: "bg-gray-200 text-gray-700 border border-gray-300",
      },
      CANCELLED: {
        label: getTranslation("Events.stageCancelled", locale),
        className: "bg-gray-200 text-gray-700 border border-gray-300",
      },
    }),
    [locale],
  );
};