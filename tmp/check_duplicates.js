import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read config from supabaseclient.js (if possible) or just hardcode for this one-off
const supabaseUrl = 'https://ovjueyvoboyvclmrdymf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVleXZvYm95dmNsbXJkeW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0Mzc1MzYsImV4cCI6MjAzODAxMzUzNn0.8mI5S5W3L1_MhXz9i_l_O8Y4_I_H_L_K_M_N_O_P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('paper')
        .select('paper_id, paper_title, conference_id');
    
    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(p => {
        const key = `${p.conference_id}:${p.paper_title}`;
        counts[key] = (counts[key] || 0) + 1;
    });

    console.log('Duplicate counts:', counts);
    
    const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
    console.log('Found duplicates:', duplicates);
}

checkDuplicates();
