/** Silent development fake. P2-EMAIL owns provider integration and delivery receipts. */
interface VerificationEmailParams {
  to: string;
  token: string;
  name?: string;
}
interface InvitationEmailParams {
  to: string;
  token: string;
  roleKey: string;
  eventName?: string | undefined;
}

function requireDeliveryAvailable(): void {
  if (process.env.NODE_ENV === "production") {
    // Never include recipient, raw secret or URL in errors or logs.
    throw new Error("Email delivery is unavailable");
  }
}

export async function sendVerificationEmail(_params: VerificationEmailParams): Promise<void> {
  requireDeliveryAvailable();
}

export async function sendInvitationEmail(_params: InvitationEmailParams): Promise<void> {
  requireDeliveryAvailable();
}
