import { type Locale } from "@i18n/LanguageContext";
import {useCallback} from "react";
type Style = "short" | "medium" | "long";

export const useDateFormatter = (locale: Locale, dateStyle: Style = "long", timeStyle: Style = "short") => {
  return useCallback(
    (value: string): string => {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return value; // Return original string if date is invalid
        }
        return new Intl.DateTimeFormat(locale, {
          dateStyle,
          timeStyle,
        }).format(date);
      } catch {
        return value; // Return original string if formatting fails
      }
    },
    [locale, dateStyle, timeStyle],
  );
};