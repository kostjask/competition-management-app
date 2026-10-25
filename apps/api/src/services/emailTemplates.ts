import { z } from "zod";
import { EmailSchema, RecipientLocaleSchema } from "@dance/schemas";

export const EmailContentSchema = z.strictObject({
  to: EmailSchema, locale: RecipientLocaleSchema,
  kind: z.enum(["verification", "invitation", "recovery", "applicationApproved", "applicationRejected"]),
  token: z.string().min(1).optional(),
});
export type EmailContent = z.infer<typeof EmailContentSchema>;

const copy = {
  et: {
    verification: ["Kinnita oma e-posti aadress", "Konto kinnitamiseks ava allolev link."],
    invitation: ["Kutse võistluse meeskonda", "Kutse ülevaatamiseks ava allolev link. Kutse ei anna ligipääsu enne kinnitamist."],
    recovery: ["Parooli lähtestamine", "Uue parooli määramiseks ava allolev link."],
    applicationApproved: ["Taotluse otsus", "Sinu taotlus on heaks kiidetud. Vaata üksikasju oma kontol."],
    applicationRejected: ["Taotluse otsus", "Sinu taotlus on tagasi lükatud. Vaata üksikasju oma kontol."],
    footer: "Kui sa seda ei taotlenud, võid kirja eirata. Ligipääsulink on isiklik ja aegub.",
    action: "Ava turvaline link",
  },
  en: {
    verification: ["Verify your email address", "Open the link below to verify your account."],
    invitation: ["Competition staff invitation", "Open the link below to review your invitation. Access starts only after acceptance."],
    recovery: ["Reset your password", "Open the link below to choose a new password."],
    applicationApproved: ["Application decision", "Your application has been approved. View the details in your account."],
    applicationRejected: ["Application decision", "Your application has been rejected. View the details in your account."],
    footer: "If you did not request this, you can ignore this email. Access links are personal and expire.",
    action: "Open secure link",
  },
  ru: {
    verification: ["Подтвердите адрес электронной почты", "Откройте ссылку ниже, чтобы подтвердить аккаунт."],
    invitation: ["Приглашение в команду соревнования", "Откройте ссылку ниже, чтобы просмотреть приглашение. Доступ появится только после принятия."],
    recovery: ["Сброс пароля", "Откройте ссылку ниже, чтобы установить новый пароль."],
    applicationApproved: ["Решение по заявке", "Ваша заявка одобрена. Подробности доступны в аккаунте."],
    applicationRejected: ["Решение по заявке", "Ваша заявка отклонена. Подробности доступны в аккаунте."],
    footer: "Если вы не отправляли этот запрос, проигнорируйте письмо. Ссылки доступа личные и имеют срок действия.",
    action: "Открыть безопасную ссылку",
  },
} as const;
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&#39;");

export function renderEmail(input: EmailContent, origin: string) {
  const data = EmailContentSchema.parse(input);
  const language = copy[data.locale]; const [subject, body] = language[data.kind];
  const paths = { verification: "/verify-email", invitation: "/auth/accept-invitation", recovery: "/auth/reset-password", applicationApproved: "/auth/profile", applicationRejected: "/auth/profile" };
  const link = new URL(paths[data.kind], origin);
  link.searchParams.set("lang", data.locale);
  if (["verification", "invitation", "recovery"].includes(data.kind)) {
    if (!data.token) throw new Error("Email link is required");
    link.searchParams.set("token", data.token);
  }
  return {
    to: data.to, subject,
    text: `${body}\n\n${link.href}\n\n${language.footer}`,
    html: `<!doctype html><html lang="${data.locale}"><body><h1>${subject}</h1><p>${body}</p><p><a href="${escapeHtml(link.href)}">${language.action}</a></p><p>${language.footer}</p></body></html>`,
  };
}
