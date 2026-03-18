import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import { findConferenceSpeakers, searchLinkedInExperts } from "./speakerFinder.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ══════════════════════════════════════════════════════════
   PLATFORM DEFAULT SENDER
   All emails use these credentials from .env
   No Supabase lookup needed for sending
══════════════════════════════════════════════════════════ */
const DEFAULT_SENDER = {
  email:        process.env.DEFAULT_SENDER_EMAIL        || "",
  name:         process.env.DEFAULT_SENDER_NAME         || "Conference Hub",
  clientId:     process.env.DEFAULT_GMAIL_CLIENT_ID     || "",
  clientSecret: process.env.DEFAULT_GMAIL_CLIENT_SECRET || "",
  refreshToken: process.env.DEFAULT_GMAIL_REFRESH_TOKEN || "",
};

function createDefaultTransporter() {
  if (!DEFAULT_SENDER.email || !DEFAULT_SENDER.clientId || !DEFAULT_SENDER.refreshToken) {
    throw new Error(
      "Gmail not configured. Add DEFAULT_SENDER_EMAIL, DEFAULT_GMAIL_CLIENT_ID, " +
      "DEFAULT_GMAIL_CLIENT_SECRET, DEFAULT_GMAIL_REFRESH_TOKEN to backend/.env"
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type:         "OAuth2",
      user:         DEFAULT_SENDER.email,
      clientId:     DEFAULT_SENDER.clientId,
      clientSecret: DEFAULT_SENDER.clientSecret,
      refreshToken: DEFAULT_SENDER.refreshToken,
    },
  });
}

/* ══════════════════════════════════════════════════════════
   LLM
══════════════════════════════════════════════════════════ */
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL      = "tinyllama";

async function callLLM(prompt) {
  const res = await axios.post(
    OLLAMA_URL,
    { model: MODEL, prompt, stream: false, temperature: 0.6 },
    { timeout: 120000 }
  );
  if (!res.data?.response) throw new Error("Invalid LLM response");
  return res.data.response.trim();
}

/* ══════════════════════════════════════════════════════════
   SPEAKERS
══════════════════════════════════════════════════════════ */
app.get("/api/speakers", async (req, res) => {
  const topic  = req.query.topic  || "Artificial Intelligence";
  const limit  = parseInt(req.query.limit)  || 10;
  const source = parseInt(req.query.source) || 5;

  try {
    const result = source === 3
      ? await searchLinkedInExperts(topic)
      : await findConferenceSpeakers(topic, limit, source);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   EMAIL GENERATION
══════════════════════════════════════════════════════════ */
app.post("/api/generate-email", async (req, res) => {
  const { intent, tone, subject, recipientDescription, conferenceTitle, senderRole } = req.body;
  if (!intent) return res.status(400).json({ error: "intent is required" });

  try {
    let finalSubject = subject?.trim();
    if (!finalSubject) {
      const sp = `Conference: ${conferenceTitle}\nRecipients: ${recipientDescription}\nPurpose: ${intent}\n\nWrite a concise professional email subject line. Return ONLY the subject line.`;
      finalSubject = (await callLLM(sp)).replace(/^(subject:|re:|fw:)/i, "").trim();
    }

    const bp = `You are writing a ${tone} email on behalf of the ${senderRole} of "${conferenceTitle}".\n\nRecipients: ${recipientDescription}\nPurpose: ${intent}\n\nWrite a complete professional email body with greeting, message, next steps, and sign-off. Under 200 words. No subject line. Start with the greeting.`;
    const body = await callLLM(bp);

    res.json({ subject: finalSubject, body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   EMAIL SEND
   Uses default sender directly — no Supabase lookup
══════════════════════════════════════════════════════════ */
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to?.length)       return res.status(400).json({ error: "to array is required" });
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

  console.log(`\nSend → recipients: ${to.length}, subject: "${subject}"`);
  console.log(`Recipients:`, to);

  try {
    const transporter = createDefaultTransporter();
    const fromField   = `"${DEFAULT_SENDER.name}" <${DEFAULT_SENDER.email}>`;
    console.log(`From: ${fromField}`);

    const results = await Promise.allSettled(
      to.map(email =>
        transporter.sendMail({ from: fromField, to: email, subject, text: body })
      )
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected");
    failed.forEach(f => console.error("  ❌ Failed:", f.reason?.message));
    console.log(`✅ Done: ${sent}/${to.length} sent`);

    if (sent === 0) {
      const firstError = failed[0]?.reason?.message || "Unknown error";
      return res.status(500).json({ error: `Send failed: ${firstError}` });
    }

    res.json({ success: true, sent, failed: failed.length, from: DEFAULT_SENDER.email });
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(422).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   TEST CONNECTION
══════════════════════════════════════════════════════════ */
app.post("/api/test-email", async (req, res) => {
  try {
    const transporter = createDefaultTransporter();
    await transporter.sendMail({
      from:    `"${DEFAULT_SENDER.name}" <${DEFAULT_SENDER.email}>`,
      to:      DEFAULT_SENDER.email,
      subject: "✅ Conference Hub — email connection test",
      text:    `Gmail is correctly configured for Conference Hub.\nSender: ${DEFAULT_SENDER.email}`,
    });
    console.log(`✅ Test email sent to ${DEFAULT_SENDER.email}`);
    res.json({ success: true, sentTo: DEFAULT_SENDER.email });
  } catch (err) {
    console.error("Test error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════
   HEALTH
══════════════════════════════════════════════════════════ */
app.get("/health", (req, res) => {
  res.json({
    status:        "ok",
    defaultSender: DEFAULT_SENDER.email    || "NOT configured",
    gmailClient:   DEFAULT_SENDER.clientId ? "configured" : "NOT configured",
    refreshToken:  DEFAULT_SENDER.refreshToken ? "configured" : "NOT configured",
  });
});

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 Conference API  →  http://localhost:${PORT}`);
  console.log(`   Default sender:  ${DEFAULT_SENDER.email     || "❌ NOT SET"}`);
  console.log(`   Gmail client:    ${DEFAULT_SENDER.clientId  ? "✅ set" : "❌ NOT SET"}`);
  console.log(`   Refresh token:   ${DEFAULT_SENDER.refreshToken ? "✅ set" : "❌ NOT SET"}`);
});