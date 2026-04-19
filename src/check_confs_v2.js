require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('conference')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching conferences:', error);
  } else {
    console.log('Last 5 conferences:');
    if (data.length > 0) {
      console.table(data.map(c => ({
        id: c.conference_id || c.id,
        title: c.title,
        is_published: c.is_published
      })));
      console.log('Available columns:', Object.keys(data[0]));
    } else {
      console.log('No conferences found.');
    }
  }
}

check();
