import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from("paper").select("*").limit(1);
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Supabase Success! Data:", data);
  }
}

test();
