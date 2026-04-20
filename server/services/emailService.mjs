import nodemailer from "nodemailer";
import { createDefaultTransporter, DEFAULT_SENDER } from "../config/email.mjs";

export function createCustomTransporter(config) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: config.email,
      clientId: config.clientId,
      clientSecret: config.clientSecret || DEFAULT_SENDER.clientSecret,
      refreshToken: config.refreshToken,
    },
  });
}

export async function sendEmailsToRecipients(to, subject, body, customConfig = null) {
  const transporter = customConfig ? createCustomTransporter(customConfig) : createDefaultTransporter();
  const senderName = customConfig?.name || DEFAULT_SENDER.name;
  const senderEmail = customConfig?.email || DEFAULT_SENDER.email;
  const fromField = `"${senderName}" <${senderEmail}>`;

  const results = await Promise.allSettled(
    to.map(email =>
      transporter.sendMail({ from: fromField, to: email, subject, text: body })
    )
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected");
  failed.forEach(f => console.error("  Failed:", f.reason?.message));
  console.log(`Done: ${sent}/${to.length} sent`);

  return { sent, failed };
}

export async function sendTestEmail() {
  const transporter = createDefaultTransporter();
  await transporter.sendMail({
    from: `"${DEFAULT_SENDER.name}" <${DEFAULT_SENDER.email}>`,
    to: DEFAULT_SENDER.email,
    subject: "Conference Hub email connection test",
    text: `Gmail is correctly configured for Conference Hub.\nSender: ${DEFAULT_SENDER.email}`,
  });
  console.log(`Test email sent to ${DEFAULT_SENDER.email}`);
  return DEFAULT_SENDER.email;
}

/**
 * Send a single email with a file attachment (e.g. certificate PDF).
 * @param {string} to          – recipient email
 * @param {string} subject     – email subject
 * @param {string} body        – plain-text email body
 * @param {Object} attachment  – { filename, content (Buffer), contentType }
 */
export async function sendEmailWithAttachment(to, subject, body, attachment, customConfig = null) {
  const transporter = customConfig ? createCustomTransporter(customConfig) : createDefaultTransporter();
  const senderName = customConfig?.name || DEFAULT_SENDER.name;
  const senderEmail = customConfig?.email || DEFAULT_SENDER.email;
  const fromField = `"${senderName}" <${senderEmail}>`;

  await transporter.sendMail({
    from: fromField,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType || "application/pdf",
      },
    ],
  });

  console.log(`Email with attachment sent to ${to} (${attachment.filename})`);
}
