import { supabase } from './supabaseClient.js';

async function check() {
  console.log("Checking paper_assignments schema...");
  const { data, error } = await supabase
    .from('paper_assignments')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Fetch error:", error);
  } else if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Sample:", data[0]);
  } else {
    console.log("No data in paper_assignments.");
  }
}
check();
