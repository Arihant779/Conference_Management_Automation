import "dotenv/config";
import express from "express";
import cors from "cors";

import emailRoutes from "../server/routes/email.js";
import speakerRoutes from "../server/routes/speakers.js";
import teamRoutes from "../server/routes/teams.js";
import paperRoutes from "../server/routes/papers.js";
import conferenceRoutes from "../server/routes/conferences.js";
import dashboardRoutes from "../server/routes/dashboards.js";
import authRoutes from "../server/routes/auth.js";
import scheduleRoutes from "../server/routes/schedule.js";
import { authMiddleware } from "../server/middleware/authMiddleware.js";

import { GROQ_API_KEY, GROQ_MODEL } from "../server/services/llmService.js";
import { DEFAULT_SENDER } from "../server/config/email.js";
import cronHandler from "../server/cron/process-emails.js";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:3000', 
  'http://localhost:5173',
  /\.vercel\.app$/ 
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return callback(new Error(`CORS blocked for: ${origin}`), false);
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

/* ── Cron ── */
app.all("/api/cron/process-emails", cronHandler);

/* ── Health check ── */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    llm: GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : "MISSING",
    email: DEFAULT_SENDER.email || "MISSING"
  });
});

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`\n 🚀 Local Development API server ready at http://localhost:${PORT}/api`);
  });
}
