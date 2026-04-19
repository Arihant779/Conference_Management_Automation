require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('conference')
    .select('conference_id, title, is_published')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching conferences:', error);
  } else {
    console.log('Last 5 conferences:');
    console.table(data);
  }
}

check();
