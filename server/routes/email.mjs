import express from "express";
import { callLLM } from "../services/llmService.mjs";
import { sendEmailsToRecipients, sendTestEmail, sendEmailWithAttachment } from "../services/emailService.mjs";

const router = express.Router();

/* ── Generate email subject + body via LLM ── */
router.post("/generate-email", async (req, res) => {
  const { intent, tone, subject, recipientDescription, conferenceTitle, senderRole } = req.body;
  if (!intent) return res.status(400).json({ error: "intent is required" });

  try {
    const hasSubject = subject?.trim();

    const prompt = `
You are writing a ${tone} email on behalf of the ${senderRole} of the conference "${conferenceTitle}".

Recipients: ${recipientDescription}
Purpose: ${intent}
${hasSubject ? `Subject (already provided — use exactly as-is): ${subject}` : ""}

Your task:
1. ${hasSubject ? "Use the subject line provided above exactly as-is." : "Write a concise professional subject line."}
2. Write a complete professional email body with greeting, message, next steps, and sign-off. Under 200 words. Do NOT include the subject line in the body.

Respond in this exact format with no extra text before or after:
SUBJECT: <subject line here>
BODY:
<email body here>
`;

    const raw = await callLLM(prompt);

    const subjectMatch = raw.match(/^SUBJECT:\s*(.+)/im);
    const bodyMatch = raw.match(/^BODY:\s*([\s\S]+)/im);

    const finalSubject = hasSubject
      ? subject.trim()
      : (subjectMatch?.[1]?.trim() || "Conference Update");

    const finalBody = bodyMatch?.[1]?.trim() || raw;

    res.json({ subject: finalSubject, body: finalBody });
  } catch (err) {
    console.error("Generate email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Send email to one or more recipients ── */
router.post("/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to?.length) return res.status(400).json({ error: "to array is required" });
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

  console.log(`\nSend -> recipients: ${to.length}, subject: "${subject}"`);

  try {
    const { sent, failed } = await sendEmailsToRecipients(to, subject, body);

    if (sent === 0) {
      const firstError = failed[0]?.reason?.message || "Unknown error";
      return res.status(500).json({ error: `Send failed: ${firstError}` });
    }

    const { DEFAULT_SENDER } = await import("../config/email.mjs");
    res.json({ success: true, sent, failed: failed.length, from: DEFAULT_SENDER.email });
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(422).json({ error: err.message });
  }
});

/* ── Send email with attachment (e.g. certificate PDF) ── */
router.post("/send-email-with-attachment", async (req, res) => {
  const { to, subject, body, attachment } = req.body;

  if (!to) return res.status(400).json({ error: "to is required" });
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });
  if (!attachment?.content || !attachment?.filename) {
    return res.status(400).json({ error: "attachment with filename and content (base64) is required" });
  }

  console.log(`\nSend w/ attachment -> to: ${to}, subject: "${subject}", file: ${attachment.filename}`);

  try {
    await sendEmailWithAttachment(
      to,
      subject,
      body,
      {
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
        contentType: attachment.contentType || "application/pdf",
      }
    );

    res.json({ success: true, sent: 1 });
  } catch (err) {
    console.error("Send w/ attachment error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Test Gmail connection ── */
router.post("/test-email", async (req, res) => {
  try {
    const sentTo = await sendTestEmail();
    res.json({ success: true, sentTo });
  } catch (err) {
    console.error("Test error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
