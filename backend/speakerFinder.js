import axios from "axios";
import xml2js from "xml2js";
import dotenv from "dotenv";

dotenv.config();

/* ======================
CONFIG
====================== */
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GROQ_API_KEY   = process.env.GROQ_API_KEY || "";
const GROQ_MODEL     = "llama-3.3-70b-versatile";
const GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions";

const CURRENT_YEAR = new Date().getFullYear();
const RECENT_YEARS = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ================================================================
INDIAN INSTITUTIONS CONFIG

CRITICAL FIX: ArXiv's affil: field requires the FULL institution
name as it appears in papers. "all:IIT" only finds papers that
literally type "IIT" in their abstract — highly unreliable.
affil:"Indian Institute of Technology Bombay" matches author
affiliation metadata — far more accurate and complete.
================================================================ */
const IIT_AFFIL_TERMS = [
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Madras",
  "Indian Institute of Technology Kharagpur",
  "Indian Institute of Technology Kanpur",
  "Indian Institute of Technology Roorkee",
  "Indian Institute of Technology Hyderabad",
  "Indian Institute of Technology Guwahati",
  "Indian Institute of Technology BHU",
  "Indian Institute of Technology Gandhinagar",
  "Indian Institute of Technology Jodhpur",
  "Indian Institute of Technology Patna",
  "Indian Institute of Technology Ropar",
  "Indian Institute of Technology Indore",
  "Indian Institute of Technology Mandi",
  "Indian Institute of Technology Tirupati",
  "Indian Institute of Science",
  "National Institute of Technology",
  "IIIT Hyderabad",
  "IIIT Delhi",
  "IIIT Bangalore",
];

const INDIA_AFFIL_TERMS = [
  "India",
  "Indian Institute",
  "University of Delhi",
  "University of Mumbai",
  "Anna University",
  "Jadavpur University",
  "Tata Institute",
  "TIFR",
  "IISER",
];

// OpenAlex stable institution IDs for major IITs/IISc (no API key needed)
const OPENALEX_IIT_IDS = [
  "I28986697",   // IIT Bombay
  "I111671476",  // IIT Delhi
  "I28566421",   // IIT Madras
  "I14399945",   // IIT Kharagpur
  "I4210146548", // IIT Kanpur
  "I19279682",   // IIT Roorkee
  "I133437841",  // IISc Bangalore
  "I4210088629", // IIT Hyderabad
  "I158756709",  // IIT Guwahati
  "I4210102197", // IIT BHU
  "I4210087662", // IIIT Hyderabad
  "I4210104086", // NIT Trichy
  "I4210087999", // NIT Warangal
];

/* ======================
GROQ LLM CALL
====================== */
async function localLLM(prompt, temperature = 0.3, maxTokens = 512) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set. Get a free key: https://console.groq.com");

  const res = await axios.post(
    GROQ_URL,
    { model: GROQ_MODEL, messages: [{ role: "user", content: prompt }], temperature, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
  );

  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Invalid Groq output");
  return text;
}

async function localLLMWithRetry(prompt, retries = 2, maxTokens = 512) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await localLLM(prompt, 0.3, maxTokens);
    } catch (e) {
      if (e.response?.status === 429) {
        const wait = (i + 1) * 12000;
        console.log(`  Groq rate limit — waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else if (i === retries) {
        throw e;
      } else {
        await sleep(2000 * (i + 1));
      }
    }
  }
}

/* ======================
TOPIC EXPANSION
Returns domain-specific search keywords.
====================== */
async function expandTopic(topic) {
  const prompt = `You are a research librarian. Generate exactly 4 specific academic search keywords for ArXiv about: "${topic}"

Rules:
- Be technical and specific (sub-topics, methods, applications)
- Each keyword: 2-5 words
- Output ONLY a JSON array of strings, no markdown, no explanation.

Example for "vision transformers medical imaging":
["ViT medical segmentation", "transformer pathology classification", "self-supervised histology", "attention radiology detection"]

Output:`;

  try {
    const raw   = await localLLMWithRetry(prompt, 2, 150);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4).map((k) => String(k).trim()).filter(Boolean);
    }
  } catch {
    console.warn("  Topic expansion failed, using fallback");
  }
  return [topic, `${topic} survey`, `${topic} applications`];
}

/* ================================================================
ARXIV SEARCH

Uses proper affil: field syntax for institution filtering.
This is the key fix — the old code used `all:IIT` which matches
any paper mentioning "IIT" anywhere in its text, not just affiliated
authors. `affil:"Indian Institute of Technology Bombay"` is precise.
================================================================ */
async function searchArxivBase(query, affilTerms = null) {
  let searchQuery;

  if (affilTerms && affilTerms.length > 0) {
    // Build affil: OR chain — proper ArXiv affiliation field syntax
    const affilParts = affilTerms
      .slice(0, 10) // ArXiv has URL length limits
      .map((a) => `affil:"${a}"`)
      .join(" OR ");
    searchQuery = `all:${query} AND (${affilParts})`;
  } else {
    searchQuery = `all:${query}`;
  }

  const encoded = encodeURIComponent(searchQuery);
  const url = `http://export.arxiv.org/api/query?search_query=${encoded}&max_results=12&sortBy=submittedDate&sortOrder=descending`;

  try {
    const res    = await axios.get(url, { timeout: 20000, headers: { "User-Agent": "SpeakerFinderBot/2.0" } });
    const parsed = await xml2js.parseStringPromise(res.data);
    const entries = parsed.feed.entry || [];

    return entries
      .map((p) => ({
        title:   p.title[0].trim().replace(/\s+/g, " "),
        link:    p.id[0],
        abstract:(p.summary?.[0] || "").trim().substring(0, 400),
        authors: (p.author || []).map((a) => a.name[0].trim()),
        year:    parseInt(p.published[0].substring(0, 4), 10),
        source:  affilTerms ? "arXiv-India" : "arXiv",
      }))
      .filter((p) => p.year >= CURRENT_YEAR - RECENT_YEARS);
  } catch (e) {
    console.warn(`  ArXiv failed for "${query}": ${e.message}`);
    return [];
  }
}

/* ================================================================
OPENALEX SEARCH — Primary source for Indian researchers

OpenAlex is free, requires no API key, and has excellent affiliation
data. It supports filtering by country code (IN) and by specific
institution IDs, making it far more reliable than ArXiv text-matching
for finding Indian researchers.

Docs: https://docs.openalex.org
================================================================ */
async function searchOpenAlex(query, { countryCode = null, institutionIds = null } = {}) {
  const filters = [`publication_year:${CURRENT_YEAR - RECENT_YEARS}-${CURRENT_YEAR}`];

  if (countryCode) {
    filters.push(`institutions.country_code:${countryCode}`);
  }
  if (institutionIds && institutionIds.length > 0) {
    // OpenAlex uses pipe-separated OR within a single filter
    const idFilter = institutionIds
      .map((id) => `https://openalex.org/${id}`)
      .join("|");
    filters.push(`institutions.id:${idFilter}`);
  }

  const params = new URLSearchParams({
    search:    query,
    filter:    filters.join(","),
    "per-page": "15",
    select:    "id,title,publication_year,authorships,open_access,primary_location",
    mailto:    "conference-speaker-tool@example.com", // polite pool access
  });

  try {
    const res   = await axios.get(`https://api.openalex.org/works?${params}`, { timeout: 20000 });
    const works = res.data.results || [];

    return works.map((w) => ({
      title:   (w.title || "").trim(),
      link:    w.open_access?.oa_url || w.primary_location?.landing_page_url || w.id,
      authors: (w.authorships || []).map((a) => ({
        name:         a.author?.display_name || "",
        openAlexId:   a.author?.id || "",
        affiliations: (a.institutions || []).map((i) => i.display_name).filter(Boolean),
        countryCode:  (a.institutions?.[0]?.country_code || "").toUpperCase(),
      })),
      year:   w.publication_year || 0,
      source: institutionIds ? "OpenAlex-IIT" : (countryCode === "IN" ? "OpenAlex-India" : "OpenAlex"),
    }));
  } catch (e) {
    console.warn(`  OpenAlex failed for "${query}": ${e.message}`);
    return [];
  }
}

/* ================================================================
OPENALEX AUTHOR METRICS

OpenAlex has better coverage of Indian researchers than
Semantic Scholar, especially for journal publications (IEEE, Springer,
Elsevier) which are more common than ArXiv for many IIT faculty.
================================================================ */
async function getOpenAlexAuthorMetrics(openAlexId) {
  if (!openAlexId) return null;
  const id = openAlexId.replace("https://openalex.org/", "");

  try {
    const res = await axios.get(
      `https://api.openalex.org/authors/${id}?select=id,display_name,h_index,cited_by_count,works_count,last_known_institutions,topics`,
      { timeout: 12000 }
    );
    const a = res.data;
    return {
      name:         a.display_name || "",
      h_index:      a.h_index       || 0,
      citations:    a.cited_by_count || 0,
      papers:       a.works_count   || 0,
      affiliations: (a.last_known_institutions || []).map((i) => i.display_name).join(", "),
      topics:       (a.topics || []).slice(0, 4).map((t) => t.display_name).join(", "),
      scholar_url:  `https://openalex.org/${id}`,
      source:       "OpenAlex",
    };
  } catch {
    return null;
  }
}

/* ======================
SEMANTIC SCHOLAR — Fallback metrics source
====================== */
async function getSemanticScholarMetrics(name) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.get("https://api.semanticscholar.org/graph/v1/author/search", {
        params: { query: name, fields: "name,hIndex,citationCount,paperCount,affiliations,url", limit: 3 },
        timeout: 10000,
      });
      const candidates = res.data.data || [];
      if (!candidates.length) return null;

      const exact = candidates.find((a) => a.name.toLowerCase() === name.toLowerCase());
      const best  = exact || candidates.sort((a, b) => (b.hIndex || 0) - (a.hIndex || 0))[0];

      return {
        name:         best.name,
        h_index:      best.hIndex        || 0,
        citations:    best.citationCount  || 0,
        papers:       best.paperCount     || 0,
        affiliations: (best.affiliations || []).map((a) => a.name).join(", "),
        scholar_url:  best.url            || "",
        source:       "SemanticScholar",
      };
    } catch (e) {
      if (e.response?.status === 429) await sleep((attempt + 1) * 6000);
      else return null;
    }
  }
  return null;
}

/* ================================================================
SERPER — Google Scholar + Web Profile Search for Indian Researchers

When Serper is available this dramatically improves results for
Indian researchers because:
1. Many IIT/IISc faculty have strong journal/conference publication
   records that don't appear on ArXiv at all
2. Faculty pages on *.ac.in have direct researcher info
3. Google Scholar profiles have h-index right in the snippet
================================================================ */
async function searchIndianResearcherProfiles(topic, institutionHint = "") {
  if (!SERPER_API_KEY) return [];

  const institution = institutionHint || "IIT OR IISc OR NIT OR IIIT";

  // Multiple targeted queries to find different researcher types
  const queries = [
    // Faculty pages on Indian academic domains
    `"${topic}" professor researcher (${institution}) site:*.ac.in`,
    // Google Scholar profiles for Indian researchers
    `site:scholar.google.com "${topic}" (${institution})`,
    // Conference/workshop program committees
    `"${topic}" (${institution}) "h-index" OR "citations" researcher`,
  ];

  const rawResults = [];

  for (const q of queries) {
    try {
      const res = await axios.post(
        "https://google.serper.dev/search",
        { q, num: 6, gl: "in" },
        { headers: { "X-API-KEY": SERPER_API_KEY }, timeout: 12000 }
      );
      rawResults.push(...(res.data.organic || []).map((r) => ({ ...r, queryUsed: q })));
      await sleep(300);
    } catch (e) {
      console.warn(`  Serper query failed: ${e.message}`);
    }
  }

  if (rawResults.length === 0) return [];

  // Use Groq to batch-extract names from all snippets at once (fewer API calls)
  const extractPrompt = `Extract researcher names from these web search results about "${topic}".

${rawResults
  .slice(0, 12)
  .map((r, i) => `[${i}] Title: ${r.title}\n    Snippet: ${(r.snippet || "").substring(0, 150)}`)
  .join("\n\n")}

For each result, output the researcher's full name if clearly present, or null if no individual researcher name is found.
Output ONLY a JSON array of ${Math.min(rawResults.length, 12)} items, each either a name string or null.
Example: ["Sunita Sarawagi", null, "Pushpak Bhattacharyya", null]

Output:`;

  let names = [];
  try {
    const raw   = await localLLMWithRetry(extractPrompt, 2, 300);
    const clean = raw.replace(/```json|```/g, "").trim();
    names = JSON.parse(clean);
  } catch {
    return [];
  }

  const results = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!name || typeof name !== "string" || name.length < 4) continue;

    const cleanName = name.replace(/^(Prof\.|Dr\.|Professor|Dr)\s*/i, "").trim();
    if (cleanName.length < 4) continue;

    results.push({
      name:    cleanName,
      snippet: rawResults[i]?.snippet || "",
      link:    rawResults[i]?.link    || "",
      source:  "SerperIndia",
      papers:  [],
    });
  }

  // Deduplicate by name
  return [...new Map(results.map((r) => [r.name.toLowerCase(), r])).values()];
}

/* ======================
EXTRACT AUTHORS from OpenAlex works
====================== */
function extractOpenAlexAuthors(works) {
  const authorMap = new Map();

  for (const work of works) {
    for (const authorship of work.authors || []) {
      const name = authorship.name?.trim();
      if (!name || name.length < 5 || /\d/.test(name)) continue;

      const key = name.toLowerCase();
      if (!authorMap.has(key)) {
        authorMap.set(key, {
          name,
          openAlexId:   authorship.openAlexId,
          affiliations: authorship.affiliations || [],
          countryCode:  authorship.countryCode  || "",
          papers:       [],
        });
      }
      const c = authorMap.get(key);
      // Prefer the most complete openAlexId
      if (!c.openAlexId && authorship.openAlexId) c.openAlexId = authorship.openAlexId;
      if (!c.affiliations.length && authorship.affiliations?.length) c.affiliations = authorship.affiliations;
      c.papers.push({ title: work.title, year: work.year, link: work.link, source: work.source });
    }
  }

  return [...authorMap.values()];
}

/* ======================
EXTRACT AUTHORS from ArXiv papers (string author names only)
====================== */
function extractArxivAuthors(papers) {
  const authorMap = new Map();

  for (const paper of papers) {
    for (const name of paper.authors || []) {
      const trimmed = name.trim();
      // Filter noise: too short, initials-only, digits
      if (trimmed.length < 5 || /^\w\.\s*\w\./i.test(trimmed) || /\d/.test(trimmed)) continue;

      const key = trimmed.toLowerCase();
      if (!authorMap.has(key)) {
        authorMap.set(key, { name: trimmed, openAlexId: null, affiliations: [], papers: [] });
      }
      authorMap.get(key).papers.push({ title: paper.title, year: paper.year, link: paper.link, source: paper.source });
    }
  }

  return [...authorMap.values()];
}

/* ======================
MERGE candidates from multiple sources, dedup by name
====================== */
function mergeCandidates(...lists) {
  const merged = new Map();

  for (const list of lists) {
    for (const c of list) {
      const key = c.name.toLowerCase().trim();
      if (!key || key.length < 4) continue;

      if (merged.has(key)) {
        const existing = merged.get(key);
        existing.papers.push(...(c.papers || []));
        if (!existing.openAlexId && c.openAlexId) existing.openAlexId = c.openAlexId;
        if (!existing.affiliations?.length && c.affiliations?.length) existing.affiliations = c.affiliations;
      } else {
        merged.set(key, { ...c, papers: [...(c.papers || [])] });
      }
    }
  }

  // Dedup papers within each candidate by link
  for (const c of merged.values()) {
    const seen = new Set();
    c.papers = c.papers.filter((p) => {
      if (!p.link || seen.has(p.link)) return false;
      seen.add(p.link);
      return true;
    });
  }

  return [...merged.values()];
}

/* ======================
QUALITY CLASSIFICATION
====================== */
function classifyAuthor(metrics) {
  if (!metrics) return { tier: "unknown", pass: false };
  const h = metrics.h_index  || 0;
  const c = metrics.citations || 0;
  if (h >= 20 || c >= 2000) return { tier: "established", pass: true };
  if (h >= 10 || c >= 500)  return { tier: "strong",      pass: true };
  if (h >= 5  || c >= 100)  return { tier: "emerging",    pass: true };
  if (h >= 3  || c >= 30)   return { tier: "promising",   pass: true };
  return { tier: "weak", pass: false };
}

/* ======================
SCORING
====================== */
function scoreAuthor(metrics, candidatePapers = []) {
  if (!metrics) return 0;
  let score = 0;
  score += (metrics.h_index  || 0) * 3;
  score += Math.min((metrics.citations || 0) / 50, 100);
  score += Math.min((metrics.papers    || 0) * 0.5, 30);
  // Recency bonus
  score += candidatePapers.filter((p) => p.year >= CURRENT_YEAR - 2).length * 10;
  // Topic relevance bonus
  score += candidatePapers.length * 5;
  return Math.round(score);
}

/* ======================
PROFILE BUILDER
====================== */
async function buildProfile(candidate, topic, metrics, classification) {
  const recentPapers = candidate.papers
    .sort((a, b) => b.year - a.year)
    .slice(0, 3)
    .map((p) => `- "${p.title}" (${p.year})`)
    .join("\n");

  const prompt = `Write a factual conference speaker profile for "${topic}".

Name: ${metrics.name || candidate.name}
Affiliation: ${metrics.affiliations || candidate.affiliations?.join(", ") || "Unknown"}
h-index: ${metrics.h_index} | Citations: ${metrics.citations} | Total papers: ${metrics.papers}
Research areas: ${metrics.topics || "(not available)"}
Tier: ${classification.tier}

Recent relevant papers:
${recentPapers || "(not available)"}

Write 80-100 words. Cover: research focus, relevance to "${topic}", academic standing, value to attendees.
ONLY use facts given above. Do not invent institution names or paper titles.`;

  try {
    return (await localLLMWithRetry(prompt, 2, 200)).trim();
  } catch {
    return `${metrics.name || candidate.name} is a ${classification.tier} researcher in ${topic} (h-index: ${metrics.h_index}, citations: ${metrics.citations}). Their work spans ${metrics.topics || topic}, with recent publications directly relevant to this area. Attendees will benefit from their hands-on research perspective and academic depth.`;
  }
}

/* ======================
PARALLEL METRIC FETCHER
Tries OpenAlex first (better Indian coverage), falls back to Semantic Scholar.
====================== */
async function batchGetMetrics(candidates, concurrency = 3) {
  const results = new Array(candidates.length).fill(null);
  const queue   = [...candidates.keys()];

  async function worker() {
    while (queue.length > 0) {
      const i = queue.shift();
      const c = candidates[i];

      if (c.openAlexId) {
        results[i] = await getOpenAlexAuthorMetrics(c.openAlexId);
      }
      if (!results[i]) {
        results[i] = await getSemanticScholarMetrics(c.name);
      }

      await sleep(200);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/* ================================================================
MAIN PIPELINE

source:
  1 = Indian institutions     (OpenAlex country:IN + ArXiv affil:India terms)
  2 = Global / Foreign        (OpenAlex global + ArXiv global)
  3 = Web profiles            (Serper, requires SERPER_API_KEY)
  4 = IIT/NIT/IISc only       (OpenAlex institution IDs + ArXiv affil:IIT* terms)
  5 = All combined            (default, best results)
================================================================ */
async function findConferenceSpeakers(topic, limit = 10, source = 5) {
  console.log(`\n🔍 "${topic}" | source=${source} | limit=${limit}`);

  console.log("📚 Expanding topic keywords...");
  const keywords = await expandTopic(topic);
  console.log("  →", keywords.join(" | "));

  /* ---- Parallel paper fetch ---- */
  console.log("📄 Fetching papers...");

  const paperTasks = keywords.map(async (kw) => {
    const tasks = [];

    if (source === 1 || source === 5) {
      // OpenAlex filtered by country (best for Indian researcher discovery)
      tasks.push(searchOpenAlex(kw, { countryCode: "IN" }));
      // ArXiv with proper affil: syntax for Indian institutions
      tasks.push(searchArxivBase(kw, INDIA_AFFIL_TERMS));
    }

    if (source === 4 || source === 5) {
      // OpenAlex filtered by IIT/IISc institution IDs (most precise)
      tasks.push(searchOpenAlex(kw, { institutionIds: OPENALEX_IIT_IDS }));
      // ArXiv with proper affil: syntax using full IIT names
      tasks.push(searchArxivBase(kw, IIT_AFFIL_TERMS.slice(0, 8))); // 8 terms to stay within URL limits
    }

    if (source === 2 || source === 5) {
      tasks.push(searchOpenAlex(kw));
      tasks.push(searchArxivBase(kw));
    }

    const allResults = await Promise.all(tasks);
    return allResults.flat();
  });

  const allPapersBatched = await Promise.all(paperTasks);
  const allPapers = allPapersBatched.flat();

  // Separate OpenAlex (rich author objects) from ArXiv (string author names)
  const oaWorks    = [];
  const arxivPapers = [];

  for (const p of allPapers) {
    if (p.source?.startsWith("OpenAlex") && Array.isArray(p.authors) && typeof p.authors[0] === "object") {
      oaWorks.push(p);
    } else {
      arxivPapers.push(p);
    }
  }

  // Dedup by link
  const dedup = (arr) => [...new Map(arr.map((p) => [p.link || p.title, p])).values()];
  const uniqueOA    = dedup(oaWorks);
  const uniqueArxiv = dedup(arxivPapers);

  console.log(`  OpenAlex: ${uniqueOA.length} papers | ArXiv: ${uniqueArxiv.length} papers`);

  /* ---- Extract candidates ---- */
  const oaAuthors    = extractOpenAlexAuthors(uniqueOA);
  const arxivAuthors = extractArxivAuthors(uniqueArxiv);

  /* ---- Serper web search for researcher profiles ---- */
  let serperCandidates = [];
  if (SERPER_API_KEY && (source === 1 || source === 4 || source === 5)) {
    console.log("🔎 Searching researcher profiles via Serper...");
    const hint = source === 4 ? "IIT OR IISc" : "IIT OR IISc OR India";
    const found = await searchIndianResearcherProfiles(topic, hint);
    console.log(`  → ${found.length} profiles via web`);
    serperCandidates = found.map((p) => ({
      name: p.name, openAlexId: null, affiliations: [], papers: [], source: p.source,
    }));
  }

  /* ---- Merge and deduplicate all candidates ---- */
  let candidates = mergeCandidates(oaAuthors, arxivAuthors, serperCandidates);
  console.log(`  Total unique candidates: ${candidates.length}`);

  if (candidates.length === 0) {
    console.warn("  ⚠️  No candidates found. Try a broader topic or source=5.");
    return [];
  }

  /* ---- Fetch metrics (OpenAlex preferred, SS fallback) ---- */
  console.log("📊 Fetching author metrics...");
  const metricsArr = await batchGetMetrics(candidates, 3);

  /* ---- Filter, score, rank ---- */
  const scored = candidates
    .map((c, i) => {
      const metrics        = metricsArr[i];
      const classification = classifyAuthor(metrics);
      if (!classification.pass) return null;
      return { candidate: c, metrics, classification, score: scoreAuthor(metrics, c.papers) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  console.log(`  ${scored.length} passed quality filter`);

  /* ---- Build profiles ---- */
  console.log("✍️  Building profiles...");
  const profiles = [];

  for (const { candidate, metrics, classification, score } of scored) {
    if (profiles.length >= limit) break;

    const profileText = await buildProfile(candidate, topic, metrics, classification);

    profiles.push({
      name:            metrics.name || candidate.name,
      affiliations:    metrics.affiliations || candidate.affiliations?.join(", ") || "Unknown",
      tier:            classification.tier,
      relevance_score: score,
      h_index:         metrics.h_index,
      citations:       metrics.citations,
      papers_on_topic: candidate.papers.length,
      recent_papers:   candidate.papers
        .sort((a, b) => b.year - a.year)
        .slice(0, 3)
        .map((p) => ({ title: p.title, year: p.year, link: p.link })),
      scholar_url: metrics.scholar_url,
      profile:     profileText,
      data_sources: [...new Set([
        ...candidate.papers.map((p) => p.source),
        metrics.source,
      ].filter(Boolean))].join(", "),
    });

    await sleep(400);
  }

  console.log(`✅ Done — ${profiles.length} speakers found.\n`);
  return profiles;
}

/* ======================
EXPORTS
====================== */
export { findConferenceSpeakers, expandTopic };