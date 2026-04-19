import "dotenv/config";
import express from "express";
import cors from "cors";

import emailRoutes from "../server/routes/email.mjs";
import speakerRoutes from "../server/routes/speakers.mjs";
import teamRoutes from "../server/routes/teams.mjs";
import paperRoutes from "../server/routes/papers.mjs";
import conferenceRoutes from "../server/routes/conferences.mjs";
import dashboardRoutes from "../server/routes/dashboards.mjs";
import authRoutes from "../server/routes/auth.mjs";
import scheduleRoutes from "../server/routes/schedule.mjs";
import { authMiddleware } from "../server/middleware/authMiddleware.mjs";

import { GROQ_API_KEY, GROQ_MODEL } from "../server/services/llmService.mjs";
import { DEFAULT_SENDER } from "../server/config/email.mjs";
import cronHandler from "../server/cron/process-emails.mjs";

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
