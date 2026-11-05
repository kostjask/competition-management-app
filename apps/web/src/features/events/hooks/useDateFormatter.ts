import type { Locale } from "../../../i18n/locale";
import { useCallback } from "react";
import { formatInstant } from "../../../i18n/format";
type Style = "short" | "medium" | "long";
export const useDateFormatter = (locale: Locale, dateStyle: Style = "long", timeStyle: Style = "short") => useCallback((value: string) => formatInstant(value, locale, dateStyle, timeStyle), [locale, dateStyle, timeStyle]);
