import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import { sendEmailsToRecipients } from "../services/emailService.js";

const router = express.Router();

/**
 * Helper to ensure a user is in conference_user before team operations.
 * - If user already exists, upgrades 'attendee' or blank roles to 'invited'.
 * - If user is not in the conference at all, inserts them with 'invited' role.
 * Returns the conference_user.id in all cases.
 */
async function ensureConferenceMember(conference_id, user_id) {
  const { data: existing } = await supabase
    .from("conference_user")
    .select("id, role")
    .eq("conference_id", conference_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) {
    // Upgrade attendee / role-less users to 'invited' so they can respond
    if (existing.role === 'attendee' || !existing.role) {
      await supabase
        .from("conference_user")
        .update({ role: "invited" })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  // User not yet in this conference — create entry with 'invited' role
  const { data: userInfo } = await supabase
    .from("users")
    .select("user_email, user_name")
    .eq("user_id", user_id)
    .single();

  const { data: inserted, error } = await supabase
    .from("conference_user")
    .insert([{
      conference_id,
      user_id,
      email: userInfo?.user_email || "",
      full_name: userInfo?.user_name || "",
      role: "invited",
      joined_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return inserted.id;
}

/**
 * Helper to notify newly added team members via Email and In-App notification.
 */
async function notifyNewMembers(conference_id, team_id, user_ids) {
  if (!user_ids || user_ids.length === 0) return;

  try {
    // 1. Get info
    const { data: conf } = await supabase.from("conference").select("title").eq("conference_id", conference_id).single();
    const { data: team } = await supabase.from("conference_teams").select("name").eq("id", team_id).single();
    const { data: users } = await supabase.from("users").select("user_id, user_email").in("user_id", user_ids);

    if (!conf || !team || !users) return;

    const confTitle = conf.title;
    const teamName = team.name;

    // 2. Insert In-App Notifications (Targeted to each user, avoiding duplicates)
    const notifs = [];
    for (const u of users) {
      // Check for existing pending invitation
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("conference_id", conference_id)
        .eq("target_user_id", u.user_id)
        .eq("target_team_id", team_id)
        .eq("title", "New Team Invitation")
        .maybeSingle();

      if (!existing) {
        notifs.push({
          conference_id,
          title: "New Team Invitation",
          message: `You have been invited to join the ${teamName} team for the conference "${confTitle}".`,
          target_role: null,
          target_user_id: u.user_id,
          target_team_id: team_id,
          created_at: new Date().toISOString()
        });
      }
    }

    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    // 3. Send Invitation Emails
    const subject = `Invitation: Join the ${teamName} team at ${confTitle}`;
    const body = `Hello!

You have been invited to join the "${teamName}" team for the upcoming conference "${confTitle}".

Please log in to your dashboard to view the invitation and respond.
Link: ${process.env.FRONTEND_URL || "http://localhost:3000"}

Best regards,
Conference Management Team`;

    const emails = users.map(u => u.user_email).filter(Boolean);
    if (emails.length > 0) {
      await sendEmailsToRecipients(emails, subject, body);
    }
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
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
    // 1. Check Collision
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

    // 3. Process Members
    if (members && Array.isArray(members)) {
      const uniqueIds = [...new Set(members)];
      const inserts = [];
      const actualNewIds = [];
      for (const uid of uniqueIds) {
        const confUserId = await ensureConferenceMember(conference_id, uid);
        inserts.push({
          team_id: team.id,
          conference_id,
          user_id: uid,
          conference_user_id: confUserId,
          status: "pending"
        });
        actualNewIds.push(uid);
      }
      if (inserts.length > 0) {
        await supabase.from("team_members").insert(inserts);
        await notifyNewMembers(conference_id, team.id, actualNewIds);
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
    // 1. Get current team info to find conference_id
    const { data: currentTeam } = await supabase.from("conference_teams").select("conference_id").eq("id", id).single();
    if (!currentTeam) return res.status(404).json({ error: "Team not found" });

    // 2. Check Collision (if name changed)
    if (name) {
      const { data: collision } = await supabase
        .from("conference_teams")
        .select("id")
        .eq("conference_id", currentTeam.conference_id)
        .eq("name", name)
        .neq("id", id)
        .maybeSingle();
      if (collision) return res.status(400).json({ error: "ERROR_TEAM_NAME_EXISTS" });
    }

    // 3. Update Team Config
    const { data: team, error } = await supabase
      .from("conference_teams")
      .update({ name, description, color, head_id })
      .eq("id", id)
      .select().single();

    if (error) throw error;

    // 4. Ensure Head is a member
    if (head_id) {
       const { data: alreadyMember } = await supabase
         .from("team_members")
         .select("id")
         .eq("team_id", id)
         .eq("user_id", head_id)
         .maybeSingle();

       if (!alreadyMember) {
         const cuid = await ensureConferenceMember(currentTeam.conference_id, head_id);
         await supabase.from("team_members").insert([{
           team_id: id,
           conference_id: currentTeam.conference_id,
           user_id: head_id,
           conference_user_id: cuid,
           status: "pending"
         }]);
         await notifyNewMembers(currentTeam.conference_id, id, [head_id]);
       }
    }

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
    await supabase.from("team_members").delete().eq("team_id", id);
    await supabase.from("conference_tasks").update({ team_id: null }).eq("team_id", id);
    // Cleanup pending invitations
    await supabase.from("notifications").delete().eq("target_team_id", id).eq("title", "New Team Invitation");
    
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
      // 1. Delete membership
      await supabase.from("team_members").delete().eq("team_id", id).in("user_id", removes);

      // 2. Zombie Head Check: If head is removed, nullify head_id in conference_teams
      const { data: teamInfo } = await supabase.from("conference_teams").select("head_id").eq("id", id).single();
      if (teamInfo && removes.includes(teamInfo.head_id)) {
        await supabase.from("conference_teams").update({ head_id: null }).eq("id", id);
      }
    }
    if (adds && Array.isArray(adds)) {
      const inserts = [];
      const actualNewIds = [];
      for (const uid of adds) {
        // Skip if already a member
        const { data: already } = await supabase.from("team_members").select("id").eq("team_id", id).eq("user_id", uid).maybeSingle();
        if (already) continue;

        const cuid = await ensureConferenceMember(conference_id, uid);
        inserts.push({ team_id: id, conference_id, user_id: uid, conference_user_id: cuid, status: "pending" });
        actualNewIds.push(uid);
      }
      if (inserts.length > 0) {
        await supabase.from("team_members").insert(inserts);
        await notifyNewMembers(conference_id, id, actualNewIds);
      }
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
 * Rewritten to be non-destructive for conference membership.
 */
router.post("/invite/respond", async (req, res) => {
  const { team_id, user_id, status } = req.body; // status: 'accepted' | 'rejected'
  
  if (!team_id || !user_id || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Missing required fields or invalid status" });
  }

  try {
    // 1. Update the membership status in the team
    const { data: updatedMember, error: updateErr } = await supabase
      .from("team_members")
      .update({ status })
      .eq("team_id", team_id)
      .eq("user_id", user_id)
      .select("conference_id")
      .single();
      
    if (updateErr) {
      if (updateErr.code === 'PGRST116') return res.status(404).json({ error: "Invitation not found" });
      throw updateErr;
    }

    const confId = updatedMember.conference_id;

    // 2. Logic for ACCEPTANCE: Promote role from 'invited' to 'member'
    if (status === 'accepted') {
      await supabase
        .from("conference_user")
        .update({ role: "member" })
        .eq("conference_id", confId)
        .eq("user_id", user_id)
        .eq("role", "invited"); 
    }

    // 3. Clean up the notification for this specific invite
    await supabase
      .from("notifications")
      .delete()
      .eq("conference_id", confId)
      .eq("target_user_id", user_id)
      .eq("title", "New Team Invitation")
      .eq("target_team_id", team_id);

    res.json({ success: true, status });
  } catch (err) {
    console.error("Invite Respond Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
