import express from "express";
import cors from "cors";
import axios from "axios";
import { findConferenceSpeakers, searchLinkedInExperts } from "./speakerFinder.js";

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "tinyllama";

/* ======================
LLM HELPER
====================== */

async function callLLM(prompt) {
  const res = await axios.post(
    OLLAMA_URL,
    { model: MODEL, prompt, stream: false, temperature: 0.6 },
    { timeout: 120000 }
  );
  if (!res.data?.response) throw new Error("Invalid LLM response");
  return res.data.response.trim();
}

/* ======================
SPEAKERS ENDPOINT
====================== */

app.get("/api/speakers", async (req, res) => {
  const topic  = req.query.topic  || "Artificial Intelligence";
  const limit  = parseInt(req.query.limit)  || 10;
  const source = parseInt(req.query.source) || 5;

  console.log(`\nFinding speakers → topic: "${topic}", limit: ${limit}, source: ${source}`);

  try {
    let result = [];
    if (source === 3) {
      result = await searchLinkedInExperts(topic);
    } else {
      result = await findConferenceSpeakers(topic, limit, source);
    }
    console.log(`Found ${result.length} speakers`);
    res.json(result);
  } catch (err) {
    console.error("Speaker search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
EMAIL GENERATION ENDPOINT
====================== */

app.post("/api/generate-email", async (req, res) => {
  const {
    intent,
    tone,
    subject,
    recipientDescription,
    conferenceTitle,
    senderRole,
  } = req.body;

  if (!intent) {
    return res.status(400).json({ error: "intent is required" });
  }

  console.log(`\nGenerating email → tone: ${tone}, recipients: ${recipientDescription}`);

  try {
    // Generate subject if not provided
    let finalSubject = subject;
    if (!finalSubject) {
      const subjectPrompt = `
Conference: ${conferenceTitle}
Recipients: ${recipientDescription}
Purpose: ${intent}

Write a concise, professional email subject line for this conference email.
Return ONLY the subject line, nothing else. No quotes, no "Subject:" prefix.
`;
      finalSubject = await callLLM(subjectPrompt);
      finalSubject = finalSubject.replace(/^(subject:|re:|fw:)/i, '').trim();
    }

    // Generate email body
    const bodyPrompt = `
You are writing a ${tone} email on behalf of the ${senderRole} of "${conferenceTitle}".

Recipients: ${recipientDescription}
Purpose: ${intent}
Tone: ${tone}

Write a complete, professional email body. Include:
- A proper greeting
- Clear main message addressing the purpose
- Any relevant next steps or calls to action
- A professional sign-off with the conference name

Keep it concise (under 200 words). Do NOT include a subject line.
Write ONLY the email body, starting directly with the greeting.
`;

    const body = await callLLM(bodyPrompt);

    console.log("Email generated successfully");
    res.json({ subject: finalSubject, body });
  } catch (err) {
    console.error("Email generation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
EMAIL SEND ENDPOINT
(wire your actual email service here)
====================== */

app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, conferenceId, senderRole } = req.body;

  if (!to?.length || !subject || !body) {
    return res.status(400).json({ error: "to, subject, and body are required" });
  }

  console.log(`\nSending email → to: ${to.length} recipients, subject: "${subject}"`);

  try {
    // TODO: plug in your email service here
    // Example with nodemailer:
    //
    // import nodemailer from 'nodemailer';
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ from: 'noreply@yourconf.com', to: to.join(','), subject, text: body });
    //
    // Example with SendGrid:
    // await sgMail.sendMultiple({ to, from: 'noreply@yourconf.com', subject, text: body });

    console.log("Recipients:", to);
    console.log("Subject:", subject);
    console.log("Body preview:", body.substring(0, 100) + "...");

    await new Promise(r => setTimeout(r, 800));

    res.json({ success: true, sent: to.length });
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
HEALTH CHECK
====================== */

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ======================
START
====================== */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\nConference API running on http://localhost:${PORT}`);
  console.log(`Speakers:   GET  http://localhost:${PORT}/api/speakers?topic=AI&limit=5`);
  console.log(`Email gen:  POST http://localhost:${PORT}/api/generate-email`);
  console.log(`Email send: POST http://localhost:${PORT}/api/send-email`);
});