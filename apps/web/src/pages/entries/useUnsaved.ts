import { useBeforeUnload, useBlocker } from "react-router-dom";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "../../i18n/useTranslation";

export function useUnsaved(dirty: boolean) {
  const { t } = useTranslation();
  const permitted = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !permitted.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm(t("Roster.discard"))) blocker.proceed(); else blocker.reset();
    }
  }, [blocker, t]);
  useBeforeUnload(useCallback(event => { if (dirty && !permitted.current) { event.preventDefault(); event.returnValue = ""; } }, [dirty]));
  return () => { permitted.current = true; };
}
