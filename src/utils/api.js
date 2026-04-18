import { supabase } from '../Supabase/supabaseclient';

export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
export const AI_ENGINE_URL = process.env.REACT_APP_AI_ENGINE_URL || 'http://localhost:5000';

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
