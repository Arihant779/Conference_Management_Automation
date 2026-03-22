import { createDefaultTransporter, DEFAULT_SENDER } from "../config/email.js";

export async function sendEmailsToRecipients(to, subject, body) {
  const transporter = createDefaultTransporter();
  const fromField   = `"${DEFAULT_SENDER.name}" <${DEFAULT_SENDER.email}>`;

  const results = await Promise.allSettled(
    to.map(email =>
      transporter.sendMail({ from: fromField, to: email, subject, text: body })
    )
  );

  const sent   = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected");
  failed.forEach(f => console.error("  Failed:", f.reason?.message));
  console.log(`Done: ${sent}/${to.length} sent`);

  return { sent, failed };
}

export async function sendTestEmail() {
  const transporter = createDefaultTransporter();
  await transporter.sendMail({
    from:    `"${DEFAULT_SENDER.name}" <${DEFAULT_SENDER.email}>`,
    to:      DEFAULT_SENDER.email,
    subject: "Conference Hub email connection test",
    text:    `Gmail is correctly configured for Conference Hub.\nSender: ${DEFAULT_SENDER.email}`,
  });
  console.log(`Test email sent to ${DEFAULT_SENDER.email}`);
  return DEFAULT_SENDER.email;
}