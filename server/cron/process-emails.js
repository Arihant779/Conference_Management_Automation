import { supabase } from "../lib/supabaseClient.js";
import { sendEmailsToRecipients } from "../services/emailService.js";

/**
 * Vercel Cron Handler
 * This replaces the node-cron scheduler for serverless environments.
 * Triggered via vercel.json crons configuration.
 */
export default async function handler(req, res) {
  // Optional: Verify request is from Vercel Cron
  // if (req.headers['x-vercel-cron'] !== '1') {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log("🕒 Cron Job Started: Processing Scheduled Emails");
  const now = new Date().toISOString();

  try {
    // 1. Fetch due invitations
    const { data: dueInvites, error } = await supabase
      .from("speaker_invitations")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (error) throw error;

    if (!dueInvites || dueInvites.length === 0) {
      return res.json({ success: true, message: "No pending emails due." });
    }

    const results = [];
    for (const invite of dueInvites) {
      try {
        const backendUrl = process.env.BACKEND_URL || `https://${process.env.VERCEL_URL}`;
        const acceptLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=accepted`;
        const declineLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=declined`;

        const subject = invite.invitation_subject || `Invitation to Speak`;
        const body = invite.invitation_body || "We would be honored to have you as a speaker.";
        const trackedBody = `${body}\n\n---\nPlease respond using the links below:\n[Accept](${acceptLink})\n[Decline](${declineLink})`;

        const { sent } = await sendEmailsToRecipients([invite.speaker_email], subject, trackedBody);

        if (sent > 0) {
          await supabase
            .from("speaker_invitations")
            .update({
              status: "pending",
              sent_at: new Date().toISOString(),
              is_scheduled: false
            })
            .eq("id", invite.id);
          results.push({ email: invite.speaker_email, status: "sent" });
        } else {
          // Handle retry logic if needed...
          results.push({ email: invite.speaker_email, status: "failed" });
        }
      } catch (err) {
        results.push({ email: invite.speaker_email, status: "error", message: err.message });
      }
    }

    res.json({ success: true, processed: results.length, details: results });
  } catch (err) {
    console.error("Cron Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
