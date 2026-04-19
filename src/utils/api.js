import { supabase } from '../Supabase/supabaseclient';

const getBaseUrl = (envVar, fallback) => {
  let url = process.env[envVar] || fallback || '';
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/api')) url = url.slice(0, -4);
  
  // Ensure absolute URLs have a protocol to avoid being treated as relative paths
  if (url && !url.startsWith('http') && !url.startsWith('mailto') && url.includes('.')) {
    url = `https://${url}`;
  }
  return url;
};

// In production on Vercel, the API will be relative to the domain (e.g. /api)
// We prioritize the env var, then fallback to relative /api for production, then localhost for dev.
const DEFAULT_BACKEND = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000';

export const API_BASE_URL = getBaseUrl('REACT_APP_BACKEND_URL', DEFAULT_BACKEND);
export const AI_ENGINE_URL = getBaseUrl('REACT_APP_AI_ENGINE_URL', 'http://localhost:5000');

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
