import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { parsePublicRoute, renderPublicPage, renderPublicError, publicCopy, type PublicData } from "../../packages/public-site/src";
import { fixture, portal } from "../../packages/public-site/tests/fixture.cjs";
import type { CmsLocale } from "../../packages/schemas/src";

// Real request-rendered HTML and CSS, with synthetic published DTOs. PostgreSQL,
// withdrawal/rights and canonical policy are exercised by check-public-pages.cjs.
async function start() {
  const servers: Server[]=[];
  const origins={studio:"",festival:""};
  const state={fallback:false,missing:false,failed:false,policyChanged:false,external:false};
  for(const surface of ["studio","festival"] as const) {
    const server=createServer((req,res)=>{
      res.setHeader("Cache-Control","no-store");
      res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'self'; img-src 'self'; script-src 'none'");
      if(req.url==="/site.css") {res.setHeader("Content-Type","text/css");res.end(readFileSync("packages/public-site/dist/site.css"));return;}
      const route=parsePublicRoute(req.url??"",surface)??{surface,locale:"et",section:"home"};
      res.setHeader("Content-Type","text/html; charset=utf-8");
      if(state.missing||state.failed){res.statusCode=state.missing?404:503;res.end(renderPublicError(route,origins,state.missing?404:503));return;}
      const read=(locale:CmsLocale):PublicData=>{
        if(surface==="festival"&&!route.editionSlug) return portal(locale,state.fallback);
        else {
          const content=fixture(locale,surface==="studio"?"STUDIO_SITE":"FESTIVAL_EDITION",state.fallback);
          content.policyChanged=state.policyChanged;
          if(state.policyChanged)content.fields=content.fields.filter(row=>!row.path.startsWith("rules."));
          if(state.external&&!state.policyChanged)content.action={kind:"external",url:"https://example.invalid/current-registration"};
          if(surface==="festival") content.links.push({path:"results.fixture",title:{text:"Dance Express 2025",lang:locale,fallback:false},url:"https://example.invalid/results.pdf",result:{editionLabel:"Dance Express 2025",date:"2025-11-17",locale:"et"}});
          return content;
        }
      };
      const variants={et:read("et"),en:read("en"),ru:read("ru")};
      res.end(renderPublicPage({route,data:variants[route.locale],variants,origins}));
    });
    server.listen(0,"127.0.0.1");await once(server,"listening");
    const address=server.address();if(!address||typeof address==="string")throw new Error("Missing fixture port");
    origins[surface]=`http://127.0.0.1:${address.port}`;servers.push(server);
  }
  return {origins,state,close:async()=>{await Promise.all(servers.map(server=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})));}};
}
test.use({javaScriptEnabled:false});
for(const locale of ["et","en","ru"] as const)for(const width of [320,390,768,1440,1920])for(const surface of ["studio","festival"] as const) {
  test(`${surface} ${locale} readable without JavaScript at ${width}px`,async({page},testInfo)=>{
    const f=await start();try {
      await page.setViewportSize({width,height:900});const response=await page.goto(`${f.origins[surface]}/${locale}`);expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang",locale);await expect(page.locator("h1")).toBeVisible();
      expect(await page.locator("script").count()).toBe(0);
      const contrasts=await page.evaluate(()=>{
        const context=document.createElement("canvas").getContext("2d");if(!context)throw new Error("Missing colour conversion");
        const luminance=(colour:string)=>{context.fillStyle=colour;context.fillRect(0,0,1,1);const rgb=context.getImageData(0,0,1,1).data;const channel=(n:number)=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};return .2126*channel(rgb[0]!)+.7152*channel(rgb[1]!)+.0722*channel(rgb[2]!);};
        const ratio=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
        const style=getComputedStyle(document.body);const background=style.backgroundColor;const token=(name:string)=>style.getPropertyValue(name).trim();
        return {body:ratio(style.color,background),link:ratio(getComputedStyle(document.querySelector(".masthead>a")!).color,background),muted:ratio(token("--color-muted"),background),primary:ratio(token("--color-accent-ink"),token("--color-accent")),focus:ratio(token("--color-focus"),background),boundary:ratio(token("--color-control"),background)};
      });
      for(const key of ["body","link","muted","primary"] as const)expect(contrasts[key],key).toBeGreaterThanOrEqual(4.5);
      for(const key of ["focus","boundary"] as const)expect(contrasts[key],key).toBeGreaterThanOrEqual(3);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if([320,768,1440,1920].includes(width))await page.screenshot({path:testInfo.outputPath(`${surface}-${locale}-${width}-home.png`),fullPage:true});
      await page.keyboard.press("Tab");await expect(page.locator(".skip")).toBeFocused();await page.keyboard.press("Enter");await expect(page.locator("main")).toBeFocused();
      const copy=publicCopy[locale];
      if(surface==="studio") {
        await page.locator(".section-nav").getByRole("link",{name:copy.timetable,exact:true}).click();await expect(page.locator(".schedule")).toContainText("Europe/Tallinn");
        const classLink=page.locator(".schedule a").first();await classLink.click();await expect(page.locator("main")).toContainText("Example teacher");
      } else {
        await expect(page.getByRole("heading",{name:copy.past,exact:true})).toBeVisible();
        await expect(page.locator('main a[href="mailto:public%40example.invalid"]')).toBeVisible();
        await page.locator('a[href$="/dance-express/2026"]').first().click();
        await page.locator(".section-nav").getByRole("link",{name:copy.rules,exact:true}).click();await expect(page.locator("main section")).toBeVisible();
        await page.locator(".languages a[lang=ru]").click();expect(new URL(page.url()).pathname).toBe("/ru/festivals/dance-express/2026/rules");
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if([320,768,1440,1920].includes(width))await page.screenshot({path:testInfo.outputPath(`${surface}-${locale}-${width}.png`),fullPage:true});
    } finally {await f.close();}
  });
}
test("source fallback, mixed metadata and authored locale links stay explicit",async({page})=>{
  const f=await start();try {
    f.state.fallback=true;await page.goto(f.origins.studio+"/ru/about");
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute("href",f.origins.studio+"/et/about");
    await expect(page.locator('link[rel=alternate]')).toHaveCount(1);await expect(page.locator('main .prose[lang=et]')).toHaveCount(2);
    await expect(page.locator("main")).toContainText(publicCopy.ru.fallback);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content","et_EE");
  } finally {await f.close();}
});
test("all studio sections, contact/social and cross-site links work without a shell",async({page})=>{
  const f=await start();try {
    for(const section of ["about","teachers","classes","timetable","join","contact","media"]) {
      const response=await page.goto(`${f.origins.studio}/en/${section}`);expect(response?.status()).toBe(200);await expect(page.locator("h1")).toBeVisible();
    }
    await page.goto(f.origins.studio+"/en/contact");await expect(page.locator('a[href^="mailto:"]')).toHaveAttribute("href","mailto:public%40example.invalid");
    await expect(page.locator('a[href^="tel:"]')).toHaveAttribute("href","tel:+3725551234");
    await expect(page.locator('a[href="https://example.invalid/social"]')).toBeVisible();
    await page.getByRole("link",{name:publicCopy.en.festivalsSite,exact:true}).click();expect(page.url()).toBe(f.origins.festival+"/en");
  } finally {await f.close();}
});
test("policy changes remove registration/rules on reload and retain contact and results",async({page})=>{
  const f=await start();try {
    f.state.external=true;const base=f.origins.festival+"/en/festivals/dance-express/2026";
    await page.goto(base+"/registration");await expect(page.getByRole("link",{name:publicCopy.en.externalAction})).toBeVisible();await expect(page.locator("address")).toContainText("public@example.invalid");
    f.state.policyChanged=true;await page.reload();await expect(page.getByRole("link",{name:publicCopy.en.externalAction})).toHaveCount(0);await expect(page.getByRole("note")).toContainText(publicCopy.en.policy);
    await page.goto(base+"/rules");await expect(page.locator("main section")).toHaveCount(0);await expect(page.locator("main")).toContainText(publicCopy.en.empty);
    await page.goto(base+"/results");await expect(page.locator('a[href="https://example.invalid/results.pdf"]')).toBeVisible();await expect(page.locator("main")).toContainText(publicCopy.en.resultLanguage);
  } finally {await f.close();}
});
test("localized unpublished and failed reads have navigation and a real retry",async({page})=>{
  const f=await start();try {
    for(const locale of ["et","en","ru"] as const) {
      f.state.missing=true;expect((await page.goto(`${f.origins.studio}/${locale}/teachers`))?.status()).toBe(404);await expect(page.locator("h1")).toHaveText(publicCopy[locale].missing);
      f.state.missing=false;f.state.failed=true;await page.reload();await expect(page.locator("h1")).toHaveText(publicCopy[locale].unavailable);
      f.state.failed=false;await page.getByRole("link",{name:publicCopy[locale].retry,exact:true}).click();await expect(page.locator("h1")).toHaveText(publicCopy[locale].teachers);
    }
  } finally {await f.close();}
});
