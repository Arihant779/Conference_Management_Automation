"""
Paper-Reviewer Allocation API
Ported from SE_PaperAllocation_Fixed (2).ipynb

Exposes POST /api/allocate-papers
  - Accepts paper PDFs + reviewer expertise descriptions
  - Uses sentence-transformer embeddings + cosine similarity + PuLP ILP
  - Returns optimal reviewer-paper assignments
"""

import os
import json
import tempfile
import traceback

from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pulp

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Load model once at startup (first run downloads ~90MB)
# ---------------------------------------------------------------------------
print("Loading sentence-transformer model (all-MiniLM-L6-v2) ...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded successfully!")


# ---------------------------------------------------------------------------
# Helpers (ported from notebook)
# ---------------------------------------------------------------------------

def extract_text(pdf_path, max_pages=5):
    """Extract text from first few pages of a PDF."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages[:max_pages]:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
    return text


def allocate(paper_texts, paper_names, reviewer_texts, reviewer_names,
             reviewers_per_paper=2, capacities=None):
    """
    Run the full allocation pipeline:
      1. Embed papers + reviewers
      2. Cosine similarity matrix
      3. ILP optimisation via PuLP
    Returns a dict with assignments, similarity matrix, and stats.
    """
    P = len(paper_texts)
    R = len(reviewer_texts)
    K = reviewers_per_paper

    # Default capacity: ceil(P*K / R) + 1 for each reviewer
    if capacities is None:
        default_cap = max(2, -(-P * K // R) + 1)  # ceiling division + 1
        capacities = [default_cap] * R

    # --- Embeddings ---
    paper_embeddings = model.encode(paper_texts, show_progress_bar=False)
    reviewer_embeddings = model.encode(reviewer_texts, show_progress_bar=False)

    # --- Similarity ---
    sim = cosine_similarity(paper_embeddings, reviewer_embeddings)

    # --- Feasibility check ---
    total_capacity = sum(capacities)
    total_needed = P * K
    if total_capacity < total_needed:
        return {
            "status": "infeasible",
            "message": (
                f"Total reviewer capacity ({total_capacity}) < "
                f"assignments needed ({total_needed}). "
                f"Add reviewers, increase capacity, or reduce reviewers-per-paper."
            ),
            "similarity_matrix": sim.tolist(),
            "paper_names": paper_names,
            "reviewer_names": reviewer_names,
        }

    # --- ILP ---
    prob = pulp.LpProblem("PaperReviewerAssignment", pulp.LpMaximize)
    x = pulp.LpVariable.dicts(
        "a", ((p, r) for p in range(P) for r in range(R)), cat="Binary"
    )

    # Objective: maximise total similarity
    prob += pulp.lpSum(sim[p][r] * x[(p, r)] for p in range(P) for r in range(R))

    # Constraint: each paper gets exactly K reviewers
    for p in range(P):
        prob += pulp.lpSum(x[(p, r)] for r in range(R)) == K

    # Constraint: reviewer capacity
    for r in range(R):
        prob += pulp.lpSum(x[(p, r)] for p in range(P)) <= capacities[r]

    status = prob.solve(pulp.PULP_CBC_CMD(msg=0))

    if pulp.LpStatus[status] != "Optimal":
        return {
            "status": pulp.LpStatus[status].lower(),
            "message": "Optimisation did not find an optimal solution.",
            "similarity_matrix": sim.tolist(),
            "paper_names": paper_names,
            "reviewer_names": reviewer_names,
        }

    # --- Build results ---
    assignments = []
    paper_to_reviewers = {p: [] for p in range(P)}
    reviewer_to_papers = {r: [] for r in range(R)}

    for p in range(P):
        for r in range(R):
            if pulp.value(x[(p, r)]) == 1:
                paper_to_reviewers[p].append(r)
                reviewer_to_papers[r].append(p)
                assignments.append({
                    "paper_id": p,
                    "paper_name": paper_names[p],
                    "reviewer_id": r,
                    "reviewer_name": reviewer_names[r],
                    "similarity_score": round(float(sim[p][r]), 4),
                })

    all_scores = [a["similarity_score"] for a in assignments]
    summary = {
        "total_assignments": len(assignments),
        "avg_similarity": round(float(np.mean(all_scores)), 4) if all_scores else 0,
        "min_similarity": round(float(np.min(all_scores)), 4) if all_scores else 0,
        "max_similarity": round(float(np.max(all_scores)), 4) if all_scores else 0,
        "objective_value": round(float(pulp.value(prob.objective)), 4),
    }

    reviewer_workload = []
    for r in range(R):
        assigned = len(reviewer_to_papers[r])
        reviewer_workload.append({
            "reviewer_id": r,
            "reviewer_name": reviewer_names[r],
            "assigned": assigned,
            "capacity": capacities[r],
            "utilisation_pct": round(assigned / capacities[r] * 100, 1) if capacities[r] > 0 else 0,
        })

    return {
        "status": "optimal",
        "assignments": assignments,
        "similarity_matrix": sim.tolist(),
        "paper_names": paper_names,
        "reviewer_names": reviewer_names,
        "summary": summary,
        "reviewer_workload": reviewer_workload,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/allocate-papers", methods=["POST"])
def allocate_papers():
    """
    Accepts multipart form:
      papers[]   – uploaded PDF files
      reviewers  – JSON string: [{"name":"...", "expertise":"..."}]
      reviewers_per_paper – int (default 2)
      capacities – JSON string: [int, int, ...] (optional)
    
    Also accepts JSON body with:
      paper_descriptions – list of {"name":"...", "text":"..."} (fallback if no PDFs)
    """
    try:
        # --- Reviewers (always required) ---
        reviewers_raw = request.form.get("reviewers") or request.json.get("reviewers", "[]") if request.is_json else request.form.get("reviewers", "[]")
        reviewers = json.loads(reviewers_raw) if isinstance(reviewers_raw, str) else reviewers_raw
        if not reviewers:
            return jsonify({"error": "At least one reviewer is required"}), 400

        reviewer_names = [r.get("name", f"Reviewer {i}") for i, r in enumerate(reviewers)]
        reviewer_texts = [r.get("expertise", "") for r in reviewers]

        reviewers_per_paper = int(request.form.get("reviewers_per_paper", 2) if not request.is_json else request.json.get("reviewers_per_paper", 2))

        # Capacities
        caps_raw = request.form.get("capacities") if not request.is_json else request.json.get("capacities")
        capacities = json.loads(caps_raw) if caps_raw and isinstance(caps_raw, str) else caps_raw

        # --- Papers ---
        paper_texts = []
        paper_names = []

        # Option A: uploaded PDFs
        files = request.files.getlist("papers[]") or request.files.getlist("papers")
        if files:
            for f in files:
                suffix = os.path.splitext(f.filename)[1]
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                f.save(tmp.name)
                tmp.close()
                text = extract_text(tmp.name)
                os.unlink(tmp.name)
                paper_texts.append(text)
                paper_names.append(f.filename)
        # Option B: paper_dir (server-side folder)
        elif request.form.get("paper_dir") or (request.is_json and request.json.get("paper_dir")):
            paper_dir = request.form.get("paper_dir") or request.json.get("paper_dir")
            if os.path.isdir(paper_dir):
                pdf_files = sorted([f for f in os.listdir(paper_dir) if f.lower().endswith(".pdf")])
                for fname in pdf_files:
                    text = extract_text(os.path.join(paper_dir, fname))
                    paper_texts.append(text)
                    paper_names.append(fname)
        # Option C: text descriptions
        elif request.is_json and request.json.get("paper_descriptions"):
            for d in request.json["paper_descriptions"]:
                paper_texts.append(d.get("text", ""))
                paper_names.append(d.get("name", "Untitled"))

        if not paper_texts:
            return jsonify({"error": "No papers provided. Upload PDFs, specify a paper_dir, or provide paper_descriptions."}), 400

        # --- Run allocation ---
        result = allocate(
            paper_texts, paper_names,
            reviewer_texts, reviewer_names,
            reviewers_per_paper=reviewers_per_paper,
            capacities=capacities,
        )
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "all-MiniLM-L6-v2"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\nPaper Allocation API running on http://localhost:{port}")
    print(f"  POST http://localhost:{port}/api/allocate-papers")
    print(f"  GET  http://localhost:{port}/health")
    app.run(host="0.0.0.0", port=port, debug=True)
