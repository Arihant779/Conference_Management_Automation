import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * Handle Conference Creation
 */
router.post("/create", async (req, res) => {
  const { title, theme, description, location, start_date, end_date, template, banner_url, conference_head_id } = req.body;
  
  try {
    if (!title || !location || !start_date) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS", message: "Title, Location, and Start Date are required." });
    }

    const today = new Date().toISOString().split('T')[0];
    if (start_date < today) {
      return res.status(400).json({ error: "INVALID_DATE", message: "Start date cannot be in the past." });
    }

    if (end_date && end_date < start_date) {
      return res.status(400).json({ error: "INVALID_DATE", message: "End date must be on or after the start date." });
    }

    // Check for duplicate name
    const { data: existing } = await supabase.from("conference").select("conference_id").eq("title", title).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: "DUPLICATE_NAME", message: "A conference with this title already exists." });
    }

    // 1. Create Conference
    const { data: inserted, error: insertError } = await supabase
      .from("conference")
      .insert({
        title, theme, description, location, 
        start_date: start_date || null,
        end_date: end_date || null,
        template: template || "modern",
        banner_url: banner_url || null,
        conference_head_id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Assign Organizer role
    if (conference_head_id) {
       await supabase.from("conference_user").insert({
        conference_id: inserted.conference_id,
        user_id: conference_head_id,
        role: "organizer",
        full_name: "Organizer (Test)",
        email: "organizer@test.com" // Placeholder for testing
      });
    }

    res.json({ success: true, conference: inserted });
  } catch (err) {
    console.error("[CONF-CREATE ERROR]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Handle Attendee Registration
 */
router.post("/register", async (req, res) => {
  const { conference_id, user_id, email, first_name, last_name, accommodation_required, accommodation_notes } = req.body;
  
  try {
    // Check capacity
    const { data: conf } = await supabase.from("conference").select("capacity").eq("conference_id", conference_id).single();
    if (conf && conf.capacity > 0) {
      const { count } = await supabase.from("conference_user").select("*", { count: 'exact', head: true }).eq("conference_id", conference_id);
      if (count >= conf.capacity) {
        return res.status(400).json({ error: "CAPACITY_FULL", message: "This conference has reached its maximum capacity." });
      }
    }

    // Check existing
    const { data: existing } = await supabase.from("conference_user")
      .select("id")
      .eq("conference_id", conference_id)
      .eq("email", email.toLowerCase())
      .maybeSingle();
      
    if (existing) {
      return res.status(400).json({ error: "ALREADY_REGISTERED", message: "This email is already registered." });
    }

    const { data: registered, error } = await supabase.from("conference_user").insert([{
      conference_id,
      user_id: user_id || null,
      email: email.toLowerCase(),
      full_name: `${first_name} ${last_name}`,
      role: 'attendee',
      accommodation_required: accommodation_required || false,
      accommodation_notes: accommodation_notes || null,
      joined_at: new Date().toISOString()
    }]).select().single();

    if (error) throw error;

    res.json({ success: true, registration: registered });
  } catch (err) {
    console.error("[CONF-REG ERROR]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * [TESTING ONLY] Setup
 */
router.post("/test-setup", async (req, res) => {
  const { cleanup_title } = req.body;
  try {
    if (cleanup_title) {
      await supabase.from("conference").delete().eq("title", cleanup_title);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * [TESTING ONLY] Verify
 */
router.get("/test-verify/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: users } = await supabase.from("conference_user").select("*").eq("conference_id", id);
    res.json({ users: users || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
