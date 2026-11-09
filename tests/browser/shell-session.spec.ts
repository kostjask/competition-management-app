import { test, expect } from "@playwright/test";
import type { UserProfile } from "../../packages/schemas/src/auth.schema";
import { getTranslation } from "../../apps/web/src/i18n/translations";

function profile(): UserProfile {
  return { id:"u", name:"Synthetic Account", email:"synthetic-long-account-name-for-responsive-review@example.invalid", preferredLocale:null,createdAt:"2026-01-01T00:30:00.000Z", isAdmin:false,
    roles:[{id:"judge",eventId:"a",role:{id:"r",key:"judge",name:"Untranslated renamed label"},event:{id:"a",name:"Synthetic event A"}}, {id:"moderator",eventId:"b",role:{id:"m",key:"moderator",name:"Another label"},event:{id:"b",name:"Synthetic event B"}}],
    permissions:[{eventId:"a",keys:["score.submit"]}] };
}
const denial = { code:"UNAUTHORIZED", reason:"authenticationRequired", params:{}, issues:[] };
for (const locale of ["et","en","ru"] as const) for (const width of [320,390,768,1440]) {
  test(locale + " shell S01-S04 at " + width + "px", async ({ page }, info) => {
    await page.setViewportSize({width,height:900});
    await page.addInitScript(value => localStorage.setItem("app-language",value),locale);
    let user = profile();
    await page.route("**/api/v1/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({json:path.endsWith("/auth/profile") ? user : []});
    });
    const text = (key: "Shell.profile" | "Shell.account" | "Shell.judge" | "Shell.moderator" | "Shell.notFound" | "Shell.noRoles" | "Shell.events" | "Shell.skip" | "Access.denied") => getTranslation(key,locale);
    await page.goto("/auth/profile");
    await expect(page.getByRole("heading",{name:text("Shell.profile")})).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang",locale); await expect(page).toHaveTitle(new RegExp(text("Shell.profile")));
    await expect(page.locator("main").getByText(text("Shell.judge"),{exact:true})).toBeVisible();
    await expect(page.locator("main").getByText("Untranslated renamed label")).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Edit",exact:true})).toHaveCount(0);
    await page.getByRole("button",{name:text("Shell.account"),exact:true}).click();
    await page.keyboard.press("Escape"); await expect(page.getByRole("button",{name:text("Shell.account"),exact:true})).toBeFocused();
    await expect(page.locator("#account-disclosure")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath("profile.png"),fullPage:true});
    await page.getByRole("link",{name:text("Shell.events"),exact:true}).click();
    await expect(page.getByRole("heading",{name:getTranslation("Events.listTitle",locale),exact:true})).toBeVisible();
    await expect(page.getByText(getTranslation("Events.createFirstEvent",locale),{exact:true})).toHaveCount(0);
    await page.goto("/events/new"); await expect(page.getByRole("heading",{name:text("Access.denied")})).toBeVisible();
    await page.goto("/not-a-page"); await expect(page.getByRole("heading",{name:text("Shell.notFound")})).toBeFocused();
    await page.getByRole("link",{name:text("Shell.skip"),exact:true}).focus(); await page.keyboard.press("Enter"); await expect(page.locator("main")).toBeFocused();
    user = {...user,roles:[],permissions:[]}; await page.goto("/"); await expect(page.getByText(text("Shell.noRoles"),{exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:text("Shell.judge"),exact:true})).toHaveCount(0);
  });
}
for (const locale of ["et","en","ru"] as const) {
  test(locale + " expired session preserves mounted work and requires explicit retry", async ({ page }) => {
    await page.setViewportSize({width:390,height:850}); await page.addInitScript(value => localStorage.setItem("app-language",value),locale);
    let valid = true; let failures = 0; let logins = 0;
    const user = profile();
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/login")) {
        logins++; expect(route.request().headers()["x-session-transport"]).toBe("cookie"); expect(route.request().headers()["x-csrf-protection"]).toBe("1");
        valid = true; return route.fulfill({json:{session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:user.id,email:user.email,name:user.name}}});
      }
      if (!valid) { failures++; return route.fulfill({status:401,json:denial}); }
      return route.fulfill({json:user});
    });
    await page.goto("/__fixtures/access/a");
    const field = page.getByLabel(getTranslation("Shell.name",locale),{exact:true}); await field.fill("Unsaved synthetic work");
    valid = false; await page.getByRole("button",{name:getTranslation("Access.allowed",locale),exact:true}).click();
    const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(getTranslation("Shell.email",locale),{exact:true})).toHaveAttribute("readonly","");
    await dialog.getByLabel(getTranslation("Shell.password",locale),{exact:true}).fill("password123");
    await dialog.getByRole("button",{name:getTranslation("Shell.login",locale),exact:true}).click();
    await expect(dialog).not.toBeVisible(); await expect(field).toHaveValue("Unsaved synthetic work");
    expect(failures).toBe(1); expect(logins).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("auth_token"))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem("auth_token"))).toBeNull();
  });
}
test("guest events explain sign-in and unsafe return paths fall back to home", async ({page}) => {
  let authenticated = false; let unavailable = true; const user = profile();
  await page.addInitScript(() => localStorage.setItem("app-language","en"));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) { authenticated=true; return route.fulfill({json:{session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:user.id,email:user.email,name:user.name}}}); }
    if (unavailable) return route.fulfill({status:503,json:{...denial,reason:"unexpected"}});
    return route.fulfill(authenticated ? {json:user} : {status:401,json:denial});
  });
  await page.goto("/events/a"); await expect(page.getByRole("heading",{name:getTranslation("Shell.unavailable","en")})).toBeVisible();
  unavailable=false; await page.locator("main").getByRole("button",{name:"Try again",exact:true}).click();
  await expect(page.getByRole("heading",{name:getTranslation("Shell.signInRequired","en")})).toBeVisible();
  await page.goto("/auth/login?returnTo="+encodeURIComponent("https://foreign.invalid/?token=PRIVATE"));
  await page.getByLabel("Email",{exact:true}).fill(user.email); await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button",{name:"Sign in",exact:true}).click(); await expect(page).toHaveURL("/");
});
test("verification strips secrets and continues explicitly with safe cross-tab fallback", async ({page,context}) => {
  let authenticated = false; let verifications=0; const user=profile();
  let release = () => {}; const bootstrap = new Promise<void>(resolve => { release = resolve; });
  let waiting = false;
  await context.addInitScript(() => localStorage.setItem("app-language","en"));
  await context.route("**/api/v1/**", async route => {
    if (waiting && route.request().url().endsWith("/auth/profile")) await bootstrap;
    if (route.request().url().endsWith("/auth/onboarding/read")) return route.fulfill({json:{email:user.email,emailVerified:true,returnTo:"/",draft:null}});
    if (route.request().url().endsWith("/verify-email")) { authenticated=true; verifications++; return route.fulfill({json:{session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:user.id,email:user.email,name:user.name},message:"verified",messageId:"emailVerified"}}); }
    return route.fulfill(authenticated?{json:user}:{status:401,json:denial});
  });
  const other = await context.newPage(); await other.goto("/");
  await expect(other.getByRole("link",{name:"Sign in",exact:true})).toBeVisible();
  waiting = true;
  await page.goto("/verify-email?token=synthetic-private-link&returnTo="+encodeURIComponent("//foreign.invalid"));
  await expect(page).toHaveURL("/verify-email"); expect(verifications).toBe(0);
  await expect(page.getByRole("button",{name:"Verify email",exact:true})).toBeDisabled();
  waiting = false; release(); await expect(page.getByRole("button",{name:"Verify email",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Verify email",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Email verified"})).toBeVisible();
  await page.getByRole("link",{name:"Continue",exact:true}).click(); await expect(page).toHaveURL("/"); expect(verifications).toBe(1);
  await expect(other.getByRole("button",{name:"Account",exact:true})).toBeVisible(); await other.close();
});

test("event context and missing/denied reads remain explicit without unsupported actions", async ({page}) => {
  const user = profile(); let status = 200;
  await page.addInitScript(() => localStorage.setItem("app-language","en"));
  const event = { id:"a",name:"Synthetic selected event",startsAt:"2026-11-05T10:00:00.000Z",endsAt:"2026-11-05T12:00:00.000Z",timeZone:"UTC",registrationDeadline:null,createdAt:"2026-01-01T00:00:00.000Z",stage:"REGISTRATION_OPEN",venue:null,country:null,city:null,description:null,unclassifiedDescription:null,organizerEmail:null,organizerPhone:null,revision:1,maxStudios:null,maxPerformances:null,imageUrl:null };
  await page.route("**/api/v1/**", route => route.fulfill(route.request().url().endsWith("/auth/profile") ? {json:user} : status === 200 ? {json:event} : {status,json:{...denial,reason:status===404?"recordNotFound":"permissionDenied"}}));
  await page.goto("/events/a"); await expect(page.getByRole("heading",{name:event.name,exact:true})).toBeFocused();
  await expect(page.getByText("Selected event: "+event.name,{exact:true})).toBeVisible();
  await expect(page.locator('a[href$="/register"],a[href$="/studio"]')).toHaveCount(0);
  status=404; await page.reload(); await expect(page.getByRole("heading",{name:"Page not found",exact:true})).toBeVisible();
  status=403; await page.reload(); await expect(page.getByRole("heading",{name:"Access denied",exact:true})).toBeVisible();
});
test("logout notifies a second tab and does not claim success while offline", async ({page,context}) => {
  const user=profile(); let valid=true; let offline=true;
  await context.addInitScript(() => localStorage.setItem("app-language","en"));
  await context.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/logout")) { if (offline) return route.abort(); valid=false; return route.fulfill({status:204}); }
    return route.fulfill(valid?{json:user}:{status:401,json:denial});
  });
  await page.goto("/auth/profile"); const other=await context.newPage(); await other.goto("/auth/profile");
  await expect(other.getByRole("heading",{name:"My profile",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Account",exact:true}).click();
  page.once("dialog",dialog=>dialog.accept()); await page.getByRole("button",{name:"Sign out on all devices",exact:true}).click();
  await expect(page.getByRole("alert")).toBeVisible(); await expect(page).toHaveURL("/auth/profile");
  offline=false; page.once("dialog",dialog=>dialog.accept()); await page.getByRole("button",{name:"Sign out on all devices",exact:true}).click();
  await expect(page).toHaveURL("/auth/login"); await expect(other.getByRole("dialog")).toBeVisible();
  await other.close();
});
test("login retains input through locale changes and follows a safe event return", async ({page}) => {
  const user=profile(); let valid=false;
  await page.addInitScript(()=>localStorage.setItem("app-language","en"));
  await page.route("**/api/v1/**", route => {
    if (route.request().url().endsWith("/auth/login")) { valid=true; return route.fulfill({json:{session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:user.id,email:user.email,name:user.name}}}); }
    if (route.request().url().endsWith("/events")) return route.fulfill({json:[]});
    return route.fulfill(valid?{json:user}:{status:401,json:denial});
  });
  await page.goto("/auth/login?returnTo="+encodeURIComponent("/events"));
  await page.getByLabel("Email",{exact:true}).fill(user.email); await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button",{name:"Eesti",exact:true}).click();
  await expect(page.getByLabel(getTranslation("Shell.email","et"),{exact:true})).toHaveValue(user.email);
  await expect(page.getByLabel(getTranslation("Shell.password","et"),{exact:true})).toHaveValue("password123");
  await page.getByRole("button",{name:getTranslation("Shell.login","et"),exact:true}).click(); await expect(page).toHaveURL("/events");
});
test("UTC event editing preserves browser-zone boundaries and posted instants", async ({browser}) => {
  const context=await browser.newContext({timezoneId:"Pacific/Honolulu"}); const page=await context.newPage();
  await page.clock.install({time:new Date("2026-11-05T10:00:00.000Z")});
  const user={...profile(),isAdmin:true}; let posted: unknown;
  await page.addInitScript(()=>localStorage.setItem("app-language","en"));
  await page.route("**/api/v1/**", async route => {
    if (route.request().method()==="POST") { posted=route.request().postDataJSON(); return route.fulfill({status:400,json:{...denial,reason:"invalidInput"}}); }
    return route.fulfill({json:route.request().url().endsWith("/auth/profile")?user:[]});
  });
  await page.goto("/events/new"); await expect(page.locator("#event-startsAt")).toHaveValue("2026-11-05T10:00");
  await page.locator("#event-name").fill("Synthetic UTC event");
  await page.locator("#event-timeZone").fill("UTC");
  await page.locator("#event-cutoff").selectOption("none");
  await page.locator("form button[type=submit]").click();
  await expect.poll(()=>posted).toMatchObject({startsAt:"2026-11-05T10:00:00.000Z",endsAt:"2026-11-05T12:00:00.000Z"});
  await context.close();
});
