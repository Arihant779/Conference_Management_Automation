import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * Get User Hub Statistics (Unified)
 */
router.get("/user-hub/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Get conferences user is involved in
    const { data: involvements, error: invError } = await supabase
      .from("conference_user")
      .select("conference_id, role")
      .eq("user_id", userId);

    if (invError) throw invError;

    const myConfsCount = involvements.length;
    const organizerCount = involvements.filter(i => i.role === 'organizer').length;
    const reviewerCount = involvements.filter(i => i.role === 'reviewer').length;
    const memberCount = involvements.filter(i => i.role === 'member' || i.role === 'invited').length;

    // 2. Get available conferences (not joined)
    const joinedIds = involvements.map(i => i.conference_id);
    const { count: availableCount, error: availError } = await supabase
      .from("conference")
      .select("*", { count: 'exact', head: true })
      .not("conference_id", "in", `(${joinedIds.join(",") || '00000000-0000-0000-0000-000000000000'})`);

    if (availError) throw availError;

    // 3. Get volunteer preferences
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("volunteer_domains, volunteer_roles, user_name, user_email")
      .eq("user_id", userId)
      .maybeSingle();

    if (userError) throw userError;

    res.json({
      stats: {
        myConfs: myConfsCount,
        organizer: organizerCount,
        reviewer: reviewerCount,
        member: memberCount,
        available: availableCount || 0
      },
      profile: userData || {},
      involvements: involvements
    });

  } catch (err) {
    console.error("[USER-HUB ERROR]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update Volunteer Preferences
 */
router.post("/user-hub/preferences", async (req, res) => {
  const { userId, domains, roles } = req.body;
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        volunteer_domains: domains,
        volunteer_roles: roles
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
