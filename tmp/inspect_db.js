
import { supabase } from './src/Supabase/supabaseclient.js';

async function inspectUsersTable() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('User columns:', Object.keys(data[0] || {}));
    console.log('Sample user:', data[0]);
  }
}

inspectUsersTable();
