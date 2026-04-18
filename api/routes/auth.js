import express from "express";
import { supabase } from "../supabaseClient.js";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a local admin client for auth operations to avoid polluting the global client session
const authAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

/**
 * [TESTING ONLY] Register User (Low-Level Bypass)
 */
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    // 1. Create User via Raw REST API (v1/admin/users)
    // This bypasses the library level "Expected UUID" bug
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      })
    });

    const authData = await response.json();

    if (!response.ok || authData.error) {
      return res.status(response.status).json({ 
        error: authData.error?.message || authData.error || "Signup Failed" 
      });
    }

    const userId = authData.id;

    // 2. Create Profile
    const { error: profileError } = await authAdmin
      .from("users")
      .upsert({
        user_id: userId,
        user_name: name,
        user_email: email
      }, { onConflict: "user_email" }); // Use email as conflict check or just user_id

    if (profileError) {
      // Cleanup cleanup
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
        }
      });
      return res.status(500).json({ error: profileError.message });
    }

    res.json({ success: true, user: authData });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * [TESTING ONLY] Login User
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await authAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ success: true, user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * [TESTING ONLY] Cleanup User
 */
router.delete("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await supabase.from("users").delete().eq("user_id", userId);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
