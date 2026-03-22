import express from "express";
import { findConferenceSpeakers, searchLinkedInExperts } from "../speakerFinder.js";

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

export default router;