import express from "express";
import { findConferenceSpeakers, searchLinkedInExperts, findSpeakerEmail } from "../speakerFinder.js";

const router = express.Router();

/* ── Find speakers by topic ── */
router.get("/speakers", async (req, res) => {
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

/* ── Find speaker email ── */
router.get("/speakers/email", async (req, res) => {
  const { name, org } = req.query;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const email = await findSpeakerEmail(name, org || "");
    res.json({ email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;