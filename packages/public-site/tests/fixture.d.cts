import type { CmsPublic, CmsPublicPortal, CmsLocale } from "@dance/schemas";
export function fixture(locale?: CmsLocale, kind?: CmsPublic["kind"], fallback?: boolean): CmsPublic;
export function portal(locale?: CmsLocale, fallback?: boolean): CmsPublicPortal;
export const ids: { revision: string; teacher: string; class: string; asset: string };
