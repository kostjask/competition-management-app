import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { PreferenceDisclosure } from "./PreferenceDisclosure";

const preferences = ["auto", "day", "night", "system"] as const;
type AppearancePreference = typeof preferences[number];

declare global {
  interface Window {
    workspaceAppearance?: {
      sync: () => void;
      getPreference: () => AppearancePreference;
      setPreference: (value: AppearancePreference) => void;
    };
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("workspace-appearance", callback);
  return () => window.removeEventListener("workspace-appearance", callback);
}

export function WorkspaceAppearance({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  useLayoutEffect(() => { window.workspaceAppearance?.sync(); }, [pathname, search]);
  return children;
}

export function AppearanceSelector() {
  const { t } = useTranslation();
  const value = useSyncExternalStore(subscribe, () => window.workspaceAppearance?.getPreference() ?? "auto", () => "auto");
  return <PreferenceDisclosure id="workspace-appearance" label={t("Shell.appearance")}
    choices={preferences.map(preference => ({
      id: preference,
      label: t(`Shell.${preference}`),
      description: preference === "auto" ? t("Shell.venueAppearanceHelp")
        : preference === "system" ? t("Shell.systemAppearanceHelp") : undefined,
      selected: value === preference,
      choose: () => window.workspaceAppearance?.setPreference(preference),
    }))} />;
}
