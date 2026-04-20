import express from "express";
import { supabase } from "../lib/supabaseClient.mjs";
import { callLLM } from "../services/llmService.mjs";
import { sendEmailsToRecipients, sendTestEmail, sendEmailWithAttachment } from "../services/emailService.mjs";
import { DEFAULT_SENDER } from "../config/email.mjs";

const router = express.Router();

/**
 * Fetch custom sender config from Supabase for a conference
 */
async function getConferenceSenderConfig(conferenceId) {
  if (!conferenceId) return null;
  const { data, error } = await supabase
    .from("conference")
    .select("email_sender_address, email_sender_name, gmail_client_id, gmail_refresh_token, email_use_default")
    .eq("conference_id", conferenceId)
    .single();

  if (error || !data || data.email_use_default) return null;
  
  // Verify mandatory pieces exist
  if (!data.email_sender_address || !data.gmail_client_id || !data.gmail_refresh_token) return null;

  return {
    email: data.email_sender_address,
    name: data.email_sender_name,
    clientId: data.gmail_client_id,
    refreshToken: data.gmail_refresh_token
  };
}

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
    const customConfig = await getConferenceSenderConfig(req.body.conferenceId);
    const { sent, failed } = await sendEmailsToRecipients(to, subject, body, customConfig);

    if (sent === 0) {
      const firstError = failed[0]?.reason?.message || "Unknown error";
      return res.status(500).json({ error: `Send failed: ${firstError}` });
    }

    res.json({ success: true, sent, failed: failed.length, from: customConfig?.email || DEFAULT_SENDER.email });
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
    const customConfig = await getConferenceSenderConfig(req.body.conferenceId);
    await sendEmailWithAttachment(
      to,
      subject,
      body,
      {
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
        contentType: attachment.contentType || "application/pdf",
      },
      customConfig
    );

    res.json({ success: true, sent: 1, from: customConfig?.email || DEFAULT_SENDER.email });
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
