import { supabase } from '../Supabase/supabaseclient';

/**
 * Enhanced fetch that automatically injects the current Supabase session token.
 * Use this for any calls to the backend /api/teams or other protected routes.
 */
export async function protectedFetch(url, options = {}) {
  // 1. Grab current session
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    console.warn("API Call: No active session token found.");
  }

  // 2. Prepare headers
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Execute fetch
  return fetch(url, {
    ...options,
    headers
  });
}
