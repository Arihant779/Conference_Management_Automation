import axios from "axios";
import xml2js from "xml2js";
import dotenv from "dotenv";

dotenv.config();

/* ======================
CONFIG
====================== */

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "tinyllama";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ======================
LOCAL LLM CALL
====================== */

async function localLLM(prompt, temperature = 0.3) {
  const res = await axios.post(
    OLLAMA_URL,
    {
      model: MODEL,
      prompt,
      temperature,
      stream: false,
    },
    { timeout: 300000 }
  );

  if (!res.data || !res.data.response) {
    console.error("Bad LLM response:", res.data);
    throw new Error("Invalid LLM output");
  }

  return res.data.response;
}

/* ======================
RETRY WRAPPER
====================== */

async function localLLMWithRetry(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await localLLM(prompt);
    } catch (e) {
      if (i === retries) throw e;
      console.log(`Retrying LLM (attempt ${i + 1})...`);
      await sleep(3000);
    }
  }
}

/* ======================
TOPIC EXPANSION
====================== */

async function expandTopic(topic) {
  const prompt = `
Topic: ${topic}

Give 3 related research keywords.
Return them as a simple comma separated list.

Example:
machine learning, deep learning, neural networks
`;

  const text = await localLLMWithRetry(prompt);

  const keywords = text
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywords.length === 0) return [topic];

  return keywords.slice(0, 3);
}

/* ======================
ARXIV SEARCH (General)
====================== */

async function searchArxiv(query) {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    query
  )}&max_results=5`;

  const res = await axios.get(url, { timeout: 15000 });
  const parsed = await xml2js.parseStringPromise(res.data);
  const entries = parsed.feed.entry || [];

  return entries.map((p) => ({
    title: p.title[0].trim(),
    link: p.id[0],
    authors: (p.author || []).map((a) => a.name[0]),
    year: p.published[0].substring(0, 4),
    source: "arXiv",
  }));
}

/* ======================
ARXIV INDIA
====================== */

async function searchArxivIndian(query) {
  const filter = "(India OR IIT OR IISc OR NIT OR IIIT)";
  const finalQuery = `${query} AND ${filter}`;

  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    finalQuery
  )}&max_results=5`;

  const res = await axios.get(url, { timeout: 15000 });
  const parsed = await xml2js.parseStringPromise(res.data);
  const entries = parsed.feed.entry || [];

  return entries.map((p) => ({
    title: p.title[0].trim(),
    link: p.id[0],
    authors: (p.author || []).map((a) => a.name[0]),
    year: p.published[0].substring(0, 4),
    source: "arXiv-India",
  }));
}

/* ======================
ARXIV IIT/NIT
====================== */

async function searchArxivIIT(query) {
  const filter = "(IIT OR IISc OR NIT OR IIIT)";
  const finalQuery = `${query} AND ${filter}`;

  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    finalQuery
  )}&max_results=5`;

  const res = await axios.get(url, { timeout: 15000 });
  const parsed = await xml2js.parseStringPromise(res.data);
  const entries = parsed.feed.entry || [];

  return entries.map((p) => ({
    title: p.title[0].trim(),
    link: p.id[0],
    authors: (p.author || []).map((a) => a.name[0]),
    year: p.published[0].substring(0, 4),
    source: "arXiv-IIT",
  }));
}

/* ======================
LINKEDIN SEARCH
====================== */

async function searchLinkedInExperts(topic) {
  if (!SERPER_API_KEY) return [];

  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: `site:linkedin.com/in "${topic}" researcher`, num: 5 },
      { headers: { "X-API-KEY": SERPER_API_KEY } }
    );

    return (res.data.organic || []).map((r) => {
      const parts = r.title.split(" - ");
      return {
        name: parts[0] || "Unknown",
        role: parts[1] || "",
        organization: parts[2] || "",
        linkedin: r.link,
        source: "LinkedIn",
        relevance_score: null,
        profile: null,
      };
    });
  } catch {
    return [];
  }
}

/* ======================
SEMANTIC SCHOLAR METRICS
====================== */

async function getAuthorMetrics(name) {
  try {
    const res = await axios.get(
      "https://api.semanticscholar.org/graph/v1/author/search",
      {
        params: {
          query: name,
          fields: "name,hIndex,citationCount,paperCount,url",
          limit: 1,
        },
      }
    );

    if (!res.data.data || res.data.data.length === 0) return {};

    const a = res.data.data[0];

    return {
      h_index: a.hIndex || 0,
      citations: a.citationCount || 0,
      papers: a.paperCount || 0,
      scholar_url: a.url || "",
    };
  } catch {
    return {};
  }
}

/* ======================
AUTHOR FILTER
====================== */

function isStrongAuthor(metrics) {
  return metrics.h_index >= 10 || metrics.citations >= 500;
}

/* ======================
AUTHOR SCORING
====================== */

function scoreAuthor(metrics) {
  let score = 0;
  score += (metrics.h_index || 0) * 2;
  score += (metrics.citations || 0) / 100;
  score += (metrics.papers || 0) * 1.5;
  return Math.round(score);
}

/* ======================
EXTRACT AUTHORS
====================== */

function extractAuthors(papers) {
  const seen = new Set();
  const authors = [];

  for (const p of papers) {
    for (const a of p.authors) {
      const key = a.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      authors.push({
        name: a.trim(),
        papers: [p],
        source: p.source,
      });
    }
  }

  return authors;
}

/* ======================
PROFILE BUILDER
====================== */

async function buildProfile(person, topic, metrics) {
  const prompt = `
Name: ${person.name}
Topic: ${topic}
h-index: ${metrics.h_index}
citations: ${metrics.citations}

Write a short speaker profile including:
- Institution
- Short bio
- Research areas
- Why this person should be invited to speak

Keep it under 120 words.
`;

  const text = await localLLMWithRetry(prompt);

  return {
    name: person.name,
    profile: text.trim(),
    relevance_score: scoreAuthor(metrics),
  };
}

/* ======================
MAIN PIPELINE
// source: 1=Indian, 2=Foreign, 3=LinkedIn, 4=IIT/NIT, 5=All
====================== */

async function findConferenceSpeakers(topic, limit, source = 5) {
  const keywords = await expandTopic(topic);

  let candidates = [];

  for (const k of keywords) {
    let papers = [];

    if (source === 1) {
      // Indian researchers only
      papers = await searchArxivIndian(k);
    } else if (source === 2) {
      // Foreign researchers — general arXiv excluding India
      papers = await searchArxiv(k);
    } else if (source === 4) {
      // IIT/NIT only
      papers = await searchArxivIIT(k);
    } else {
      // All (5) or fallback — combine general + Indian
      const [general, indian] = await Promise.all([
        searchArxiv(k),
        searchArxivIndian(k),
      ]);
      papers = [...general, ...indian];
    }

    candidates.push(...extractAuthors(papers));
  }

  // Deduplicate by name
  candidates = [
    ...new Map(candidates.map((a) => [a.name.toLowerCase(), a])).values(),
  ];

  const profiles = [];

  for (const c of candidates) {
    const metrics = await getAuthorMetrics(c.name);

    if (!isStrongAuthor(metrics)) continue;

    const profile = await buildProfile(c, topic, metrics);
    profiles.push(profile);

    if (profiles.length >= limit) break;
  }

  profiles.sort((a, b) => b.relevance_score - a.relevance_score);

  return profiles.slice(0, limit);
}

/* ======================
EXPORTS
====================== */

export { findConferenceSpeakers, searchLinkedInExperts };