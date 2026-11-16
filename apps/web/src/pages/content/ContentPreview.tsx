import { useEffect, useState } from "react";
import type { CmsPublic, CmsLocale } from "@dance/schemas";
import { apiClient } from "../../api/client";
import { contentTranslations } from "../../i18n/contentTranslations";
function PreviewImage({ item }: { item: CmsPublic["images"][number] }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true; let objectUrl: string | undefined;
    void apiClient.contentImage(item.image.url.replace(/^\/api\/v1/, "")).then(blob => { if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.image.url]);
  return url ? <img src={url} width={item.image.width} height={item.image.height} alt={item.image.decorative ? "" : item.image.alt?.text ?? ""} lang={item.image.alt?.lang} /> : null;
}
export function ContentPreview({ content, locale }: { content: CmsPublic; locale: CmsLocale }) {
  return <article className="cms-preview" lang={content.requestedLocale}>
    <p>{contentTranslations.previewNotice[locale]}</p>{content.policyChanged && <p role="status">{contentTranslations.policyChanged[locale]}</p>}
    {content.fields.filter(row => row.path !== "metadata").map(row => <section key={row.path}>{row.path === "title" ? <h2 lang={row.value.lang}>{row.value.text}</h2> : <p lang={row.value.lang}>{row.value.text}</p>}{row.value.fallback && <p className="cms-help">{contentTranslations.fallback[locale]}</p>}</section>)}
    {content.profiles.map(row => <p key={row.id}>{row.name}</p>)}{content.images.map(item => <PreviewImage key={item.path} item={item} />)}
    {content.timetable.map((row, index) => <p key={index}>{row.weekday}: {row.start} / {row.end}, {row.timeZone}, {row.location}</p>)}
    {content.links.map(row => <p key={row.path}><a href={row.url} lang={row.title.lang} target="_blank" rel="noopener noreferrer">{row.title.text}</a>{row.title.fallback && <span> {contentTranslations.fallback[locale]}</span>}</p>)}
    {content.action.kind === "external" ? <a href={content.action.url} rel="noopener noreferrer" target="_blank">{contentTranslations.external[locale]}</a> : <address>{content.action.email && <a href={`mailto:${encodeURIComponent(content.action.email)}`}>{content.action.email}</a>} {content.action.phone && <a href={`tel:${content.action.phone.replace(/[ ()-]/g, "")}`}>{content.action.phone}</a>}</address>}
  </article>;
}
