import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/* ── Admin Supabase client (service role – bypasses RLS) ── */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * PUT /api/schedule
 * Body: { conference_id, schedule, editor_position, editor_name }
 *
 * Uses the service-role key so that both organisers AND team leaders
 * can persist schedule updates (the conference table's RLS policy
 * only allows the conference head to UPDATE directly).
 */
router.put("/schedule", async (req, res) => {
  try {
    const { conference_id, schedule, editor_position, editor_name } = req.body;

    if (!conference_id || !Array.isArray(schedule)) {
      return res.status(400).json({ error: "conference_id and schedule[] are required" });
    }

    /* 1. Update the schedule column */
    const { error: updateError } = await supabaseAdmin
      .from("conference")
      .update({ schedule })
      .eq("conference_id", conference_id);

    if (updateError) {
      console.error("Schedule update error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    /* 2. Insert a notification for all conference members */
    const notifMessage = editor_position && editor_name
      ? `Schedule is updated by ${editor_position} - ${editor_name}`
      : "Schedule has been updated";

    await supabaseAdmin.from("notifications").insert([{
      conference_id,
      title: "Schedule Updated",
      message: notifMessage,
      target_role: null,
      created_at: new Date().toISOString(),
    }]);

    return res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/schedule error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
