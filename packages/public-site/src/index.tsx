import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { CmsPublicSchema, CmsPublicPortalSchema, type CmsPublic, type CmsPublicPortal, type CmsLocale } from "@dance/schemas";
import { publicCopy, languageNames, publicName } from "./copy";
import { studioSections, editionSections, publicPath, type PublicRoute, type PublicOrigins, type PublicSection } from "./routes";
export * from "./routes";
export { publicCopy } from "./copy";
export type PublicData = CmsPublic | CmsPublicPortal;
type Resolved = CmsPublic["fields"][number]["value"];
export const publicLocales: CmsLocale[] = ["et", "en", "ru"];
const contentOf = (data: PublicData) => "content" in data ? data.content : data;
const field = (content: CmsPublic, path: string) => content.fields.find(row => row.path === path)?.value;

function includedPath(path: string, route: PublicRoute) {
  if (["title", "introduction", "metadata"].includes(path)) return true;
  if (route.section === "home") return route.surface === "festival" ? path.startsWith("festivals.") || path === "brand.artwork" || (route.editionSlug ? path === "location" : path.startsWith("contact.")) : ["about", "joining"].includes(path) || path.startsWith("media.");
  const prefix = route.section === "join" ? "joining" : route.section;
  return path === prefix || path.startsWith(`${prefix}.`) || (["registration", "join"].includes(route.section) && path.startsWith("contact."));
}
function prose(data: PublicData, route: PublicRoute): Resolved[] {
  const content = contentOf(data);
  const values = content.fields.filter(row => includedPath(row.path, route) && !("editions" in data && row.path.startsWith("festivals."))).map(row => row.value);
  for (const row of content.links) if (includedPath(row.path, route)) values.push(row.title);
  for (const row of content.images) if (includedPath(row.path, route) && row.image.alt) values.push(row.image.alt);
  if ("editions" in data && route.section === "home") {
    for (const edition of data.editions) if ((!route.festivalSlug || edition.festivalSlug === route.festivalSlug) && edition.title) values.push(edition.title);
    for (const festival of data.festivals) if ((!route.festivalSlug || festival.slug === route.festivalSlug) && festival.summary) values.push(festival.summary);
  }
  // Timetable labels come from class titles, not raw identifiers.
  if (route.section === "timetable" || (route.surface === "studio" && route.section === "home" && content.timetable.length)) {
    const displayed = route.section === "timetable" ? content.timetable : [...content.timetable].sort((a,b)=>a.weekday-b.weekday || a.start.localeCompare(b.start)).slice(0,3);
    const classIds = new Set(displayed.map(row=>row.classId));
    for (const row of content.fields) if ([...classIds].some(id=>row.path===`classes.${id}.title`)) values.push(row.value);
  }
  return values;
}
export function publicMetadata(data: PublicData, route: PublicRoute, variants: Partial<Record<CmsLocale, PublicData>>, origins: PublicOrigins) {
  const content = contentOf(data); const values = prose(data, route);
  const actual = values.length && values.every(row => row.lang === content.primaryLocale) ? content.primaryLocale : route.locale;
  const canonical = origins[route.surface] + publicPath(route, actual);
  const alternates = publicLocales.filter(locale => {
    const variant = variants[locale]; if (!variant) return false;
    const texts = prose(variant, { ...route, locale });
    return texts.length > 0 && texts.every(row => row.lang === locale && !row.fallback);
  }).map(locale => ({ locale, url: origins[route.surface] + publicPath(route, locale) }));
  return { canonical, actual, alternates, title: field(content, "title"), description: field(content, "metadata") };
}
function Text({ value, locale, heading = false }: { value: Resolved | undefined; locale: CmsLocale; heading?: boolean }) {
  if (!value) return null;
  const text = heading ? <h2 lang={value.lang}>{value.text}</h2> : <p lang={value.lang} className="prose">{value.text}</p>;
  return <>{value.fallback && <small className="fallback">{publicCopy[locale].fallback} <span lang={value.lang}>{languageNames[value.lang]}</span></small>}{text}</>;
}
function publicImage(content: CmsPublic, path: string) {
  const image = content.images.find(row => row.path === path)?.image;
  // Preview paths and arbitrary URL schemes cannot reach a public HTML sink.
  if (image && image.url === `/api/v1/public/assets/${image.id}`) return image;
}
function Image({ content, path, eager = false, className }: { content: CmsPublic; path: string; eager?: boolean; className?: string }) {
  const image = publicImage(content, path);
  if (!image) return null;
  return <figure className={className}><img src={image.url} width={image.width} height={image.height} alt={image.decorative ? "" : image.alt?.text ?? ""} lang={image.alt?.lang} loading={eager ? "eager" : "lazy"} />{image.alt?.fallback && <figcaption className="fallback">{publicCopy[content.requestedLocale].fallback} {languageNames[image.alt.lang]}</figcaption>}</figure>;
}
function Contact({ content, locale }: { content: CmsPublic; locale: CmsLocale }) {
  const copy = publicCopy[locale];
  const { email, phone } = content.contact;
  return <><address>{email && <p><span>{copy.email}</span><a href={`mailto:${encodeURIComponent(email)}`}>{email}</a></p>}{phone && <p><span>{copy.phone}</span><a href={`tel:${phone.replace(/[ ()-]/g, "")}`}>{phone}</a></p>}</address><Text value={field(content, "contact.address")} locale={locale} />
    <ul className="link-list">{content.links.filter(row => row.path.startsWith("contact.")).map(row => <li key={row.path}><a href={row.url} lang={row.title.lang} rel="noopener noreferrer">{row.title.text}</a>{row.title.fallback && <small className="fallback">{copy.fallback} {languageNames[row.title.lang]}</small>}</li>)}</ul>{!email && !phone && !field(content, "contact.address") && <p>{copy.empty}</p>}</>;
}
const date = (value: string, locale: CmsLocale) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const instant = (value: string, locale: CmsLocale, timeZone: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(value));
function Dates({ content, locale }: { content: CmsPublic; locale: CmsLocale }) {
  const copy = publicCopy[locale];
  return <dl className="facts"><div><dt>{copy.dates}</dt><dd>{content.facts ? <><time dateTime={content.facts.startsAt}>{instant(content.facts.startsAt, locale, content.facts.timeZone)}</time><span> / </span><time dateTime={content.facts.endsAt}>{instant(content.facts.endsAt, locale, content.facts.timeZone)}</time><p>{content.facts.timeZone}</p></> : content.startsOn ? <><time dateTime={content.startsOn}>{date(content.startsOn, locale)}</time>{content.endsOn && <> / <time dateTime={content.endsOn}>{date(content.endsOn, locale)}</time></>}</> : copy.dateUnknown}</dd></div>
    {content.facts?.venue && <div><dt>{copy.address}</dt><dd>{content.facts.venue}</dd></div>}{content.facts?.registrationDeadline && <div><dt>{copy.deadline}</dt><dd><time dateTime={content.facts.registrationDeadline}>{instant(content.facts.registrationDeadline, locale, content.facts.timeZone)}</time></dd></div>}</dl>;
}
function Profiles({ content, locale, kind }: { content: CmsPublic; locale: CmsLocale; kind: "teachers" | "judges" }) {
  return content.profiles.length ? <div className="profiles">{content.profiles.map(profile => <article id={profile.id} key={profile.id} className="profile"><Image content={content} path={`${kind}.${profile.id}.portrait`} /><div><h2>{profile.name}</h2><Text value={field(content, `${kind}.${profile.id}.biography`)} locale={locale} /></div></article>)}</div> : <p>{publicCopy[locale].empty}</p>;
}
function Studio({ content, route }: { content: CmsPublic; route: PublicRoute }) {
  const locale = route.locale; const copy = publicCopy[locale];
  switch (route.section) {
    case "home": return <><section className="statement"><h2>{copy.about}</h2><Text value={field(content, "about")} locale={locale} /></section><section className="directory"><h2>{copy.classes}</h2><a href={publicPath(route, locale, "classes")}>{copy.classes}</a><a href={publicPath(route, locale, "timetable")}>{copy.timetable}</a><a href={publicPath(route, locale, "teachers")}>{copy.teachers}</a></section><section className="join-band"><h2>{copy.join}</h2><Text value={field(content, "joining")} locale={locale} /><a className="primary" href={publicPath(route, locale, "contact")}>{copy.contactAction}</a></section>{content.images.some(row => row.path.startsWith("media.")) && <section><h2>{copy.media}</h2><Image content={content} path={content.images.find(row => row.path.startsWith("media."))!.path} eager /></section>}</>;
    case "about": return field(content, "about") ? <Text value={field(content, "about")} locale={locale} /> : <p>{copy.empty}</p>;
    case "teachers": return <Profiles content={content} locale={locale} kind="teachers" />;
    case "classes": return content.classes.length ? <div className="class-list">{content.classes.map(row => <article key={row.id} id={row.id}><Text value={field(content, `classes.${row.id}.title`)} locale={locale} heading /><Text value={field(content, `classes.${row.id}.style`)} locale={locale} /><Text value={field(content, `classes.${row.id}.ages`)} locale={locale} />{row.teacherIds.length > 0 && <p>{copy.teachersForClass}: {row.teacherIds.map(id => <a key={id} href={`${publicPath(route, locale, "teachers")}#${id}`}>{content.profiles.find(profile => profile.id === id)?.name}</a>)}</p>}<Text value={field(content, `classes.${row.id}.joining`)} locale={locale} /></article>)}</div> : <p>{copy.empty}</p>;
    case "timetable": return content.timetable.length ? <div className="schedule">{[...content.timetable].sort((a,b) => a.weekday-b.weekday || a.start.localeCompare(b.start)).map((row,index) => <article key={index}><h2>{new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026,0,4+row.weekday)))}</h2><p className="slot-time"><time>{row.start}</time> / <time>{row.end}</time></p><a href={`${publicPath(route, locale, "classes")}#${row.classId}`}><span lang={field(content, `classes.${row.classId}.title`)?.lang}>{field(content, `classes.${row.classId}.title`)?.text ?? copy.classForSlot}</span></a>{field(content, `classes.${row.classId}.title`)?.fallback && <small className="fallback">{copy.fallback} {languageNames[field(content, `classes.${row.classId}.title`)!.lang]}</small>}<p>{row.location}</p><p>{copy.timezone}: {row.timeZone}</p>{(row.validFrom || row.validUntil) && <p>{copy.valid}: {row.validFrom && <>{copy.from} <time dateTime={row.validFrom}>{date(row.validFrom,locale)}</time> </>}{row.validUntil && <>{copy.until} <time dateTime={row.validUntil}>{date(row.validUntil,locale)}</time></>}</p>}</article>)}</div> : <p>{copy.empty}</p>;
    case "join": return <><Text value={field(content, "joining")} locale={locale} /><Contact content={content} locale={locale} /></>;
    case "contact": return <Contact content={content} locale={locale} />;
    case "media": return content.images.filter(row => row.path.startsWith("media.")).length ? <div className="gallery">{content.images.filter(row => row.path.startsWith("media.")).map(row => <Image key={row.path} content={content} path={row.path} />)}</div> : <p>{copy.empty}</p>;
    default: return <p>{copy.empty}</p>;
  }
}
function Edition({ content, route }: { content: CmsPublic; route: PublicRoute }) {
  const locale = route.locale; const copy = publicCopy[locale];
  switch (route.section) {
    case "home": return <><Dates content={content} locale={locale} /><Text value={field(content, "location")} locale={locale} /><div className="directory">{editionSections.filter(value => value !== "contact").map(section => <a key={section} href={publicPath(route,locale,section)}>{copy[section]}</a>)}</div></>;
    case "rules": { const headings = content.fields.filter(row => /^rules\.[^.]+\.heading$/.test(row.path)); return headings.length ? headings.map(row => { const prefix = row.path.replace(/heading$/, ""); return <section key={row.path}><Text value={row.value} locale={locale} heading />{content.fields.filter(paragraph => paragraph.path.startsWith(prefix) && paragraph.path !== row.path).map(paragraph => <Text key={paragraph.path} value={paragraph.value} locale={locale} />)}</section>; }) : <p>{copy.empty}</p>; }
    case "judges": return <Profiles content={content} locale={locale} kind="judges" />;
    case "registration": return <><Dates content={content} locale={locale} />{content.action.kind === "external" ? <a className="primary" href={content.action.url} rel="noopener noreferrer">{copy.externalAction}</a> : <p>{copy.contactRegistration}</p>}<Contact content={content} locale={locale} /></>;
    case "results": { const results = content.links.filter(row => row.result); return results.length ? <ul className="results">{results.map(row => <li key={row.path}><a href={row.url} lang={row.title.lang} rel="noopener noreferrer">{row.title.text}</a>{row.title.fallback && <small className="fallback">{copy.fallback} {languageNames[row.title.lang]}</small>}<p>{row.result!.editionLabel}</p><time dateTime={row.result!.date}>{date(row.result!.date,locale)}</time><p>{copy.resultLanguage}: <span lang={row.result!.locale}>{languageNames[row.result!.locale]}</span></p></li>)}</ul> : <p>{copy.empty}</p>; }
    case "contact": return <Contact content={content} locale={locale} />;
    default: return <p>{copy.empty}</p>;
  }
}
function Portal({ data, route }: { data: CmsPublicPortal; route: PublicRoute }) {
  const copy = publicCopy[route.locale]; const editions = data.editions.filter(row => !route.festivalSlug || row.festivalSlug === route.festivalSlug);
  return <>{route.festivalSlug ? <Text value={data.festivals.find(row=>row.slug===route.festivalSlug)?.summary ?? undefined} locale={route.locale} /> : data.festivals.length > 0 && <ul className="festival-list">{data.festivals.map(row => <li key={row.slug}><h2><a href={`/${route.locale}/festivals/${row.slug}`}>{row.name}</a></h2><Text value={row.summary ?? undefined} locale={route.locale} /></li>)}</ul>}{editions.length ? (["upcoming", "past", "undated"] as const).map(period => {
    const group = editions.filter(row => row.period === period).sort((a,b)=>period==="upcoming" ? (a.startsOn??"").localeCompare(b.startsOn??"") : (b.startsOn??"").localeCompare(a.startsOn??"")); if (!group.length) return null;
    return <section key={period}><h2>{copy[period]}</h2><ol className="edition-list">{group.map(row => <li key={`${row.festivalSlug}/${row.editionSlug}`}><a href={`/${route.locale}/festivals/${row.festivalSlug}/${row.editionSlug}`} lang={row.title?.lang}>{row.title?.text ?? row.editionSlug}</a>{row.title?.fallback && <small className="fallback">{copy.fallback} {languageNames[row.title.lang]}</small>}{row.startsOn && <time dateTime={row.startsOn}>{date(row.startsOn,route.locale)}</time>}</li>)}</ol></section>;
  }) : <p>{copy.empty}</p>}<section id="contact"><h2>{copy.contact}</h2><Contact content={data.content} locale={route.locale} /></section></>;
}
function OpeningLedger({ data, route }: { data: PublicData; route: PublicRoute }) {
  const copy=publicCopy[route.locale];
  if (route.surface === "studio" && !("content" in data) && data.timetable.length) {
    const slots=[...data.timetable].sort((a,b)=>a.weekday-b.weekday || a.start.localeCompare(b.start)).slice(0,3);
    return <aside className="opening-ledger" aria-label={copy.timetable}><h2>{copy.timetable}</h2><ul>{slots.map((slot,index)=>{
      const title=field(data,`classes.${slot.classId}.title`);
      return <li key={index}><a href={`${publicPath(route,route.locale,"timetable")}`} lang={title?.lang}>{title?.text ?? copy.classForSlot}</a><p>{new Intl.DateTimeFormat(route.locale,{weekday:"long",timeZone:"UTC"}).format(new Date(Date.UTC(2026,0,4+slot.weekday)))} <time>{slot.start}</time> / <time>{slot.end}</time></p><small>{slot.timeZone}</small>{title?.fallback && <small className="fallback">{copy.fallback} {languageNames[title.lang]}</small>}</li>;
    })}</ul></aside>;
  }
  if ("editions" in data && data.editions.length) {
    const matching=data.editions.filter(row=>!route.festivalSlug || row.festivalSlug===route.festivalSlug);
    const upcoming=matching.filter(row=>row.period==="upcoming").sort((a,b)=>(a.startsOn??"").localeCompare(b.startsOn??"")); const group=(upcoming.length?upcoming:matching).slice(0,3);
    if (!group.length) return null;
    return <aside className="opening-ledger" aria-label={copy.editions}><h2>{upcoming.length?copy.upcoming:copy.editions}</h2><ul>{group.map(row=><li key={`${row.festivalSlug}/${row.editionSlug}`}><a href={`/${route.locale}/festivals/${row.festivalSlug}/${row.editionSlug}`} lang={row.title?.lang}>{row.title?.text??row.editionSlug}</a>{row.startsOn && <p><time dateTime={row.startsOn}>{date(row.startsOn,route.locale)}</time></p>}{row.title?.fallback && <small className="fallback">{copy.fallback} {languageNames[row.title.lang]}</small>}</li>)}</ul></aside>;
  }
  return null;
}
function Shell({ route, origins, children }: { route: PublicRoute; origins: PublicOrigins; children: ReactNode }) {
  const copy = publicCopy[route.locale]; const sections: readonly PublicSection[] = route.surface === "studio" ? studioSections : route.editionSlug ? editionSections : [];
  return <><a className="skip" href="#main">{copy.skip}</a><header className="container masthead"><a className="wordmark" href={`/${route.locale}`}>{publicName}</a><a href={origins[route.surface === "studio" ? "festival" : "studio"] + `/${route.locale}`}>{route.surface === "studio" ? copy.festivalsSite : copy.studioSite}</a><nav aria-label={copy.language} className="languages">{publicLocales.map(locale => <a key={locale} href={publicPath(route,locale)} lang={locale} hrefLang={locale} aria-current={route.locale === locale ? "page" : undefined}>{languageNames[locale]}</a>)}</nav></header>
    <nav className="container section-nav" aria-label={copy.navigation}><a href={publicPath({...route,section:"home"})} aria-current={route.section === "home" ? "page" : undefined}>{copy.home}</a>{sections.map(section => <a key={section} href={publicPath(route,route.locale,section)} aria-current={route.section === section ? "page" : undefined}>{copy[section]}</a>)}</nav>
    {children}<footer className="container"><p className="footer-name">{publicName}</p><a href={`/${route.locale}`}>{copy.back}</a>{route.surface === "festival" && route.festivalSlug && <a href={`/${route.locale}/festivals/${route.festivalSlug}`}>{copy.index}</a>}</footer></>;
}
export function renderPublicPage(input: { route: PublicRoute; data: PublicData; variants: Partial<Record<CmsLocale, PublicData>>; origins: PublicOrigins }) {
  const { route, origins } = input;
  // Parse the public allowlist again at the rendering boundary. The caller uses
  // the published-read service; private-preview image paths are also refused.
  const data = "content" in input.data ? CmsPublicPortalSchema.parse(input.data) : CmsPublicSchema.parse(input.data);
  const content = contentOf(data); const copy = publicCopy[route.locale]; const metadata = publicMetadata(data,route,input.variants,origins);
  const title = metadata.title; const subtitle = route.section === "home" ? undefined : copy[route.section];
  const festivalName = "editions" in data && route.festivalSlug ? data.festivals.find(row=>row.slug===route.festivalSlug)?.name : undefined;
  const titleText = [subtitle ? publicCopy[title?.lang ?? route.locale][route.section] : undefined, festivalName, title?.text].filter(Boolean).join(" | ");
  const festivalHome = route.surface === "festival" && route.section === "home";
  const hasArtwork = festivalHome && !!publicImage(content, "brand.artwork");
  const showRegistration = festivalHome && !!route.editionSlug && !content.policyChanged && content.action.kind === "external";
  return "<!doctype html>" + renderToStaticMarkup(
    <html lang={route.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title lang={title?.lang}>{titleText}</title>
        <meta name="description" content={metadata.description?.text ?? ""} lang={metadata.description?.lang} />
        <link rel="canonical" href={metadata.canonical} />
        {metadata.alternates.map(row => <link key={row.locale} rel="alternate" hrefLang={row.locale} href={row.url} />)}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={titleText} />
        <meta property="og:description" content={metadata.description?.text ?? ""} />
        <meta property="og:url" content={metadata.canonical} />
        <meta property="og:locale" content={{et:"et_EE",en:"en_GB",ru:"ru_RU"}[title?.lang ?? metadata.actual]} />
        <link rel="stylesheet" href="/site.css" />
      </head>
      <body data-brand={route.surface === "festival" ? content.brand ?? "cobalt" : "cobalt"}>
        <Shell route={route} origins={origins}>
          <main id="main" tabIndex={-1} className="container">
            <div className={route.section === "home" ? (festivalHome ? "opening opening--festival" : "opening") : "page-heading"}>
              <div className="opening-copy">
              {subtitle ? <><p className="document-title" lang={title?.lang}>{title?.text}</p><h1>{subtitle}</h1></>
                : festivalName ? <h1>{festivalName}</h1> : <h1 lang={title?.lang}>{title?.text}</h1>}
              {title?.fallback && <p className="fallback">{copy.fallback} {languageNames[title.lang]}</p>}
              <Text value={field(content,"introduction")} locale={route.locale} />
              {route.section === "home" && route.surface === "studio" && <a className="primary" href={publicPath(route,route.locale,"join")}>{copy.join}</a>}
              {showRegistration && <a className="primary" href={publicPath(route,route.locale,"registration")}>{copy.registration}</a>}
              </div>
              {hasArtwork ? <Image content={content} path="brand.artwork" eager className="opening-artwork" /> :
                route.section === "home" && <OpeningLedger data={data} route={route} />}
            </div>
            {hasArtwork && <OpeningLedger data={data} route={route} />}
            {content.policyChanged && <p className="notice" role="note">{copy.policy}</p>}
            {"editions" in data ? <Portal data={data} route={route} /> : content.kind === "STUDIO_SITE" ? <Studio content={content} route={route} /> : <Edition content={content} route={route} />}
          </main>
        </Shell>
      </body>
    </html>
  );
}
export function renderPublicError(route: PublicRoute, origins: PublicOrigins, status: 404 | 503) {
  const copy = publicCopy[route.locale]; const title = status === 404 ? copy.missing : copy.unavailable;
  return "<!doctype html>" + renderToStaticMarkup(<html lang={route.locale}><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>{title}</title><meta name="description" content={status === 404 ? copy.missingText : copy.unavailableText} /><meta name="robots" content="noindex, nofollow" /><link rel="stylesheet" href="/site.css" /></head><body><Shell route={{...route,section:"home"}} origins={origins}><main id="main" tabIndex={-1} className="container error-page"><h1>{title}</h1><p>{status === 404 ? copy.missingText : copy.unavailableText}</p>{status === 503 && <a className="primary" href={publicPath(route)}>{copy.retry}</a>}<a href={`/${route.locale}`}>{copy.back}</a></main></Shell></body></html>);
}
export function renderSitemap(entries: string[]): string {
  const escape = (value: string) => value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(entries)].sort().map(url => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`;
}
