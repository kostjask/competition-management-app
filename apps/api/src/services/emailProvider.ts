import { z } from "zod";
import { EmailSchema } from "@dance/schemas";

export const OutgoingEmailSchema = z.strictObject({
  to: EmailSchema, subject: z.string().min(1), text: z.string().min(1), html: z.string().min(1),
});
export type OutgoingEmail = z.infer<typeof OutgoingEmailSchema>;
export interface EmailProvider { send(message: OutgoingEmail, idempotencyKey: string, from?: string): Promise<string> }

export class ResendProvider implements EmailProvider {
  constructor(private apiKey: string, private from: string, private transport: typeof fetch = fetch) {}
  async send(message: OutgoingEmail, idempotencyKey: string, from = this.from): Promise<string> {
    try {
      const result = await this.transport("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok) throw new Error();
      return z.object({ id: z.string().min(1).max(200) }).parse(await result.json()).id;
    } catch { throw new Error("Email provider acceptance unconfirmed"); }
  }
}

/** Silent injectable fake: no network, token/recipient logs or inbox-delivery claims. */
export class FakeEmailProvider implements EmailProvider {
  async send(_message: OutgoingEmail, idempotencyKey: string): Promise<string> { return `fake-${idempotencyKey}`; }
}
