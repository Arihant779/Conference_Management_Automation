import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  console.log("🚀 Starting Industrial Cleanup...");
  
  // 1. Cleanup users table
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("user_id, user_email")
    .or("user_email.ilike.%test%,user_email.ilike.%example.com%,user_name.ilike.%Automation Tester%");

  if (users?.length) {
    console.log(`🗑️ Removing ${users.length} junk users from database...`);
    for (const u of users) {
      await supabase.from("users").delete().eq("user_id", u.user_id);
    }
  }

  // 2. Cleanup Auth (Admin)
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  const toDelete = authUsers.filter(u => 
    u.email?.includes("test") || 
    u.email?.includes("example.com") || 
    u.user_metadata?.full_name?.includes("Automation")
  );

  if (toDelete.length) {
    console.log(`🔥 Purging ${toDelete.length} junk users from Auth...`);
    for (const u of toDelete) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  console.log("✨ Cleanup Complete!");
}

cleanup();
