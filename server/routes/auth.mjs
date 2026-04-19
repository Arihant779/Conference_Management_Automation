import express from "express";
import { supabase } from "../lib/supabaseClient.mjs";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { sendEmailsToRecipients } from "../services/emailService.mjs";

const router = express.Router();

// In-memory OTP storage (Temporary)
const otpStore = new Map();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a local admin client for auth operations to avoid polluting the global client session
const authAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

/**
 * Generate and Send OTP
 */
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  // 0. Pre-check Syntax (Shared logic with frontend)
  const emailRegex = /^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email syntax. Please check the spelling." });
  }

  try {
    // 1. Check if user already exists in auth.users
    const { data: existingUser } = await authAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: "User already exists. Please login instead." });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

    // 3. Send via Gmail service
    await sendEmailsToRecipients(
      [email], 
      "Verification Code for Conf Manager", 
      `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
    );

    res.json({ success: true, message: "Verification code sent to your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify OTP
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: "No verification code found for this email." });

  if (Date.now() > record.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: "Incorrect verification code." });
  }

  // Success - clear OTP and confirm verification
  otpStore.delete(email);
  res.json({ success: true, message: "Email verified successfully." });
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
