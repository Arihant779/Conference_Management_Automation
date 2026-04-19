import { supabase } from "../lib/supabaseClient.mjs";
import { sendEmailsToRecipients } from "../services/emailService.mjs";

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

    const results = [];

    if (!dueInvites || dueInvites.length === 0) {
      console.log("No pending speaker invitations.");
    } else {
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
            results.push({ email: invite.speaker_email, status: "failed" });
          }
        } catch (err) {
          results.push({ email: invite.speaker_email, status: "error", message: err.message });
        }
      }
    }

    // 2. Fetch and process 'custom_date' automations
    const { data: customAutomations } = await supabase
      .from('conference_automations')
      .select('*')
      .eq('trigger_type', 'custom_date')
      .eq('is_active', true);

    if (customAutomations && customAutomations.length > 0) {
      for (const auto of customAutomations) {
        const meta = auto.trigger_metadata || {};
        if (meta.specific_time && !meta.processed) {
          if (new Date(meta.specific_time) <= new Date(now)) {
            let query = supabase.from('conference_user').select('email, users(user_email, user_name), full_name, role').eq('conference_id', auto.conference_id);
            if (auto.target_role !== 'all' && auto.target_role !== 'event_subject') {
              query = query.eq('role', auto.target_role);
            }
            const { data: users } = await query;
            if (users && users.length > 0) {
              for (const u of users) {
                const email = u.email || u.users?.user_email;
                const name = u.full_name || u.users?.user_name || 'Member';
                if (email) {
                  const personalizedBody = auto.body.replace(/{Name}/g, name);
                  await sendEmailsToRecipients([email], auto.subject, personalizedBody);
                }
              }
            }
            await supabase.from('conference_automations')
              .update({ trigger_metadata: { ...meta, processed: true } })
              .eq('id', auto.id);
            results.push({ automation: auto.title, status: "sent" });
          }
        }
      }
    }

    // 3. Fetch and process 'relative_date' automations
    const { data: relativeAutomations } = await supabase
      .from('conference_automations')
      .select('*, conference!inner(start_date)')
      .eq('trigger_type', 'relative_date')
      .eq('is_active', true);

    if (relativeAutomations && relativeAutomations.length > 0) {
      for (const auto of relativeAutomations) {
        const meta = auto.trigger_metadata || {};
        if (typeof meta.days_offset === 'number' && !meta.processed && auto.conference?.start_date) {
           const confStart = new Date(auto.conference.start_date);
           const targetDate = new Date(confStart);
           targetDate.setDate(targetDate.getDate() + meta.days_offset);
           
           if (targetDate <= new Date(now)) {
            let query = supabase.from('conference_user').select('email, users(user_email, user_name), full_name, role').eq('conference_id', auto.conference_id);
            if (auto.target_role !== 'all' && auto.target_role !== 'event_subject') {
               query = query.eq('role', auto.target_role);
            }
            const { data: users } = await query;
            if (users && users.length > 0) {
              for (const u of users) {
                const email = u.email || u.users?.user_email;
                const name = u.full_name || u.users?.user_name || 'Member';
                if (email) {
                  const personalizedBody = auto.body.replace(/{Name}/g, name);
                  await sendEmailsToRecipients([email], auto.subject, personalizedBody);
                }
              }
            }
            await supabase.from('conference_automations')
              .update({ trigger_metadata: { ...meta, processed: true } })
              .eq('id', auto.id);
            results.push({ automation: auto.title, status: "sent" });
          }
        }
      }
    }

    res.json({ success: true, processed: results.length, details: results });
  } catch (err) {
    console.error("Cron Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
