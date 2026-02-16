import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://iszollzhbccbdplmtmaw.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9sbHpoYmNjYmRwbG10bWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTcxMzQsImV4cCI6MjA4Njc5MzEzNH0.9nR6pH2xksgqvUyCTJF5Pp9XkzCWKRO5JlUkpCExqUk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
