import { useId } from "react";
import type { CmsDocument, CmsLocale } from "@dance/schemas";
import { contentTranslations, type ContentKey } from "../../i18n/contentTranslations";

import { type Field, record, fieldLabel, newText } from "./fieldDefinitions";
export function ContentField({ field, value, path, locale, root, document, festivals, onChange, errors = [] }: {
  field: Field; value: unknown; path: string; locale: CmsLocale; root: unknown; document: CmsDocument;
  festivals: { id: string; name: string }[]; onChange: (value: unknown) => void; errors?: string[];
}) {
  const unique = useId(); const id = `cms-${path}`; const parts = path.split("."); const last = parts.at(-1) ?? "";
  const label = fieldLabel(/^\d+$/.test(last) ? parts.at(-2) ?? last : last, locale);
  const t = (key: ContentKey) => contentTranslations[key][locale]; const object = record(value);
  const invalid = errors.some(error => error === path || error.startsWith(path + "."));
  const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
  const help = invalid ? <p className="cms-error" id={`${id}-error`}>{t("fieldInvalid")}</p> : null;
  if (field.type === "array") {
    const rows: unknown[] = Array.isArray(value) ? value : [];
    return <fieldset id={id} className="cms-collection"><legend>{label}</legend>{!rows.length && <p>{t("empty")}</p>}
      {rows.map((row, index) => <section className="cms-item" key={typeof record(row).id === "string" ? String(record(row).id) : index} aria-label={`${label} ${index + 1}`}>
        <h3>{label} {index + 1}</h3>
        <ContentField field={field.item} value={row} path={`${path}.${index}`} locale={locale} root={root} document={document} festivals={festivals} errors={errors} onChange={next => onChange(rows.map((old, i) => i === index ? next : old))} />
        <div className="cms-actions"><button type="button" disabled={index === 0} onClick={() => { const copy = [...rows]; [copy[index-1], copy[index]] = [copy[index], copy[index-1]]; onChange(copy); }}>{t("up")}</button>
          <button type="button" disabled={index === rows.length-1} onClick={() => { const copy = [...rows]; [copy[index+1], copy[index]] = [copy[index], copy[index+1]]; onChange(copy); }}>{t("down")}</button>
          <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))}>{t("remove")}</button></div>
      </section>)}<button type="button" disabled={rows.length >= field.max} onClick={() => onChange([...rows, field.initial()])}>{t("add")} {label}</button>{help}</fieldset>;
  }
  if (field.type === "object") {
    if (field.optional && value === null) return <div id={id} className="cms-field"><span>{label}</span><button type="button" onClick={() => onChange({ assetId: "", decorative: false, alt: null })}>{t("add")} {label}</button>{help}</div>;
    return <fieldset id={id} className="cms-group"><legend>{label}</legend>{Object.entries(field.fields).map(([key, item]) => <ContentField key={key} field={item} value={object[key]} path={`${path}.${key}`} locale={locale} root={root} document={document} festivals={festivals} errors={errors} onChange={next => onChange({ ...object, [key]: next })} />)}
      {field.optional && <button type="button" onClick={() => onChange(null)}>{t("clear")} {label}</button>}{help}</fieldset>;
  }
  if (field.type === "authored") {
    if (value === null || value === undefined) return <div id={id} className="cms-field"><span>{label}</span><button type="button" onClick={() => onChange({ ...newText(), sourceLocale: record(root).primaryLocale === "en" ? "en" : record(root).primaryLocale === "ru" ? "ru" : "et" })}>{t("add")} {label}</button>{help}</div>;
    const source = object.sourceLocale === "en" ? "en" : object.sourceLocale === "ru" ? "ru" : "et"; const translations = record(object.translations);
    return <fieldset id={id} className="cms-prose"><legend>{label}</legend>
      <label htmlFor={`${unique}-source`}>{t("sourceLocale")}</label><select id={`${unique}-source`} value={source} onChange={event => { const nextTranslations = { ...translations }; delete nextTranslations[event.target.value]; onChange({ ...object, sourceLocale: event.target.value, translations: nextTranslations }); }}>{["et", "en", "ru"].map(lang => <option key={lang}>{lang}</option>)}</select>
      <label htmlFor={`${id}-sourceText`}>{t("sourceText")} ({source})</label><textarea id={`${id}-sourceText`} lang={source} value={typeof object.sourceText === "string" ? object.sourceText : ""} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} onChange={event => onChange({ ...object, sourceText: event.target.value })} />
      <details><summary>{t("translation")}</summary>{(["et", "en", "ru"] as const).filter(lang => lang !== source).map(lang => <div className="cms-field" key={lang}><label htmlFor={`${id}-${lang}`}>{t("translation")} ({lang})</label><textarea id={`${id}-${lang}`} lang={lang} value={typeof translations[lang] === "string" ? translations[lang] : ""} onChange={event => { const next = { ...translations }; if (event.target.value.trim()) next[lang] = event.target.value; else delete next[lang]; onChange({ ...object, translations: next }); }} /></div>)}</details>
      {field.optional && <button type="button" onClick={() => onChange(null)}>{t("clear")} {label}</button>}{help}</fieldset>;
  }
  let options: { id: string; label: string }[] = (field.options ?? []).map(key => ({ id: key, label: fieldLabel(key, locale) }));
  if (field.source === "assets") options = document.assets.filter(row => !row.retired && row.rights !== "REVOKED").map(row => ({ id: row.id, label: `${row.width} × ${row.height} / ${row.id.slice(0,8)}` }));
  if (field.source === "festivals") options = festivals.map(row => ({ id: row.id, label: row.name }));
  if (field.source === "teachers" || field.source === "classes") {
    const source = record(root)[field.source]; options = (Array.isArray(source) ? source : []).map(row => ({ id: String(record(row).id ?? ""), label: String(record(row).name ?? record(record(row).title).sourceText ?? "") }));
  }
  return <div className="cms-field" id={field.type === "boolean" ? undefined : `${id}-wrap`}><label htmlFor={id}>{label}</label>
    {field.type === "boolean" ? <input id={id} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} />
      : field.type === "select" || field.type === "multi" ? <select id={id} multiple={field.type === "multi"} value={field.type === "multi" ? (Array.isArray(value) ? value.filter((row): row is string => typeof row === "string") : []) : typeof value === "string" ? value : ""} aria-invalid={invalid} onChange={event => onChange(field.type === "multi" ? Array.from(event.target.selectedOptions, row => row.value) : event.target.value)}>
        {field.type !== "multi" && <option value="">{t("none")}</option>}{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
        : <input id={id} type={inputType} value={typeof value === "number" || typeof value === "string" ? value : ""} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} onChange={event => onChange(event.target.value === "" && field.optional ? null : field.type === "number" ? Number(event.target.value) : event.target.value)} />}{help}</div>;
}

export function HandoffField({ value, locale, onChange }: { value: unknown; locale: CmsLocale; onChange: (value: unknown) => void }) {
  const object = record(value); const t = (key: ContentKey) => contentTranslations[key][locale];
  return <fieldset id="cms-handoff"><legend>{t("handoff")}</legend><label htmlFor="cms-handoff-kind">{t("kind")}</label>
    <select id="cms-handoff-kind" value={String(object.kind)} onChange={event => onChange(event.target.value === "external" ? { kind: "external", url: "", availableFrom: "", availableUntil: "", reviewed: false } : { kind: event.target.value })}>
      {(["contact", "external", "internal"] as const).map(kind => <option key={kind} value={kind}>{t(kind)}</option>)}</select>
    {object.kind === "external" && <>{(["url", "availableFrom", "availableUntil"] as const).map(key => <div className="cms-field" key={key}><label htmlFor={`cms-handoff-${key}`}>{t(key)}</label><input id={`cms-handoff-${key}`} value={typeof object[key] === "string" ? object[key] : ""} onChange={event => onChange({ ...object, [key]: event.target.value })} /></div>)}
      <label><input type="checkbox" checked={object.reviewed === true} onChange={event => onChange({ ...object, reviewed: event.target.checked })} />{t("reviewed")}</label></>}
    {object.kind === "internal" && <p>{t("internalDisabled")}</p>}</fieldset>;
}
