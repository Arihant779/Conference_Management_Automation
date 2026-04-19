require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('conference')
    .select('conference_id, title, is_published')
    .eq('is_published', false);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} unpublished conferences:`);
    console.table(data);
  }
}

check();
