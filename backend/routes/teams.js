import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * Helper to ensure a user is in conference_user before team operations.
 * Auto-registers with 'invited' role if missing.
 */
async function ensureConferenceMember(conference_id, user_id) {
  const { data: existing } = await supabase
    .from("conference_user")
    .select("id")
    .eq("conference_id", conference_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) return existing.id;

  // Fetch basic user info
  const { data: user } = await supabase.from("users").select("user_email, user_name").eq("user_id", user_id).single();
  
  const { data: inserted, error } = await supabase
    .from("conference_user")
    .insert([{
      conference_id,
      user_id,
      email: user?.user_email || "",
      full_name: user?.user_name || "",
      role: "invited",
      joined_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return inserted.id;
}

/**
 * 01, 02, 03, 09, 11, 13, 16, 17, 19
 * Create Team & Initial Members
 */
router.post("/create", async (req, res) => {
  const { conference_id, name, description, color, head_id, members, type } = req.body;

  if (!conference_id || !name || name.trim() === "") {
    return res.status(400).json({ error: "ERROR_MISSING_NAME" });
  }

  try {
    // 1. Check Collision (Case 13)
    const { data: collision } = await supabase
      .from("conference_teams")
      .select("id")
      .eq("conference_id", conference_id)
      .eq("name", name)
      .maybeSingle();

    if (collision) return res.status(400).json({ error: "ERROR_TEAM_NAME_EXISTS" });

    // 2. Create Team
    const { data: team, error } = await supabase
      .from("conference_teams")
      .insert([{
        conference_id,
        name,
        description: description || "",
        color: color || "#6366f1",
        head_id: head_id || null,
        created_at: new Date().toISOString()
      }])
      .select().single();

    if (error) throw error;

    // 3. Process Members (Case 02: Dedupe, Case 03: Register)
    if (members && Array.isArray(members)) {
      const uniqueIds = [...new Set(members)];
      const inserts = [];
      for (const uid of uniqueIds) {
        const confUserId = await ensureConferenceMember(conference_id, uid);
        inserts.push({
          team_id: team.id,
          conference_id,
          user_id: uid,
          conference_user_id: confUserId,
          status: "pending"
        });
      }
      if (inserts.length > 0) {
        await supabase.from("team_members").insert(inserts);
      }
    }

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 06, 11, 16, 19
 * Update Team Config
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, color, head_id } = req.body;

  try {
    const { data: team, error } = await supabase
      .from("conference_teams")
      .update({ name, description, color, head_id })
      .eq("id", id)
      .select().single();

    if (error) throw error;
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 12: Delete Team (Cascade Cleanup)
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Manual cleanup of members (optional if DB handles cascade)
    await supabase.from("team_members").delete().eq("team_id", id);
    const { error } = await supabase.from("conference_teams").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 07, 08, 15: Sync Members
 */
router.post("/:id/sync", async (req, res) => {
  const { id } = req.params;
  const { conference_id, adds, removes } = req.body;

  try {
    if (removes && Array.isArray(removes)) {
      await supabase.from("team_members").delete().eq("team_id", id).in("user_id", removes);
    }
    if (adds && Array.isArray(adds)) {
      const inserts = [];
      for (const uid of adds) {
        const cuid = await ensureConferenceMember(conference_id, uid);
        inserts.push({
          team_id: id,
          conference_id,
          user_id: uid,
          conference_user_id: cuid,
          status: "pending"
        });
      }
      if (inserts.length > 0) await supabase.from("team_members").upsert(inserts, { onConflict: 'team_id,user_id' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10, 15, 18, 20: Status Dashboard
 */
router.get("/:id/status", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: members, error } = await supabase.from("team_members").select("status").eq("team_id", id);
    if (error) throw error;

    const stats = {
      total: members.length,
      accepted: members.filter(m => m.status === 'accepted').length,
      rejected: members.filter(m => m.status === 'rejected').length,
      pending: members.filter(m => m.status === 'pending').length
    };

    stats.formationProgress = stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0;
    stats.isFullyFormed = stats.total > 0 && stats.accepted === stats.total;

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 04, 05, 14: Respond to Invitation
 */
router.post("/invite/respond", async (req, res) => {
  const { team_id, user_id, status } = req.body; // status: 'accepted' | 'rejected'
  try {
    if (status === 'rejected') {
      // 1. Get the conference ID associated with this team membership first
      const { data: memberRecord, error: fetchErr } = await supabase
        .from("team_members")
        .select("conference_id")
        .eq("team_id", team_id)
        .eq("user_id", user_id)
        .single();
      
      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      // 2. Delete from team_members
      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", team_id)
        .eq("user_id", user_id);

      // 3. Delete from conference_user if we found a conference ID
      if (memberRecord?.conference_id) {
        await supabase
          .from("conference_user")
          .delete()
          .eq("conference_id", memberRecord.conference_id)
          .eq("user_id", user_id);
      }
      
      return res.json({ success: true, action: 'deleted' });
    }

    // Standard acceptance logic
    const { error } = await supabase
      .from("team_members")
      .update({ status })
      .eq("team_id", team_id)
      .eq("user_id", user_id);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
