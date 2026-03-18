const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ovjueyvoboyvclmrdymf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVleXZvYm95dmNsbXJkeW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0Mzc1MzYsImV4cCI6MjAzODAxMzUzNn0.8mI5S5W3L1_MhXz9i_l_O8Y4_I_H_L_K_M_N_O_P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicates() {
    console.log('Starting cleanup (CommonJS)...');
    
    const { data: papers, error: pErr } = await supabase
        .from('paper')
        .select('paper_id, paper_title, conference_id, paper_assignments(id)');

    if (pErr) {
        console.error(pErr);
        return;
    }

    console.log(`Checking ${papers.length} papers...`);

    const toDelete = [];
    const groups = {};
    papers.forEach(p => {
        const key = `${p.conference_id}:${p.paper_title}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    for (const key in groups) {
        const list = groups[key];
        if (list.length > 1) {
            const withAssign = list.filter(p => p.paper_assignments && p.paper_assignments.length > 0);
            const withoutAssign = list.filter(p => !p.paper_assignments || p.paper_assignments.length === 0);

            if (withAssign.length > 0) {
                withoutAssign.forEach(p => toDelete.push(p.paper_id));
            } else if (list.length > 1) {
                list.slice(1).forEach(p => toDelete.push(p.paper_id));
            }
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} paper IDs...`);
        const { error: delErr } = await supabase
            .from('paper')
            .delete()
            .in('paper_id', toDelete);
        
        if (delErr) {
            console.error('Delete error:', delErr);
        } else {
            console.log('Cleanup complete!');
        }
    } else {
        console.log('No duplicates found.');
    }
}

cleanupDuplicates();
