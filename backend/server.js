import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import express from "express";
import cors from "cors";

import emailRoutes from "./routes/email.js";
import speakerRoutes from "./routes/speakers.js";
import teamRoutes from "./routes/teams.js";
import paperRoutes from "./routes/papers.js";
import conferenceRoutes from "./routes/conferences.js";
import dashboardRoutes from "./routes/dashboards.js";
import authRoutes from "./routes/auth.js";
import scheduleRoutes from "./routes/schedule.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

import { initScheduler } from "./services/schedulerService.js";
import { GROQ_API_KEY, GROQ_MODEL } from "./services/llmService.js";
import { DEFAULT_SENDER } from "./config/email.js";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:3000', 
  'http://localhost:5173',
  /\.vercel\.app$/ // Allow all Vercel subdomains for the project
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));

/* ── Routes ── */
app.use("/api", emailRoutes);
app.use("/api", speakerRoutes);
app.use("/api/teams", authMiddleware, teamRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/conferences", conferenceRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", scheduleRoutes);

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
  
  // Start the background scheduler
  initScheduler();
});