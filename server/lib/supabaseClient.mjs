import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE_URL from env:", process.env.SUPABASE_URL ? "SET" : "MISSING");
console.log("SUPABASE_SERVICE_ROLE_KEY from env:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️  Supabase environment variables are missing!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
