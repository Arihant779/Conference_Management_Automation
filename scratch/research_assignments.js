import { supabase } from './backend/supabaseClient.js';

async function checkPaper() {
    console.log("Checking Assignments for Paper: 09b09be5-70de-45dd-a9cd-618e955bfde7");
    const { data: assignments, error } = await supabase
        .from('paper_assignments')
        .select('*')
        .eq('paper_id', '09b09be5-70de-45dd-a9cd-618e955bfde7');
    
    if (error) {
        console.error("Error fetching assignments:", error);
        return;
    }
    
    console.log("Assignments found:", JSON.stringify(assignments, null, 2));

    const { data: paper, error: pError } = await supabase
        .from('paper')
        .select('*')
        .eq('paper_id', '09b09be5-70de-45dd-a9cd-618e955bfde7')
        .single();
    
    if (pError) console.error("Error fetching paper:", pError);
    else console.log("Paper status:", paper.status);
}

checkPaper();
