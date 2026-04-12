import cron from "node-cron";
import { supabase } from "../supabaseClient.js";
import { sendEmailsToRecipients } from "./emailService.js";

/**
 * Scheduled Email Worker
 * Runs every minute to check for pending invitations/follow-ups that reached their dispatch time.
 */
export function initScheduler() {
  console.log("🕒 Scheduler Service Initialized (Running every minute)");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date().toISOString();

      // 1. Fetch due invitations
      const { data: dueInvites, error } = await supabase
        .from("speaker_invitations")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", now);

      if (error) {
        console.error("Scheduler Error (Fetch):", error.message);
        return;
      }

      if (dueInvites && dueInvites.length > 0) {
        console.log(`🚀 Scheduler: Processing ${dueInvites.length} due invitations...`);

        for (const invite of dueInvites) {
          try {
            // Prepare Links
            const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
            const acceptLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=accepted`;
            const declineLink = `${backendUrl}/api/speakers/respond?id=${invite.id}&status=declined`;
            
            const subject = invite.invitation_subject || `Invitation to Speak`;
            const body = invite.invitation_body;
            const trackedBody = `${body}\n\n---\nPlease respond using the links below:\n[Accept](${acceptLink})\n[Decline](${declineLink})`;

            // Send Email
            await sendEmailsToRecipients([invite.speaker_email], subject, trackedBody);

            // Update status to 'pending' (now awaiting response)
            await supabase
              .from("speaker_invitations")
              .update({ 
                status: "pending", 
                sent_at: new Date().toISOString(),
                is_scheduled: false 
              })
              .eq("id", invite.id);

            console.log(`✅ Scheduler: Successfully dispatched invite to ${invite.speaker_email}`);
          } catch (sendErr) {
            console.error(`❌ Scheduler: Failed to dispatch to ${invite.speaker_email}:`, sendErr.message);
          }
        }
      }
    } catch (globalErr) {
      console.error("Scheduler Global Error:", globalErr.message);
    }
  });
}
