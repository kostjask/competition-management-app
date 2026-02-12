/**
 * Email Service
 * 
 * This is a placeholder implementation for sending emails.
 * In production, integrate with a service like:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Resend
 * - Nodemailer with SMTP
 */

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

/**
 * Sends email verification link to user
 */
export async function sendVerificationEmail(
  params: VerificationEmailParams
): Promise<void> {
  const { to, token, name } = params;
  
  // In development, just log to console
  if (process.env.NODE_ENV !== "production") {
    console.log("\n📧 ============ EMAIL VERIFICATION ============");
    console.log(`To: ${to}`);
    console.log(`Name: ${name || "User"}`);
    console.log(`Token: ${token}`);
    console.log(`Verification Link: ${getBaseUrl()}/verify-email?token=${token}`);
    console.log("================================================\n");
    return;
  }

  // TODO: Implement actual email sending in production
  // Example with SendGrid/Resend/etc:
  /*
  await emailClient.send({
    to,
    from: process.env.EMAIL_FROM!,
    subject: "Verify your email",
    html: `
      <h1>Welcome${name ? ` ${name}` : ""}!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${getBaseUrl()}/verify-email?token=${token}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
  */
}

/**
 * Sends invitation email with registration link
 */
export async function sendInvitationEmail(
  params: InvitationEmailParams
): Promise<void> {
  const { to, token, roleKey, eventName } = params;
  
  // In development, just log to console
  if (process.env.NODE_ENV !== "production") {
    console.log("\n📧 ============ INVITATION EMAIL ============");
    console.log(`To: ${to}`);
    console.log(`Role: ${roleKey}`);
    console.log(`Event: ${eventName || "N/A"}`);
    console.log(`Token: ${token}`);
    console.log(`Invitation Link: ${getBaseUrl()}/accept-invitation?token=${token}`);
    console.log("===========================================\n");
    return;
  }

  // TODO: Implement actual email sending in production
  // Example:
  /*
  await emailClient.send({
    to,
    from: process.env.EMAIL_FROM!,
    subject: `Invitation to join as ${getRoleName(roleKey)}`,
    html: `
      <h1>You've been invited!</h1>
      <p>You've been invited to join${eventName ? ` ${eventName}` : ""} as a ${getRoleName(roleKey)}.</p>
      <p>Click the link below to accept and complete your registration:</p>
      <a href="${getBaseUrl()}/accept-invitation?token=${token}">Accept Invitation</a>
      <p>This invitation will expire in 7 days.</p>
    `,
  });
  */
}

/**
 * Helper to get the base URL for the application
 */
function getBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:5173";
}

/**
 * Helper to get human-readable role names
 */
function getRoleName(roleKey: string): string {
  const roleNames: Record<string, string> = {
    representative: "Studio Representative",
    judge: "Judge",
    moderator: "Moderator",
  };
  return roleNames[roleKey] || roleKey;
}
