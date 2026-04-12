import "dotenv/config";
import express from "express";
import cors from "cors";

import emailRoutes from "./routes/email.js";
import speakerRoutes from "./routes/speakers.js";
import { GROQ_API_KEY, GROQ_MODEL } from "./services/llmService.js";
import { DEFAULT_SENDER } from "./config/email.js";

const app = express();

app.use(cors({
  origin: "*", // Allow all origins during development
}));
app.use(express.json({ limit: "50mb" }));

/* ── Routes ── */
app.use("/api", emailRoutes);
app.use("/api", speakerRoutes);

/* ── Health check ── */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    llm: GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : "GROQ_API_KEY not set",
    defaultSender: DEFAULT_SENDER.email || "NOT configured",
    gmailClient: DEFAULT_SENDER.clientId ? "configured" : "NOT configured",
    refreshToken: DEFAULT_SENDER.refreshToken ? "configured" : "NOT configured",
  });
});

/* ── Start ── */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n Conference API  ->  http://localhost:${PORT}`);
  console.log(`   LLM:             ${GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : "GROQ_API_KEY not set"}`);
  console.log(`   Default sender:  ${DEFAULT_SENDER.email || "NOT SET"}`);
  console.log(`   Gmail client:    ${DEFAULT_SENDER.clientId ? "set" : "NOT SET"}`);
  console.log(`   Refresh token:   ${DEFAULT_SENDER.refreshToken ? "set" : "NOT SET"}`);
});