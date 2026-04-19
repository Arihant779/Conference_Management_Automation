require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '';
let key = '';
for (let line of lines) {
  if (line.startsWith('REACT_APP_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('REACT_APP_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase
    .from('conference_user')
    .select('id, role, email, full_name, users(user_name, user_email)')
    .eq('role', 'reviewer')
    .limit(5);

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();
