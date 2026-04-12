import express from "express";
import { findConferenceSpeakers, searchLinkedInExperts, findSpeakerEmail, findEmailsForSpeakers, generateEmailPatterns, inferDomain, _serperSearch } from "../speakerFinder.js";
import { callLLM } from "../services/llmService.js";
import { sendEmailsToRecipients } from "../services/emailService.js";
import { supabase } from "../supabaseClient.js";

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

/* ── Generate Speaker Profile from Name ── */
router.post("/speakers/generate-profile", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    // 1. Search for researcher background
    const { raw } = await _serperSearch(`"${name}" researcher professor affiliation biography`, 5);
    
    // 2. Synthesize profile using AI
    const prompt = `
Based on these search results, provide a brief 2-3 sentence academic biography for "${name}". 
Focus on their:
1. Current primary institution/organization.
2. Main field of expertise.
3. Notable recent achievement or research focus.

Search Results:
${raw.substring(0, 3000)}

Response format:
INSTITUTION: <name of university/org>
BIO: <brief 2-3 sentence biography>
`;

    const profileRaw = await callLLM(prompt);
    
    const instMatch = profileRaw.match(/^INSTITUTION:\s*(.+)/im);
    const bioMatch  = profileRaw.match(/^BIO:\s*([\s\S]+)/im);

    res.json({
      name,
      institution: instMatch?.[1]?.trim() || "Independent Researcher",
      profile: bioMatch?.[1]?.trim() || profileRaw.substring(0, 300)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Personalize invitation via AI ── */
router.post("/speakers/personalize", async (req, res) => {
  const { name, institution, profile, conferenceTitle } = req.body;
  if (!name || !conferenceTitle) return res.status(400).json({ error: "Name and Conference Title are required" });

  try {
    const prompt = `
Write a personalized conference invitation email to a researcher.
Speaker Name: ${name}
Institution: ${institution || "N/A"}
Researcher Profile/Context: ${profile || "Academic expert"}
Conference: ${conferenceTitle}

Tone: Professional, enthusiastic, and highly respectful of their specific expertise.
Instruction: Mention their expertise in the context of the conference theme. Keep it under 150 words.

Response format:
SUBJECT: <vibrant subject line>
BODY:
<email body>
`;

    const raw = await callLLM(prompt);
    const subjectMatch = raw.match(/^SUBJECT:\s*(.+)/im);
    const bodyMatch = raw.match(/^BODY:\s*([\s\S]+)/im);

    res.json({
      subject: subjectMatch?.[1]?.trim() || `Invitation to Speak at ${conferenceTitle}`,
      body: bodyMatch?.[1]?.trim() || raw
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Send Invitation & Save to DB ── */
router.post("/speakers/invite", async (req, res) => {
  const { conference_id, speaker_name, speaker_email, speaker_profile, subject, body, scheduledAt } = req.body;

  if (!speaker_email || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const isScheduled = !!scheduledAt;
    
    // 1. Create record in DB
    const { data: invite, error: dbError } = await supabase
      .from("speaker_invitations")
      .insert([{
        conference_id,
        speaker_name,
        speaker_email,
        speaker_profile,
        invitation_subject: subject,
        invitation_body: body,
        status: isScheduled ? "scheduled" : "pending",
        scheduled_at: scheduledAt || null,
        is_scheduled: isScheduled
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. If scheduled, we are done
    if (isScheduled) {
      return res.json({ success: true, invite, scheduled: true });
    }

    // 3. Otherwise, Prepare Magic Links and Send Now
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    const acceptLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=accepted`;
    const declineLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=declined`;

    const trackedBody = `${body}\n\n---\nPlease respond by clicking one of the links below:\n[Accept Invitation](${acceptLink})\n[Decline Invitation](${declineLink})`;

    // 3. Send Email
    await sendEmailsToRecipients([speaker_email], subject, trackedBody);

    res.json({ success: true, invite });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── Get all invitations ── */
router.get("/speakers/invitations", async (req, res) => {
  const { conference_id } = req.query;
  try {
    const { data, error } = await supabase
      .from("speaker_invitations")
      .select("*")
      .eq("conference_id", conference_id)
      .order("sent_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Follow-up Helper Logic (Shared) ── */
async function runFollowUpForInvite(invite, scheduledAt = null) {
  // 1. Generate Follow-up Nudge via AI
  const nudgePrompt = `
You previously sent a conference invitation to a researcher. They haven't responded yet. 
Write a short, professional, and very polite 2-sentence "nudge" to follow up.
Tone: Respectful of their busy schedule, but emphasizing that we'd be honored to have them.

Original Subject: ${invite.speaker_name}, exclusive invitation to speak
Speaker: ${invite.speaker_name}

Response format:
SUBJECT: <follow-up subject>
BODY: <short 2-sentence nudge body>
`;

  const raw = await callLLM(nudgePrompt);
  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)/im);
  const bodyMatch = raw.match(/^BODY:\s*([\s\S]+)/im);

  const nudgeBody = bodyMatch?.[1]?.trim() || raw;
  const subject = subjectMatch?.[1]?.trim() || `Following up: Speaking at our conference`;

  const isScheduled = !!scheduledAt;

  // 2. Update DB
  const { data: updated, error: updateErr } = await supabase
    .from("speaker_invitations")
    .update({
      invitation_subject: isScheduled ? subject : invite.invitation_subject,
      invitation_body: isScheduled ? nudgeBody : invite.invitation_body,
      status: isScheduled ? "scheduled" : invite.status,
      scheduled_at: scheduledAt || null,
      is_scheduled: isScheduled,
      follow_up_count: isScheduled ? invite.follow_up_count : (invite.follow_up_count || 0) + 1,
      last_follow_up_at: isScheduled ? invite.last_follow_up_at : new Date().toISOString()
    })
    .eq("id", invite.id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // 3. If NOT scheduled, Send Now
  if (!isScheduled) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    const acceptLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=accepted`;
    const declineLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=declined`;
    const fullTrackingBody = `${nudgeBody}\n\n---\nPlease respond using the links below:\n[Accept](${acceptLink})\n[Decline](${declineLink})`;
    
    await sendEmailsToRecipients([invite.speaker_email], subject, fullTrackingBody);
    console.log(`[Follow-up] Sent nudge to ${invite.speaker_email}`);
  } else {
    console.log(`[Follow-up] Scheduled nudge for ${invite.speaker_email} at ${scheduledAt}`);
  }

  return updated;
}

/* ── Individual Follow-up ── */
router.post("/speakers/follow-up", async (req, res) => {
  const { invite_id, scheduledAt } = req.body;
  if (!invite_id) return res.status(400).json({ error: "Invite ID is required" });

  try {
    const { data: invite, error: fetchErr } = await supabase
      .from("speaker_invitations")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (fetchErr || !invite) throw new Error("Original invitation not found");

    const updated = await runFollowUpForInvite(invite, scheduledAt);
    res.json({ success: true, invite: updated });
  } catch (err) {
    console.error("Follow-up error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── Bulk Follow-up ── */
router.post("/speakers/bulk-follow-up", async (req, res) => {
  const { conference_id, scheduledAt } = req.body;
  if (!conference_id) return res.status(400).json({ error: "Conference ID is required" });

  try {
    // 1. Fetch all pending invites
    const { data: pendingInvites, error } = await supabase
      .from("speaker_invitations")
      .select("*")
      .eq("conference_id", conference_id)
      .eq("status", "pending");

    if (error) throw error;
    if (!pendingInvites || pendingInvites.length === 0) {
      return res.json({ success: true, count: 0, message: "No pending invitations found" });
    }

    console.log(`[Bulk Follow-up] Found ${pendingInvites.length} pending invites for conference ${conference_id}`);

    // 2. Process each (sequentially to avoid LLM rate limits)
    const results = [];
    for (const invite of pendingInvites) {
      try {
        console.log(`  Processing ${invite.speaker_email}...`);
        const updated = await runFollowUpForInvite(invite, scheduledAt);
        results.push(updated);
      } catch (err) {
        console.error(`  Failed nudge for ${invite.speaker_email}:`, err.message);
      }
    }

    console.log(`[Bulk Follow-up] Successfully processed ${results.length} / ${pendingInvites.length} nudges.`);
    res.json({ success: true, count: results.length, total: pendingInvites.length });
  } catch (err) {
    console.error("Bulk follow-up error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── Public Response Handler (Magic Links) ── */
router.get("/speakers/respond", async (req, res) => {
  const { id, status } = req.query;
  if (!id || !status) return res.send("Invalid response link.");

  try {
    const { error } = await supabase
      .from("speaker_invitations")
      .update({ status, replied_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Redirect to a nice "Thank You" page on the frontend
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${baseUrl}?view=invitation-thank-you&status=${status}`);
  } catch (err) {
    res.status(500).send("An error occurred while processing your response.");
  }
});

export default router;