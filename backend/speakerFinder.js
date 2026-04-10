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

const CURRENT_YEAR   = new Date().getFullYear();
const RECENT_YEARS   = 3; // papers within last N years are "recent"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ======================
GROQ LLM CALL
====================== */
async function localLLM(prompt, temperature = 0.3, maxTokens = 512) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Get a free key at https://console.groq.com");
  }

  const res = await axios.post(
    GROQ_URL,
    {
      model:      GROQ_MODEL,
      messages:   [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization:  `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) {
    console.error("Bad Groq response:", res.data);
    throw new Error("Invalid Groq output");
  }

  return text;
}

/* ======================
RETRY WRAPPER
====================== */
async function localLLMWithRetry(prompt, retries = 2, maxTokens = 512) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await localLLM(prompt, 0.3, maxTokens);
    } catch (e) {
      if (e.response?.status === 429) {
        const wait = (i + 1) * 10000;
        console.log(`Groq rate limit — waiting ${wait / 1000}s (retry ${i + 1})...`);
        await sleep(wait);
      } else if (i === retries) {
        throw e;
      } else {
        console.log(`Retrying Groq (attempt ${i + 1})...`);
        await sleep(2000 * (i + 1));
      }
    }
  }
}

/* ======================
TOPIC EXPANSION
Generates domain-specific, varied keywords instead of generic ones.
====================== */
async function expandTopic(topic) {
  const prompt = `You are a research librarian. Given the topic below, generate exactly 5 distinct search keywords or short phrases for finding academic papers on ArXiv.

Rules:
- Be specific and technical, not generic
- Cover different sub-angles of the topic (methods, applications, theory, benchmarks, datasets)
- Each keyword should be 1-4 words
- Output ONLY a JSON array of strings. No explanation, no markdown.

Topic: "${topic}"

Example output for "transformer models":
["attention mechanisms", "self-supervised pretraining", "vision transformers", "language model fine-tuning", "BERT GPT benchmarks"]

Output:`;

  try {
    const text = await localLLMWithRetry(prompt, 2, 256);
    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5).map(k => String(k).trim()).filter(Boolean);
    }
  } catch (e) {
    console.warn("Topic expansion failed, using fallback:", e.message);
  }

  // Fallback: simple splits
  return [topic, `${topic} survey`, `${topic} deep learning`];
}

/* ======================
ARXIV SEARCH — Base
Filters to recent papers (CURRENT_YEAR - RECENT_YEARS onwards).
Returns richer paper objects including abstract snippet.
====================== */
async function searchArxivBase(query, extraFilter = "") {
  const fullQuery = extraFilter ? `${query} AND (${extraFilter})` : query;
  // Sort by submission date descending for recency
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(fullQuery)}&max_results=10&sortBy=submittedDate&sortOrder=descending`;

  try {
    const res    = await axios.get(url, { timeout: 20000 });
    const parsed = await xml2js.parseStringPromise(res.data);
    const entries = parsed.feed.entry || [];

    return entries
      .map((p) => {
        const year = parseInt(p.published[0].substring(0, 4), 10);
        return {
          title:    p.title[0].trim().replace(/\s+/g, " "),
          link:     p.id[0],
          abstract: (p.summary?.[0] || "").trim().substring(0, 300),
          authors:  (p.author || []).map((a) => a.name[0].trim()),
          year,
          source:   extraFilter ? "arXiv-India" : "arXiv",
        };
      })
      // Only keep papers from last N years
      .filter((p) => p.year >= CURRENT_YEAR - RECENT_YEARS);
  } catch (e) {
    console.warn(`ArXiv search failed for "${query}":`, e.message);
    return [];
  }
}

const searchArxiv       = (q) => searchArxivBase(q);
const searchArxivIndian = (q) => searchArxivBase(q, "India OR IIT OR IISc OR NIT OR IIIT OR TIFR OR IISER");
const searchArxivIIT    = (q) => searchArxivBase(q, "IIT OR IISc OR NIT OR IIIT");

/* ======================
SEMANTIC SCHOLAR — AUTHOR LOOKUP
Falls back gracefully; retries on 429.
====================== */
async function getAuthorMetrics(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.get(
        "https://api.semanticscholar.org/graph/v1/author/search",
        {
          params: {
            query:  name,
            fields: "name,hIndex,citationCount,paperCount,affiliations,url",
            limit:  3,
          },
          timeout: 10000,
        }
      );

      const candidates = res.data.data || [];
      if (candidates.length === 0) return null;

      // Pick best match: prefer exact name match, then highest h-index
      const exactMatch = candidates.find(
        (a) => a.name.toLowerCase() === name.toLowerCase()
      );
      const best = exactMatch || candidates.sort((a, b) => (b.hIndex || 0) - (a.hIndex || 0))[0];

      return {
        name:         best.name,
        h_index:      best.hIndex       || 0,
        citations:    best.citationCount || 0,
        papers:       best.paperCount   || 0,
        affiliations: (best.affiliations || []).map((a) => a.name).join(", "),
        scholar_url:  best.url          || "",
      };
    } catch (e) {
      if (e.response?.status === 429) {
        console.log(`Semantic Scholar rate limit — waiting ${(attempt + 1) * 5}s...`);
        await sleep((attempt + 1) * 5000);
      } else if (e.response?.status === 404) {
        return null;
      } else {
        console.warn(`Semantic Scholar failed for "${name}":`, e.message);
        return null;
      }
    }
  }
  return null;
}

/* ======================
LINKEDIN SEARCH (optional, requires Serper)
====================== */
async function searchLinkedInExperts(topic) {
  if (!SERPER_API_KEY) return [];

  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: `site:linkedin.com/in "${topic}" researcher professor`, num: 5 },
      {
        headers: { "X-API-KEY": SERPER_API_KEY },
        timeout: 10000,
      }
    );

    return (res.data.organic || []).map((r) => {
      const parts = r.title.split(" - ");
      return {
        name:         parts[0]?.trim() || "Unknown",
        role:         parts[1]?.trim() || "",
        organization: parts[2]?.trim() || "",
        linkedin:     r.link,
        source:       "LinkedIn",
      };
    });
  } catch (e) {
    console.warn("LinkedIn search failed:", e.message);
    return [];
  }
}

/* ======================
AUTHOR EXTRACTION
Groups papers by author, tracks recency and paper count.
Filters out single-letter names and obvious noise.
====================== */
function extractAuthors(papers) {
  const authorMap = new Map(); // name_lower -> { name, papers[] }

  for (const paper of papers) {
    for (const author of paper.authors) {
      const key = author.toLowerCase().trim();

      // Skip clearly bad names: too short, initials only, numbers
      if (
        key.length < 5 ||
        /^\w\.\s*\w\./.test(author) || // "A. B." style
        /\d/.test(author)              // contains digits
      ) continue;

      if (!authorMap.has(key)) {
        authorMap.set(key, { name: author, papers: [] });
      }
      authorMap.get(key).papers.push(paper);
    }
  }

  return [...authorMap.values()];
}

/* ======================
AUTHOR QUALITY FILTER
Multi-tier: accepts strong established OR promising emerging researchers.
====================== */
function classifyAuthor(metrics) {
  if (!metrics) return { tier: "unknown", pass: false };

  const { h_index, citations, papers } = metrics;

  if (h_index >= 20 || citations >= 2000) {
    return { tier: "established", pass: true };
  }
  if (h_index >= 10 || citations >= 500) {
    return { tier: "strong", pass: true };
  }
  if (h_index >= 5 || citations >= 100) {
    return { tier: "emerging", pass: true };
  }
  if (papers >= 5 && h_index >= 3) {
    return { tier: "promising", pass: true };
  }
  return { tier: "weak", pass: false };
}

/* ======================
RELEVANCE SCORING
Weighted score using metrics + paper recency + paper count on topic.
====================== */
function scoreAuthor(metrics, candidatePapers = []) {
  if (!metrics) return 0;

  const { h_index, citations, papers } = metrics;

  // Base academic score
  let score = 0;
  score += h_index * 3;
  score += Math.min(citations / 50, 100);  // cap at 100 pts
  score += Math.min(papers * 0.5, 30);     // cap at 30 pts

  // Recency bonus: papers published in last 2 years
  const recentCount = candidatePapers.filter(
    (p) => p.year >= CURRENT_YEAR - 2
  ).length;
  score += recentCount * 10;

  // Prolific on this specific topic bonus
  score += candidatePapers.length * 5;

  return Math.round(score);
}

/* ======================
PROFILE BUILDER
Uses actual paper titles + affiliation to ground the LLM and reduce hallucination.
====================== */
async function buildProfile(candidate, topic, metrics, classification) {
  const recentPapers = candidate.papers
    .sort((a, b) => b.year - a.year)
    .slice(0, 3)
    .map((p) => `- "${p.title}" (${p.year})`)
    .join("\n");

  const affiliation = metrics.affiliations
    ? `Affiliation: ${metrics.affiliations}`
    : "Affiliation: Unknown";

  const prompt = `You are writing a speaker recommendation for a conference on "${topic}".

Researcher: ${metrics.name || candidate.name}
${affiliation}
Academic profile: h-index ${metrics.h_index}, ${metrics.citations} citations, ${metrics.papers} publications
Tier: ${classification.tier}

Recent papers on topic:
${recentPapers || "Not available"}

Write a factual, professional speaker profile of 80–100 words. Include:
1. Their research focus
2. Why they are relevant to "${topic}"
3. A brief mention of their academic standing
4. One sentence on what attendees would gain

Do NOT invent facts. Only use the information provided above.`;

  try {
    const text = await localLLMWithRetry(prompt, 2, 200);
    return text.trim();
  } catch {
    // Graceful fallback: template-based profile
    return `${metrics.name || candidate.name} is a researcher in ${topic} with an h-index of ${metrics.h_index} and ${metrics.citations} citations. They have published ${metrics.papers} papers and bring deep expertise to the field. Their recent work includes contributions directly related to ${topic}, making them a valuable speaker for practitioners and researchers alike.`;
  }
}

/* ======================
PARALLEL AUTHOR METRIC FETCHER
Batches Semantic Scholar calls with concurrency limit to avoid hammering the API.
====================== */
async function batchGetMetrics(authors, concurrency = 3) {
  const results = new Array(authors.length).fill(null);
  const queue   = [...authors.keys()]; // index queue

  async function worker() {
    while (queue.length > 0) {
      const i = queue.shift();
      results[i] = await getAuthorMetrics(authors[i].name);
      await sleep(300); // be polite to the free API
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/* ======================
MAIN PIPELINE

source:
  1 = Indian institutions only
  2 = Global (no India filter)
  3 = LinkedIn (requires Serper key)
  4 = IIT/IISc/NIT only
  5 = All (global + India)
====================== */
async function findConferenceSpeakers(topic, limit = 10, source = 5) {
  console.log(`\n🔍 Finding speakers for: "${topic}" (source=${source}, limit=${limit})`);

  // Step 1: Expand topic into specific keywords
  console.log("📚 Expanding topic keywords...");
  const keywords = await expandTopic(topic);
  console.log("  Keywords:", keywords.join(", "));

  // Step 2: Fetch papers from ArXiv in parallel
  console.log("📄 Fetching papers from ArXiv...");
  const paperFetchTasks = keywords.map((k) => {
    if (source === 1) return searchArxivIndian(k);
    if (source === 2) return searchArxiv(k);
    if (source === 4) return searchArxivIIT(k);
    // source 5: both global and Indian
    return Promise.all([searchArxiv(k), searchArxivIndian(k)]).then(([g, i]) => [...g, ...i]);
  });

  const paperBatches = await Promise.all(paperFetchTasks);

  // Deduplicate papers by ArXiv link
  const paperMap = new Map();
  for (const batch of paperBatches) {
    for (const p of batch) {
      if (!paperMap.has(p.link)) paperMap.set(p.link, p);
    }
  }
  const allPapers = [...paperMap.values()];
  console.log(`  Found ${allPapers.length} unique recent papers`);

  if (allPapers.length === 0) {
    console.warn("  ⚠️  No recent papers found. Try a broader topic or different source.");
    return [];
  }

  // Step 3: Extract candidate authors
  let candidates = extractAuthors(allPapers);
  console.log(`  Extracted ${candidates.length} candidate authors`);

  // Step 4: Fetch metrics in parallel (with concurrency limit)
  console.log("📊 Fetching author metrics from Semantic Scholar...");
  const metricsArr = await batchGetMetrics(candidates, 3);

  // Step 5: Filter, score, and rank
  const scoredCandidates = candidates
    .map((c, i) => {
      const metrics        = metricsArr[i];
      const classification = classifyAuthor(metrics);
      if (!classification.pass) return null;

      const score = scoreAuthor(metrics, c.papers);
      return { candidate: c, metrics, classification, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  console.log(`  ${scoredCandidates.length} authors passed quality filter`);

  // Step 6: Build profiles for top N
  console.log("✍️  Building speaker profiles...");
  const profiles = [];

  for (const { candidate, metrics, classification, score } of scoredCandidates) {
    if (profiles.length >= limit) break;

    const profileText = await buildProfile(candidate, topic, metrics, classification);

    profiles.push({
      name:            metrics.name || candidate.name,
      affiliations:    metrics.affiliations || "Unknown",
      tier:            classification.tier,
      relevance_score: score,
      h_index:         metrics.h_index,
      citations:       metrics.citations,
      papers_on_topic: candidate.papers.length,
      recent_papers:   candidate.papers
        .sort((a, b) => b.year - a.year)
        .slice(0, 3)
        .map((p) => ({ title: p.title, year: p.year, link: p.link })),
      scholar_url:     metrics.scholar_url,
      profile:         profileText,
      source:          candidate.papers[0]?.source || "arXiv",
    });

    // Small delay between LLM calls
    await sleep(500);
  }

  console.log(`✅ Done! Returning ${profiles.length} speakers.\n`);
  return profiles;
}

/* ======================
EXPORTS
====================== */
export { findConferenceSpeakers, searchLinkedInExperts, expandTopic };