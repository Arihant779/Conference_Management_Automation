import { supabase } from '../Supabase/supabaseclient';
import { API_BASE_URL } from './api';

/**
 * Trigger an email automation based on an event.
 * @param {string} confId - The conference ID.
 * @param {string} triggerType - e.g. 'on_paper_accepted', 'on_paper_rejected'.
 * @param {object} contextData - Context variables based on trigger type. For paper status change, { authorEmail, authorName, paperTitle }.
 */
export const triggerEmailAutomation = async (confId, triggerType, contextData) => {
  try {
    const { data: autos } = await supabase
      .from('conference_automations')
      .select('*')
      .eq('conference_id', confId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true);

    if (!autos || autos.length === 0) return;

    for (const auto of autos) {
      let personalizedBody = auto.body;
      let toEmail = '';

      if (triggerType === 'on_paper_accepted' || triggerType === 'on_paper_rejected') {
        personalizedBody = personalizedBody
          .replace(/{AuthorName}/g, contextData.authorName || 'Author')
          .replace(/{PaperTitle}/g, contextData.paperTitle || 'Untitled Paper');
        toEmail = contextData.authorEmail;
      }
      // Add other triggers if needed...

      if (toEmail && toEmail.trim()) {
        await fetch(`${API_BASE_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [toEmail.trim().toLowerCase()],
            subject: auto.subject,
            body: personalizedBody,
            senderRole: 'organizer',
            conferenceId: confId
          })
        }).catch(e => console.error(`Failed to send automation email [${triggerType}]:`, e));
      }
    }
  } catch (err) {
    console.error(`Error executing automation ${triggerType}:`, err);
  }
};