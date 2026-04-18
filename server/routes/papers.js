import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/**
 * Allot papers based on research_area <-> expertise matching
 */
router.post("/allot", async (req, res) => {
  const { conference_id } = req.body;
  
  try {
    console.log(`[ALLOT] Starting for conf: ${conference_id}`);

    // 1. Fetch papers and reviewers
    const { data: papers, error: pErr } = await supabase.from("paper").select("*").eq("conference_id", conference_id);
    const { data: reviewers, error: rErr } = await supabase
      .from("conference_user")
      .select("id, user_id, expertise, max_papers")
      .eq("conference_id", conference_id)
      .eq("role", "reviewer");

    if (pErr) throw pErr;
    if (rErr) throw rErr;

    if (!papers || !reviewers) throw new Error("Could not fetch papers or reviewers");

    const assignments = [];
    for (const paper of papers) {
      const area = paper.research_area?.toLowerCase() || "";
      
      const matches = reviewers.filter(r => {
        const expertise = r.expertise?.toLowerCase() || "";
        return expertise.includes(area) || area.includes(expertise);
      });

      const selected = matches.slice(0, 3);
      for (const rev of selected) {
        assignments.push({
          paper_id: paper.paper_id,
          reviewer_id: rev.user_id,
          conference_id,
          status: "pending",
          similarity: 0.85 // Mocking a high similarity for algorithmic match
        });
      }
    }

    console.log(`[ALLOT] Generated ${assignments.length} assignments. Cleaning existing...`);

    // Delete existing to avoid constraint violations
    const { error: delError } = await supabase.from("paper_assignments").delete().eq("conference_id", conference_id);
    if (delError) throw delError;

    if (assignments.length > 0) {
      console.log(`[ALLOT] Inserting new assignments...`);
      const { error: insError } = await supabase.from("paper_assignments").insert(assignments);
      if (insError) throw insError;
    }

    res.json({ success: true, alloted: assignments.length });
  } catch (err) {
    console.error("[ALLOT ERROR]:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * Submit a review and calculate consensus
 */
router.post("/review", async (req, res) => {
  const { assignment_id, paper_id, status, score, feedback } = req.body;
  
  try {
    console.log(`[REVIEW] Submitting for assignment: ${assignment_id}`);

    // 1. Update assignment
    const { error: updateErr } = await supabase
      .from("paper_assignments")
      .update({ status, score, feedback })
      .eq("id", assignment_id);

    if (updateErr) throw updateErr;

    // 2. Fetch all assignments for this paper to run consensus
    const { data: allAssigns, error: fetchErr } = await supabase
      .from("paper_assignments")
      .select("status")
      .eq("paper_id", paper_id);

    if (fetchErr) throw fetchErr;

    if (allAssigns) {
      const total = allAssigns.length;
      const accepted = allAssigns.filter(a => a.status === 'accepted').length;
      const pending = allAssigns.filter(a => a.status === 'pending').length;

      let finalStatus = 'pending';
      const threshold = 0.66;
      
      if (total > 0) {
        if ((accepted / total) >= threshold) finalStatus = 'accepted';
        else if (((accepted + pending) / total) < threshold) finalStatus = 'rejected';
      }

      console.log(`[REVIEW] Consensus for paper ${paper_id}: ${finalStatus}`);
      const { error: paperErr } = await supabase.from("paper").update({ status: finalStatus }).eq("paper_id", paper_id);
      if (paperErr) throw paperErr;
      
      res.json({ success: true, consensus: finalStatus });
    } else {
      res.json({ success: true, consensus: 'unknown' });
    }
  } catch (err) {
    console.error("[REVIEW ERROR]:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * Get anonymized feedback report
 */
router.get("/:id/report", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: reviews, error } = await supabase
      .from("paper_assignments")
      .select("score, feedback, status")
      .eq("paper_id", id)
      .not("status", "eq", "pending");

    if (error) throw error;
    res.json({ paper_id: id, reviews: reviews || [] });
  } catch (err) {
    console.error("[REPORT ERROR]:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * [TESTING ONLY] Setup test data (Paper + Optional Reviewer)
 */
router.post("/test-setup", async (req, res) => {
  const { paper, reviewer, conference_id } = req.body;
  try {
    // 1. Seed Reviewer if provided
    if (reviewer) {
      await supabase
        .from("conference_user")
        .upsert([{ 
          ...reviewer, 
          conference_id, 
          role: 'reviewer' 
        }], { onConflict: 'user_id,conference_id' });
    }

    // 2. Clear existing test paper if it exists
    await supabase.from("paper").delete().eq("paper_title", paper.paper_title).eq("conference_id", conference_id);
    
    // 3. Insert test paper
    const { data, error } = await supabase
      .from("paper")
      .insert([{ ...paper, conference_id, status: 'pending' }])
      .select().single();
      
    if (error) throw error;
    res.json({ success: true, paper: data });
  } catch (err) {
    console.error("[TEST-SETUP ERROR]:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * [TESTING ONLY] Verify assignment state
 */
router.get("/test-verify/:paper_id", async (req, res) => {
  const { paper_id } = req.params;
  try {
    const { data: assignments, error } = await supabase
      .from("paper_assignments")
      .select("*")
      .eq("paper_id", paper_id);
      
    if (error) throw error;
    res.json({ assignments: assignments || [] });
  } catch (err) {
    console.error("[TEST-VERIFY ERROR]:", err);
    res.status(500).json({ error: err.message || err });
  }
});

export default router;
