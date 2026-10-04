export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  process.stdout.write(
    `[mail] to=${message.to} subject="${message.subject}"\n${message.text}\n`,
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Reset your password',
    text: `We received a request to reset your password.\n\nReset it here (valid for a short time): ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
  });
}
