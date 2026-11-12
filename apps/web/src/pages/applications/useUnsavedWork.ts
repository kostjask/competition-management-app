import { useEffect } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { getTranslation } from "../../i18n/translations";
export function useUnsavedWork(dirty: boolean) {
  const { locale } = useTranslation();
  useEffect(() => {
    if (!dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const preventNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href);
      // Field-summary and in-page links move focus without leaving this editor.
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return;
      if (!window.confirm(getTranslation("Application.leave", locale))) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", preventUnload);
    document.addEventListener("click", preventNavigation, true);
    return () => { window.removeEventListener("beforeunload", preventUnload); document.removeEventListener("click", preventNavigation, true); };
  }, [dirty, locale]);
}
