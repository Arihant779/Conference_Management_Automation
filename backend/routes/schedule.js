import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/* ── Admin Supabase client (service role – bypasses RLS) ── */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Helper: Converts "09:00 AM" or "14:30" to minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes);

  if (period) {
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

/**
 * Helper: Finds overlapping sessions in a schedule array
 */
function findScheduleConflicts(schedule) {
  const conflicts = [];

  schedule.forEach((day, dIdx) => {
    const sessionsByRoom = {};

    // Group by room
    day.sessions?.forEach((s, sIdx) => {
      const room = (s.room || "No Room").trim();
      if (!sessionsByRoom[room]) sessionsByRoom[room] = [];
      
      const startTime = parseTimeToMinutes(s.time);
      const duration = parseInt(s.duration) || 0;
      
      if (startTime !== null && duration > 0) {
        sessionsByRoom[room].push({
          ...s,
          startTime,
          endTime: startTime + duration,
          id: `${dIdx}-${sIdx}`
        });
      }
    });

    // Check overlaps within each room
    for (const room in sessionsByRoom) {
      const sorted = sessionsByRoom[room].sort((a, b) => a.startTime - b.startTime);
      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        if (cur.endTime > next.startTime) {
          conflicts.push(`Conflict on ${day.day || `Day ${dIdx+1}`} in ${room}: "${cur.title}" ends at ${cur.endTime}m but "${next.title}" starts at ${next.startTime}m.`);
        }
      }
    }
  });

  return conflicts;
}

/**
 * PUT /api/schedule
 * Body: { conference_id, schedule, editor_position, editor_name, force, notify }
 */
router.put("/schedule", async (req, res) => {
  try {
    const { conference_id, schedule, editor_position, editor_name, force, notify = true } = req.body;

    if (!conference_id || !Array.isArray(schedule)) {
      return res.status(400).json({ error: "conference_id and schedule[] are required" });
    }

    /* 1. Accidental Wipe Protection */
    if (schedule.length === 0 && !force) {
      const { data: existing } = await supabaseAdmin
        .from("conference")
        .select("schedule")
        .eq("conference_id", conference_id)
        .single();
      
      if (existing?.schedule?.length > 0) {
        return res.status(400).json({ 
          error: "Schedule wipe detected. Use 'force: true' to confirm this action.",
          requiresForce: true 
        });
      }
    }

    /* 2. Conflict Detection */
    const conflicts = findScheduleConflicts(schedule);
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        error: "Scheduling conflicts detected", 
        details: conflicts 
      });
    }

    /* 3. Update the schedule column */
    const { error: updateError } = await supabaseAdmin
        .from("conference")
        .update({ schedule })
        .eq("conference_id", conference_id);

    if (updateError) {
      console.error("Schedule update error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    /* 4. Notification (Optional) */
    if (notify) {
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
    }

    return res.json({ success: true, updated: true });
  } catch (err) {
    console.error("PUT /api/schedule error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
