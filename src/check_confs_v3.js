require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('conference')
    .select('conference_id, title, is_published')
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(c => {
      console.log(`ID: ${c.conference_id} | Title: ${c.title} | Published: ${c.is_published} (Type: ${typeof c.is_published})`);
    });
  }
}

check();
