import { test, expect } from "@playwright/test";
import { getTranslation } from "../../apps/web/src/i18n/translations";
import type { UserProfile } from "../../packages/schemas/src/auth.schema";
type TextKey = "Flow.signup" | "Flow.checkEmail" | "Flow.unconfirmed" | "Flow.onboarding" | "Flow.resume" | "Flow.save" | "Flow.saved" | "Flow.cancel" | "Flow.cancelled" | "Flow.wrongAccount" | "Shell.logout" | "Shell.email" | "Shell.password" | "Shell.login" | "Flow.invitation" | "Flow.accepted" | "Flow.send" | "Flow.reset" | "Flow.terminal";
const denied = { code:"UNAUTHORIZED",reason:"authenticationRequired",params:{},issues:[] };
const details = { studioName:"Synthetic studio",country:"EE",city:"Tallinn",directorName:"Synthetic director",directorPhone:"" };
const owner: UserProfile = { id:"u",email:"owner@example.invalid",name:"Synthetic owner",createdAt:"2026-01-01T00:00:00.000Z",isAdmin:false,roles:[],permissions:[] };
const event = { id:"e",name:"Synthetic event",startsAt:"2026-11-05T10:00:00.000Z",endsAt:"2026-11-05T12:00:00.000Z",createdAt:"2026-01-01T00:00:00.000Z",stage:"REGISTRATION_OPEN",venue:null,country:null,city:null,description:null,maxStudios:null,maxPerformances:null,imageUrl:null };
for(const locale of ["et","en","ru"] as const) for(const width of [320,390,768,1440]) {
  test(locale+" studio signup and pending recovery at "+width+"px",async({page},info)=>{
    await page.setViewportSize({width,height:900}); await page.addInitScript(value=>localStorage.setItem("app-language",value),locale);
    const t=(key:TextKey)=>getTranslation(key,locale);
    let saves=0;let conflict=true;let cancelled=false;
    let releaseSave=()=>{};const pendingSave=new Promise<void>(resolve=>{releaseSave=resolve;});
    await page.route("**/api/v1/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith("/auth/profile"))return route.fulfill({status:401,json:denied});
      if(path.endsWith("/auth/register")){const body=route.request().postDataJSON();expect(body.onboarding.details.studioName).toBe(details.studioName);expect(body.locale).toBe(locale);return route.fulfill({status:201,json:{message:"Registered",messageId:"registered",userId:owner.id,delivery:"unconfirmed"}});}
      if(path.endsWith("/onboarding/save")){saves++;if(conflict)await pendingSave;if(conflict)return route.fulfill({status:409,json:{...denied,code:"CONFLICT",reason:"concurrentChange"}});}
      if(path.endsWith("/onboarding/cancel"))cancelled=true;
      return route.fulfill({json:{email:owner.email,emailVerified:false,returnTo:"/events/e",draft:{id:"d",status:cancelled?"CANCELLED":"DRAFT",revision:cancelled?3:1,intendedEventId:"e",details,updatedAt:"2026-11-05T00:00:00.000Z"}}});
    });
    await page.goto("/auth/register?eventId=e");
    await page.getByRole("button",{name:t("Flow.signup"),exact:true}).click();await expect(page.getByRole("alert")).toBeVisible();
    await page.locator("#signup-name").fill(owner.name!);await page.getByRole("button",{name:"English",exact:true}).click();await expect(page.locator("#signup-name")).toHaveValue(owner.name!);await page.locator("button[lang=\""+locale+"\"]").click();await page.locator("#signup-email").fill(owner.email);await page.locator("#signup-password").fill("password123");
    for(const [key,value] of Object.entries(details))await page.locator("#signup-"+key).fill(value);
    await page.getByRole("button",{name:t("Flow.signup"),exact:true}).click();await expect(page.getByRole("heading",{name:t("Flow.checkEmail")})).toBeVisible();
    await expect(page.getByRole("status")).toContainText(t("Flow.unconfirmed"));
    await page.locator("main").getByRole("link",{name:t("Flow.onboarding"),exact:true}).click();
    await page.locator("#owner-email").fill(owner.email);await page.locator("#owner-password").fill("password123");await page.getByRole("button",{name:t("Flow.resume"),exact:true}).click();
    await expect(page.locator("#draft-city")).toHaveValue(details.city);await page.locator("#draft-city").fill("Unsaved local city");
    await page.getByRole("button",{name:t("Flow.save"),exact:true}).click();await expect(page.locator("#draft-city")).toBeDisabled();releaseSave();await expect(page.getByRole("alert")).toBeVisible();await expect(page.locator("#draft-city")).toHaveValue("Unsaved local city");expect(saves).toBe(1);
    conflict=false;await page.getByRole("button",{name:t("Flow.save"),exact:true}).click();await expect(page.getByText(t("Flow.saved"),{exact:true})).toBeVisible();
    page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:t("Flow.cancel"),exact:true}).click();await expect(page.getByText(t("Flow.cancelled"),{exact:true})).toBeVisible();await expect(page.locator("#draft-city")).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain("password123");
    await page.screenshot({path:info.outputPath("cancelled.png"),fullPage:true});
  });
  if(width===390) test(locale+" admin invitation lifecycle controls",async({page},info)=>{
    await page.setViewportSize({width:390,height:900});await page.addInitScript(value=>localStorage.setItem("app-language",value),locale);
    let row={id:"i",email:owner.email,roleKey:"judge",eventId:"e",createdAt:"2026-11-05T00:00:00.000Z",expiresAt:"2027-01-01T00:00:00.000Z",usedAt:null,revokedAt:null as string|null,supersededAt:null as string|null,status:"PENDING"};let created=0;let resent=0;
    await page.route("**/api/v1/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith("/auth/profile"))return route.fulfill({json:{...owner,isAdmin:true}});
      if(path.endsWith("/events"))return route.fulfill({json:[event]});
      if(path.endsWith("/resend")){expect(route.request().postDataJSON()).toEqual({expiresAt:row.expiresAt});resent++;row={...row,expiresAt:"2027-01-02T00:00:00.000Z"};return route.fulfill({json:{invitationId:row.id,messageId:"invitationResent",delivery:"unconfirmed"}});}
      if(path.endsWith("/revoke")){expect(route.request().postDataJSON()).toEqual({expiresAt:row.expiresAt});row={...row,status:"REVOKED",revokedAt:"2026-11-05T01:00:00.000Z",supersededAt:"2026-11-05T01:00:00.000Z"};return route.fulfill({json:{invitationId:row.id,messageId:"invitationRevoked"}});}
      if(route.request().method()==="POST"){created++;expect(route.request().postDataJSON().locale).toBeUndefined();return route.fulfill({status:201,json:{invitationId:row.id,messageId:"invitationCreated",message:"Created",delivery:"unconfirmed"}});}
      return route.fulfill({json:created?[row]:[]});
    });
    await page.goto("/admin/invitations");await page.locator("#staff-email").fill(owner.email);await page.locator("#staff-event").selectOption("e");
    await page.getByRole("button",{name:getTranslation("Flow.invite",locale),exact:true}).click();await expect(page.locator("main li")).toHaveCount(1);
    await page.getByRole("button",{name:getTranslation("Flow.renew",locale),exact:true}).click();await expect.poll(()=>resent).toBe(1);
    page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:getTranslation("Flow.revoke",locale),exact:true}).click();await expect(page.getByText(getTranslation("Flow.revoked",locale),{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:getTranslation("Flow.renew",locale),exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath("invitation-management.png"),fullPage:true});
  });
}
for(const locale of ["et","en","ru"] as const) {
  test(locale+" wrong account switch and explicit existing acceptance",async({page})=>{
    const t=(key:TextKey)=>getTranslation(key,locale);let user:UserProfile|null={...owner,email:"other@example.invalid"};let accepts=0;
    await page.setViewportSize({width:390,height:900});await page.addInitScript(value=>localStorage.setItem("app-language",value),locale);
    await page.route("**/api/v1/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith("/auth/profile"))return route.fulfill(user?{json:user}:{status:401,json:denied});
      if(path.endsWith("/auth/logout")){user=null;return route.fulfill({status:204});}
      if(path.endsWith("/auth/login")){user=owner;return route.fulfill({json:{session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:owner.id,email:owner.email,name:owner.name}}});}
      if(path.endsWith("/invitations/accept")){accepts++;expect(route.request().postDataJSON()).toEqual({token:"synthetic-secret"});return route.fulfill({status:201,json:{message:"Accepted",messageId:"invitationAccepted",accountCreated:false,user:{id:owner.id,email:owner.email,name:owner.name}}});}
      return route.fulfill({json:{email:owner.email,roleKey:"moderator",event:{id:"e",name:event.name},expiresAt:"2027-01-01T00:00:00.000Z",status:"PENDING",accountExists:true}});
    });
    await page.goto("/auth/accept-invitation?token=synthetic-secret");await expect(page).toHaveURL("/auth/accept-invitation");await expect(page.getByText(t("Flow.wrongAccount"),{exact:true})).toBeVisible();expect(accepts).toBe(0);
    page.once("dialog",dialog=>dialog.accept());await page.locator("main").getByRole("button",{name:t("Shell.logout"),exact:true}).click();
    await expect(page.locator("main").getByLabel(t("Shell.email"),{exact:true})).toHaveAttribute("readonly","");await page.locator("main").getByLabel(t("Shell.password"),{exact:true}).fill("password123");await page.locator("main").getByRole("button",{name:t("Shell.login"),exact:true}).click();
    await expect(page.getByRole("button",{name:t("Flow.invitation"),exact:true})).toBeVisible();expect(accepts).toBe(0);await page.getByRole("button",{name:t("Flow.invitation"),exact:true}).click();await expect(page.getByText(t("Flow.accepted"),{exact:true})).toBeVisible();expect(accepts).toBe(1);
  });
  test(locale+" neutral recovery, reset, and new invitation terminal states",async({page})=>{
    const t=(key:TextKey)=>getTranslation(key,locale);let status="REVOKED";let accepts=0;
    await page.addInitScript(value=>localStorage.setItem("app-language",value),locale);
    await page.route("**/api/v1/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith("/auth/profile"))return route.fulfill({status:401,json:denied});
      if(path.endsWith("/auth/reset-password"))return route.fulfill({json:{messageId:"passwordReset"}});
      if(path.endsWith("/invitations/accept")){accepts++;expect(route.request().postDataJSON().name).toBe(owner.name);return route.fulfill({status:201,json:{message:"Accepted",messageId:"invitationAccepted",accountCreated:true,session:"cookie",expiresAt:"2026-11-05T23:00:00.000Z",user:{id:owner.id,email:owner.email,name:owner.name}}});}
      if(path.includes("/invitations/"))return route.fulfill({json:{email:owner.email,roleKey:"judge",event:{id:"e",name:event.name},expiresAt:"2027-01-01T00:00:00.000Z",status,accountExists:false}});
      return route.fulfill({status:202,json:{messageId:"authRequestAccepted",delivery:"unconfirmed"}});
    });
    for(const path of ["resend-verification","forgot-password","correct-email"]){await page.goto("/auth/"+path);await page.locator("#recovery-email").fill(owner.email);if(path==="correct-email"){await page.locator("#recovery-password").fill("password123");await page.locator("#recovery-newEmail").fill("corrected@example.invalid");}await page.getByRole("button",{name:t("Flow.send"),exact:true}).click();await expect(page.getByText(t("Flow.unconfirmed"),{exact:true})).toBeVisible();}
    await page.goto("/auth/reset-password?token=synthetic-reset");await expect(page).toHaveURL("/auth/reset-password");await page.locator("#reset-password").fill("new-password123");await page.getByRole("button",{name:t("Flow.reset"),exact:true}).click();await expect(page.locator("#reset-password")).toHaveCount(0);
    await page.goto("/auth/accept-invitation?token=synthetic-new");await expect(page.getByText(t("Flow.terminal"),{exact:true})).toBeVisible();expect(accepts).toBe(0);status="PENDING";
    await page.goto("/auth/accept-invitation?token=synthetic-new");await page.locator("#invite-name").fill(owner.name!);await page.locator("#invite-password").fill("password123");await page.getByRole("button",{name:t("Flow.invitation"),exact:true}).click();await expect(page.getByText(t("Flow.accepted"),{exact:true})).toBeVisible();expect(accepts).toBe(1);
  });
}
