import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function discoverData() {
    const paperId = '09b09be5-70de-45dd-a9cd-618e955bfde7';
    console.log(`Searching for paper: ${paperId}`);

    const { data: assignments, error: aError } = await supabase
        .from('paper_assignments')
        .select('*')
        .eq('paper_id', paperId);

    if (aError) {
        console.error("Error fetching assignments:", aError);
        return;
    }

    if (!assignments || assignments.length === 0) {
        console.log("No assignments found for this paper. We might need to allot it first.");
        
        // Let's check the conference_id for this paper to try and allot it
        const { data: paper } = await supabase.from('paper').select('conference_id').eq('paper_id', paperId).single();
        console.log("Conference ID for this paper:", paper?.conference_id);
    } else {
        console.log("Assignments found:", JSON.stringify(assignments, null, 2));
    }
}

discoverData();
