import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import { findConferenceSpeakers, searchLinkedInExperts } from "./speakerFinder.js";

const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
}));
app.use(express.json());

/* ══════════════════════════════════════════════════════════
   PLATFORM DEFAULT SENDER
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
   GROQ LLM  (free tier: 30 req/min, 14,400 req/day — NO credit card needed)
   Model: llama-3.3-70b-versatile  (best quality on free tier)
   Get your key at: https://console.groq.com
══════════════════════════════════════════════════════════ */
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

async function callLLM(prompt, retries = 3) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set. Get a free key at https://console.groq.com " +
      "and add it to backend/.env"
    );
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.post(
        GROQ_URL,
        {
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const text = res.data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Invalid Groq response");
      return text.trim();
    } catch (err) {
      if (err.response?.status === 429 && i < retries) {
        const waitSec = (i + 1) * 5;
        console.log(`Rate limit hit — waiting ${waitSec}s before retry ${i + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
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
   Single LLM call for subject + body to minimize API usage
══════════════════════════════════════════════════════════ */
app.post("/api/generate-email", async (req, res) => {
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
    const bodyMatch    = raw.match(/^BODY:\s*([\s\S]+)/im);

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

/* ══════════════════════════════════════════════════════════
   EMAIL SEND
══════════════════════════════════════════════════════════ */
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to?.length)       return res.status(400).json({ error: "to array is required" });
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

  console.log(`\nSend -> recipients: ${to.length}, subject: "${subject}"`);

  try {
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
      subject: "Conference Hub email connection test",
      text:    `Gmail is correctly configured for Conference Hub.\nSender: ${DEFAULT_SENDER.email}`,
    });
    console.log(`Test email sent to ${DEFAULT_SENDER.email}`);
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
    llm:           GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : "GROQ_API_KEY not set",
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
  console.log(`\n Conference API  ->  http://localhost:${PORT}`);
  console.log(`   LLM:             ${GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : "GROQ_API_KEY not set"}`);
  console.log(`   Default sender:  ${DEFAULT_SENDER.email     || "NOT SET"}`);
  console.log(`   Gmail client:    ${DEFAULT_SENDER.clientId  ? "set" : "NOT SET"}`);
  console.log(`   Refresh token:   ${DEFAULT_SENDER.refreshToken ? "set" : "NOT SET"}`);
});