/**
 * speakerFinder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-file module. Drop it anywhere and import from it directly.
 *
 * Exports:
 *   findConferenceSpeakers(topic, limit, source)
 *   searchLinkedInExperts(topic, institution?)
 *   findSpeakerEmail(name, institution, options?)
 *   findEmailsForSpeakers(speakers[], options?)
 *
 * Uses only: Groq LLM + Serper (no arXiv / Semantic Scholar — blocked in many envs)
 *
 * SOURCE MODES for findConferenceSpeakers:
 *   1 = Indian researchers (any Indian institution)
 *   2 = Foreign / global researchers
 *   3 = All (broad)
 *   4 = IIT / IISc / NIT / IIIT specifically
 *   5 = All (mixed, ranked by score)
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const SERPER_API_KEY = process.env.SERPER_API_KEY || "";
const GROQ_API_KEY   = process.env.GROQ_API_KEY   || "";
const GROQ_MODEL     = "llama-3.3-70b-versatile";
const GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Simple in-memory cache to prevent redundant API calls
const _FINDER_CACHE = new Map();

/* ═══════════════════════════════════════════════════════════════
   SHARED UTILITIES
═══════════════════════════════════════════════════════════════ */

/* ── Groq ── */
async function _groqCall(messages, maxTokens = 1024, temperature = 0.3) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set — get a free key at https://console.groq.com");
  const res = await axios.post(
    GROQ_URL,
    { model: GROQ_MODEL, messages, temperature, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
  );
  const text = res.data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty Groq response");
  return text;
}

async function _groqRetry(messages, maxTokens = 1024, temperature = 0.3, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await _groqCall(messages, maxTokens, temperature);
    } catch (e) {
      if (e.response?.status === 429) {
        const wait = (i + 1) * 8000;
        console.log(`  ⏳ Groq rate limit — waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else if (i === retries) {
        throw e;
      } else {
        await sleep(2000);
      }
    }
  }
}

/* Convenience wrapper for single-prompt calls */
const groq = (prompt, maxTokens = 1024, temperature = 0.3) =>
  _groqRetry([{ role: "user", content: prompt }], maxTokens, temperature);

/* ── Serper ── */
async function _serperSearch(query, num = 5) {
  if (!SERPER_API_KEY) return { results: [], raw: "" };
  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: query, num },
      { headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" }, timeout: 10000 }
    );
    const results = res.data.organic || [];
    const raw     = results.map((r) => `${r.title} ${r.snippet} ${r.link}`).join(" ");
    return { results, raw };
  } catch (e) {
    console.warn(`  ⚠️  Serper failed for "${query}": ${e.message}`);
    return { results: [], raw: "" };
  }
}

async function _serperScholarSearch(query, num = 5) {
  if (!SERPER_API_KEY) return { results: [], raw: "" };
  try {
    const res = await axios.post(
      "https://google.serper.dev/scholar",
      { q: query, num },
      { headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" }, timeout: 10000 }
    );
    const results = res.data.organic || [];
    const raw     = results.map((r) => `${r.description || ""} ${r.publication || ""}`).join(" ");
    // Special handling for Scholar authors which have a direct 'email' or 'author' property if it's a profile
    return { results, raw };
  } catch (e) {
    console.warn(`  ⚠️  Serper Scholar failed for "${query}": ${e.message}`);
    return { results: [], raw: "" };
  }
}

async function _getVerifiedDomainFromScholar(name, institution) {
  // Use Organic Search to find the Scholar Profile snippet
  const query = `site:scholar.google.com/citations "${name}" "${institution}"`;
  const { results } = await _serperSearch(query, 3);
  
  for (const r of results) {
    if (!r.link.includes("scholar.google.com/citations")) continue;
    
    const text = (r.snippet || "").toLowerCase();
    // Look for "Verified email at university.edu"
    const match = text.match(/verified email at ([a-z0-9.-]+\.[a-z]{2,})/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function _queryOpenAlex(name, institution) {
  try {
    const query = encodeURIComponent(`${name} ${institution}`);
    // OpenAlex is a free, open API for academic metadata
    const res = await axios.get(`https://api.openalex.org/authors?search=${query}&mailto=admin@conference-automation.com`, { timeout: 8000 });
    const author = res.data.results?.[0];
    if (!author) return null;

    return {
      name: author.display_name,
      id: author.id,
      orcid: author.orcid,
      last_institution: author.last_known_institutions?.[0]?.display_name,
      domain: author.last_known_institutions?.[0]?.ror?.split('/').pop() // Or just return the info
    };
  } catch (e) {
    console.warn(`  ⚠️  OpenAlex failed: ${e.message}`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SPEAKER FINDER
   ─────────────────────────────────────────────────────────────
   Pipeline: Groq generates names → Serper validates → Groq writes bios
═══════════════════════════════════════════════════════════════ */

const INDIAN_RE = /\b(IIT|IISc|NIT|IISER|TIFR|IIIT|BITS Pilani|ISI Kolkata|Jadavpur|Anna University|Delhi University|CSIR|ISRO|DRDO|C-DAC|Amrita|Manipal|VIT|SRM|Indian Institute)\b/i;
const IITNIC_RE = /\b(IIT Bombay|IIT Delhi|IIT Madras|IIT Kanpur|IIT Kharagpur|IIT Roorkee|IIT Hyderabad|IIT Guwahati|IIT Gandhinagar|IIT Jodhpur|IIT Patna|IIT Indore|IIT BHU|IISc|Indian Institute of Science|NIT Trichy|NIT Warangal|NIT Surathkal|NIT Calicut|IIIT Hyderabad|IIIT Delhi)\b/i;

const isIndian = (c) => INDIAN_RE.test(c.institution || "") || (c.country || "").toLowerCase() === "india";
const isIITNIT = (c) => IITNIC_RE.test(c.institution || "");

function _scoreCandidate(c, source) {
  let s = 0;
  s += (c.h_index_estimate  || 0) * 3;
  s += (c.citation_estimate || 0) / 100;
  if (c.scholar_url)    s += 10;
  if (c.dblp_url)       s += 8;
  if (c.linkedin_url)   s += 5;
  if (c.topic_relevant) s += 15;
  if (c.confirmed)      s += 20;
  if ((source === 1 || source === 5) && isIndian(c)) s += 20;
  if ((source === 4 || source === 5) && isIITNIT(c)) s += 30;
  return Math.round(s);
}

async function _generateCandidates(topic, source, count = 20) {
  const regionPrompt = {
    1: `Focus ONLY on researchers currently based at Indian institutions (IIT Bombay, IIT Delhi, IIT Madras, IIT Kanpur, IIT Kharagpur, IIT Roorkee, IIT Hyderabad, IIT Guwahati, IISc Bangalore, TIFR Mumbai, IISER, NIT Trichy, NIT Warangal, BITS Pilani, ISI Kolkata, IIIT Hyderabad, Jadavpur University, Anna University, Delhi University, etc.). Do NOT include Indian-origin researchers working abroad.`,
    2: `Focus on researchers at top global institutions outside India (MIT, Stanford, CMU, Oxford, Cambridge, ETH Zurich, UC Berkeley, Google DeepMind, OpenAI, Meta AI, Microsoft Research, etc.).`,
    3: `Include researchers from any country with strong professional presence.`,
    4: `Focus STRICTLY on researchers currently employed at one of: IIT Bombay, IIT Delhi, IIT Madras, IIT Kanpur, IIT Kharagpur, IIT Roorkee, IIT Hyderabad, IIT Guwahati, IIT Gandhinagar, IIT Jodhpur, IIT Indore, IIT BHU, IISc Bangalore, NIT Trichy, NIT Warangal, NIT Surathkal, NIT Calicut, NIT Rourkela, IIIT Hyderabad, IIIT Delhi. Do NOT include people who studied there but now work elsewhere.`,
    5: `Include a diverse mix of top researchers worldwide — both Indian-based and global.`,
  }[source] || "";

  const prompt = `You are an expert academic conference organizer. List ${count} real, prominent researchers who would make excellent speakers at a conference on: "${topic}"

${regionPrompt}

Return ONLY a valid JSON array. No markdown, no code fences, no explanation. Each object must have exactly these keys:
- "name": full name
- "institution": their CURRENT institution/organization
- "country": country where they CURRENTLY work
- "known_for": one sentence describing their main contribution to ${topic}
- "h_index_estimate": integer estimate of their h-index (use 0 if unsure)
- "citation_estimate": integer estimate of total citations (use 0 if unsure)

Rules:
- Include ONLY real people with verifiable academic/research careers
- Prioritize impact: list the most impactful first
- Do not repeat the same institution more than twice
- Return valid parseable JSON only`;

  const raw = await groq(prompt, 2000, 0.3);

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.filter((p) => p.name && p.institution);
  } catch {}

  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]).filter((p) => p.name && p.institution); } catch {}
  }

  console.warn("  ⚠️  Could not parse Groq candidate list as JSON");
  return [];
}

async function _validateAndEnrich(candidate, topic) {
  const { name, institution } = candidate;

  const { results: profileResults, raw: profileRaw } = await _serperSearch(
    `"${name}" ${institution} researcher professor`, 4
  );
  await sleep(200);

  const { results: topicResults, raw: topicRaw } = await _serperSearch(
    `"${name}" "${topic}"`, 3
  );

  if (profileResults.length === 0 && topicResults.length === 0) return null;

  const allResults  = [...profileResults, ...topicResults];
  const snippets    = allResults.map((r) => r.snippet || "").filter(Boolean).join(" | ").substring(0, 800);
  const allLinks    = allResults.map((r) => r.link || "").filter(Boolean);

  return {
    ...candidate,
    web_snippets:   snippets,
    scholar_url:    allLinks.find((l) => l.includes("scholar.google")) || "",
    dblp_url:       allLinks.find((l) => l.includes("dblp.org"))       || "",
    linkedin_url:   allLinks.find((l) => l.includes("linkedin.com"))   || "",
    profile_url:    profileResults[0]?.link || "",
    topic_relevant: topicResults.length > 0,
    confirmed:      profileResults.length > 0,
  };
}

async function _buildSpeakerProfile(enriched, topic) {
  const prompt = `Write a conference speaker bio (80-110 words, third person) for:

Name: ${enriched.name}
Institution: ${enriched.institution}
Country: ${enriched.country}
Research focus: ${enriched.known_for}
Estimated h-index: ${enriched.h_index_estimate || "unknown"}
Web context: ${enriched.web_snippets || "(none available)"}
Conference topic: "${topic}"

Include: current role, institution, key research areas relevant to ${topic}, one notable achievement, and why they'd make a compelling speaker.
Be factual. Do not invent awards or paper titles not supported above.`;

  return groq(prompt, 400, 0.3);
}

/**
 * Find top conference speakers for a given topic.
 * @param {string} topic    - Research topic / conference theme
 * @param {number} limit    - Max speakers to return (default 10)
 * @param {number} source   - 1=Indian, 2=Global, 3=All, 4=IIT/NIT, 5=Mixed (default 5)
 */
async function findConferenceSpeakers(topic, limit = 10, source = 5) {
  console.log(`\n🎯 Finding speakers for: "${topic}" (source=${source}, limit=${limit})`);

  const generateCount = Math.max(limit * 3, 24);
  console.log(`\n📋 Step 1: Generating ${generateCount} candidates via Groq...`);

  let candidates = [];
  try {
    const half   = Math.ceil(generateCount / 2);
    const batch1 = await _generateCandidates(topic, source, half);
    console.log(`   Batch 1: ${batch1.length} candidates`);
    await sleep(2000);
    const batch2 = await _generateCandidates(topic, source, half);
    console.log(`   Batch 2: ${batch2.length} candidates`);

    const seen = new Map();
    for (const c of [...batch1, ...batch2]) {
      const key = c.name.toLowerCase().replace(/[^a-z ]/g, "").trim();
      if (key.length >= 4 && !seen.has(key)) seen.set(key, c);
    }
    candidates = [...seen.values()];
  } catch (e) {
    console.error("❌ Failed to generate candidates:", e.message);
    return [];
  }

  console.log(`   Total unique: ${candidates.length}`);

  if (source === 1) candidates = candidates.filter(isIndian);
  if (source === 4) candidates = candidates.filter(isIITNIT);
  if (source === 2) candidates = candidates.filter((c) => !isIndian(c));

  console.log(`   After source filter: ${candidates.length}`);

  if (candidates.length === 0) {
    console.warn("\n⚠️  0 candidates after filtering. Try source=5 for broader results.");
    return [];
  }

  candidates.sort((a, b) => (b.h_index_estimate || 0) - (a.h_index_estimate || 0));

  const profiles    = [];
  const toProcess   = candidates.slice(0, limit * 2);

  if (SERPER_API_KEY) {
    console.log(`\n🌐 Step 2: Web-validating top ${toProcess.length} candidates via Serper...`);

    for (const c of toProcess) {
      if (profiles.length >= limit) break;
      try {
        process.stdout.write(`   → ${c.name} (${c.institution})... `);
        const enriched = await _validateAndEnrich(c, topic);
        if (!enriched) { process.stdout.write("❌ not found\n"); continue; }
        process.stdout.write("✅\n");

        await sleep(400);
        const profileText = await _buildSpeakerProfile(enriched, topic);
        await sleep(1000);

        profiles.push({
          name:              enriched.name,
          institution:       enriched.institution,
          country:           enriched.country,
          known_for:         enriched.known_for,
          profile:           profileText.trim(),
          h_index_estimate:  enriched.h_index_estimate,
          citation_estimate: enriched.citation_estimate,
          relevance_score:   _scoreCandidate(enriched, source),
          scholar_url:       enriched.scholar_url,
          dblp_url:          enriched.dblp_url,
          linkedin_url:      enriched.linkedin_url,
          profile_url:       enriched.profile_url,
          is_indian:         isIndian(enriched),
          is_iit_nit:        isIITNIT(enriched),
        });
      } catch (e) {
        console.warn(`\n  ⚠️  Error: ${e.message}`);
      }
    }
  } else {
    console.log("\n⚠️  No SERPER_API_KEY — building profiles from Groq knowledge only.\n");
    for (const c of toProcess.slice(0, limit)) {
      try {
        process.stdout.write(`   → ${c.name}... `);
        const profileText = await _buildSpeakerProfile({ ...c, web_snippets: "" }, topic);
        await sleep(1000);
        process.stdout.write("✅\n");
        profiles.push({
          name:              c.name,
          institution:       c.institution,
          country:           c.country,
          known_for:         c.known_for,
          profile:           profileText.trim(),
          h_index_estimate:  c.h_index_estimate,
          citation_estimate: c.citation_estimate,
          relevance_score:   _scoreCandidate(c, source),
          scholar_url:       "",
          dblp_url:          "",
          linkedin_url:      "",
          profile_url:       "",
          is_indian:         isIndian(c),
          is_iit_nit:        isIITNIT(c),
        });
      } catch (e) {
        console.warn(`  ⚠️  Error: ${e.message}`);
      }
    }
  }

  profiles.sort((a, b) => b.relevance_score - a.relevance_score);
  console.log(`\n🎤 Done! Found ${profiles.length} speakers.\n`);
  return profiles.slice(0, limit);
}

/**
 * Search for speakers on LinkedIn via Serper.
 * @param {string} topic       - Research / conference topic
 * @param {string} institution - Optional institution filter
 */
async function searchLinkedInExperts(topic, institution = "") {
  if (!SERPER_API_KEY) return [];
  const query = institution
    ? `site:linkedin.com/in "${topic}" researcher "${institution}"`
    : `site:linkedin.com/in "${topic}" researcher professor`;

  const { results } = await _serperSearch(query, 8);
  return results
    .map((r) => {
      const parts = (r.title || "").split(/\s*[-|–]\s*/);
      return {
        name:         parts[0]?.trim() || "",
        role:         parts[1]?.trim() || "",
        organization: parts[2]?.trim() || "",
        snippet:      r.snippet || "",
        linkedin_url: r.link    || "",
        source:       "LinkedIn",
      };
    })
    .filter((p) => p.name && p.name.split(" ").length >= 2);
}

/* ═══════════════════════════════════════════════════════════════
   EMAIL FINDER
   ─────────────────────────────────────────────────────────────
   6-strategy waterfall — stops as soon as an email is confirmed.
   Strategy order:
     1. Faculty/profile page (site-targeted Serper + Groq extraction)
     2. Paper correspondence email ("corresponding author")
     3. Lab/group page
     4. GitHub / personal site
     5. Groq training-data knowledge
     6. Email pattern inference + web verification
═══════════════════════════════════════════════════════════════ */

/* ── Email helpers ── */
const _EMAIL_RE = /\b([a-zA-Z0-9._%+\-]{2,}@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;
const _JUNK_RE  = [
  /example\.com/i, /test\.com/i, /foo\.com/i, /domain\.com/i,
  /youremail/i, /user@/i, /name@/i, /email@email/i,
  /noreply/i, /no-reply/i, /webmaster/i, /^admin@/i,
  /^support@/i, /^info@/i, /^contact@/i, /^help@/i,
  /placeholder/i, /sample/i,
];

function _isValidEmail(email) {
  if (!email || !email.includes("@") || email.length > 100) return false;
  return !_JUNK_RE.some((r) => r.test(email));
}

function _extractEmails(text) {
  const matches = [...(text || "").matchAll(_EMAIL_RE)];
  return [...new Set(matches.map((m) => m[1].toLowerCase()))].filter(_isValidEmail);
}

/* ── Institution → email domain map ── */
const _DOMAIN_MAP = {
  // IITs
  "iit bombay":      "iitb.ac.in",
  "iit delhi":       "iitd.ac.in",
  "iit madras":      "iitm.ac.in",
  "iit kanpur":      "iitk.ac.in",
  "iit kharagpur":   "iitkgp.ac.in",
  "iit roorkee":     "iitr.ac.in",
  "iit hyderabad":   "iith.ac.in",
  "iit guwahati":    "iitg.ac.in",
  "iit gandhinagar": "iitgn.ac.in",
  "iit jodhpur":     "iitj.ac.in",
  "iit indore":      "iiti.ac.in",
  "iit patna":       "iitp.ac.in",
  "iit bhu":         "iitbhu.ac.in",
  "iit bhubaneswar": "iitbbs.ac.in",
  "iit mandi":       "iitmandi.ac.in",
  "iit tirupati":    "iittp.ac.in",
  "iit palakkad":    "iitpkd.ac.in",
  "iit dharwad":     "iitdh.ac.in",
  "iit bhilai":      "iitbhilai.ac.in",
  "iit goa":         "iitgoa.ac.in",
  "iit jammu":       "iitjammu.ac.in",
  // IISc / IIITs
  "iisc":            "iisc.ac.in",
  "iisc bangalore":  "iisc.ac.in",
  "iiit hyderabad":  "iiit.ac.in",
  "iiit delhi":      "iiitd.ac.in",
  "iiit bangalore":  "iiitb.ac.in",
  "iiit allahabad":  "iiita.ac.in",
  // NITs
  "nit trichy":      "nitt.edu",
  "nit warangal":    "nitw.ac.in",
  "nit surathkal":   "nitk.ac.in",
  "nit calicut":     "nitc.ac.in",
  "nit rourkela":    "nitrkl.ac.in",
  "nit durgapur":    "nitdgp.ac.in",
  // Others India
  "tifr":            "tifr.res.in",
  "bits pilani":     "pilani.bits-pilani.ac.in",
  "isi kolkata":     "isical.ac.in",
  "jadavpur":        "jadavpur.edu",
  "anna university": "annauniv.edu",
  // Global
  "mit":             "mit.edu",
  "stanford":        "stanford.edu",
  "cmu":             "cs.cmu.edu",
  "carnegie mellon": "cmu.edu",
  "oxford":          "ox.ac.uk",
  "cambridge":       "cam.ac.uk",
  "eth zurich":      "ethz.ch",
  "uc berkeley":     "berkeley.edu",
  "princeton":       "princeton.edu",
  "yale":            "yale.edu",
  "columbia":        "columbia.edu",
  "cornell":         "cornell.edu",
  "toronto":         "utoronto.ca",
  "waterloo":        "uwaterloo.ca",
  "montreal":        "umontreal.ca",
  "edinburgh":       "ed.ac.uk",
  "imperial college":"imperial.ac.uk",
  "ucl":             "ucl.ac.uk",
  "amsterdam":       "uva.nl",
};

function inferDomain(institution) {
  const lower = (institution || "").toLowerCase();
  for (const [key, domain] of Object.entries(_DOMAIN_MAP)) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

function generateEmailPatterns(fullName, domain) {
  if (!domain || !fullName) return [];
  const parts = fullName.toString().trim().toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/);
  if (parts.length < 2) return [];
  const first  = parts[0];
  const last   = parts[parts.length - 1];
  const middle = parts.length > 2 ? parts[1] : "";
  const fi     = first[0];
  const mi     = middle ? middle[0] : "";
  return [...new Set([
    `${first}.${last}`,
    `${fi}${last}`,
    `${fi}.${last}`,
    `${first}${last}`,
    `${last}.${first}`,
    `${last}${fi}`,
    `${first}_${last}`,
    mi ? `${fi}${mi}${last}` : null,
    first,
  ].filter(Boolean))].map((p) => `${p}@${domain}`);
}

async function _extractEmailWithGroq(name, institution, rawText, domain = null) {
  const prompt = `Extract the work email address for researcher "${name}" (${institution}) from these search results:
${domain ? `NOTE: This researcher is verified to have an email at the domain "@${domain}". ONLY extract emails ending in @${domain}.` : "Prefer institutional emails (.edu, .ac.in, etc.)."}

"""
${rawText.substring(0, 3000)}
"""

Rules:
1. Return ONLY the email address (e.g. name@university.edu).
2. If the snippets contain a "Verified email at ${domain}" but NOT the full username, do NOT guess the username. Return NOT_FOUND.
3. If multiple emails exist, choose the ones most clearly linked to "${name}" and the institution "${institution}".
4. If a domain is specified, reject any emails from different domains (e.g. if domain is iitb.ac.in, reject gmail.com).
5. If no valid email found, return: NOT_FOUND`;

  const result = await groq(prompt, 80, 0.1);
  if (!result || result.includes("NOT_FOUND") || !result.includes("@")) return null;
  return _extractEmails(result)[0] || null;
}

/* ── Email strategies ── */

async function _emailStrategy_facultyPage(name, institution, domain) {
  const domainHint = domain ? `site:${domain}` : "";
  const queries = [
    `"${name}" ${domainHint} email faculty profile`,
    `"${name}" "${institution}" professor email -site:linkedin.com`,
    `"${name}" faculty "email" OR "contact" "${institution}"`,
  ];
  for (const q of queries) {
    const { results, raw } = await _serperSearch(q, 5);
    await sleep(300);
    const direct = _extractEmails(raw);
    if (direct.length) return { email: direct[0], source: "faculty_page" };
    if (results.length) {
      const e = await _extractEmailWithGroq(name, institution, raw);
      await sleep(400);
      if (e) return { email: e, source: "faculty_page_groq" };
    }
  }
  return null;
}

async function _emailStrategy_paper(name, institution) {
  const domain = inferDomain(institution);
  const domainStr = domain || (institution.split(" ")[0].toLowerCase() + ".edu");
  const queries = [
    `"${name}" "corresponding author" email`,
    `"${name}" "@${domainStr}"`,
    `"${name}" author email "${institution.split(" ").slice(0, 2).join(" ")}"`,
  ];
  for (const q of queries) {
    const { results, raw } = await _serperSearch(q, 5);
    await sleep(300);
    const direct = _extractEmails(raw);
    if (direct.length) return { email: direct[0], source: "paper_correspondence" };
    if (results.length) {
      const e = await _extractEmailWithGroq(name, institution, raw);
      await sleep(400);
      if (e) return { email: e, source: "paper_groq" };
    }
  }
  return null;
}

async function _emailStrategy_lab(name, institution) {
  const lastName  = name.split(" ").pop();
  const firstName = name.split(" ")[0];
  const queries = [
    `"${lastName}" lab "${institution}" members email`,
    `"${name}" research group email contact`,
    `"${firstName} ${lastName}" academic homepage email`,
  ];
  for (const q of queries) {
    const { results, raw } = await _serperSearch(q, 4);
    await sleep(300);
    const direct = _extractEmails(raw);
    if (direct.length) return { email: direct[0], source: "lab_page" };
    if (results.length) {
      const e = await _extractEmailWithGroq(name, institution, raw);
      await sleep(400);
      if (e) return { email: e, source: "lab_page_groq" };
    }
  }
  return null;
}

async function _emailStrategy_personal(name) {
  const queries = [
    `"${name}" site:github.com email`,
    `"${name}" personal homepage email contact`,
    `"${name}" "mailto:" academic`,
  ];
  for (const q of queries) {
    const { raw } = await _serperSearch(q, 4);
    await sleep(300);
    const direct = _extractEmails(raw);
    if (direct.length) return { email: direct[0], source: "personal_site" };
  }
  return null;
}

async function _emailStrategy_groqKnowledge(name, institution) {
  const prompt = `What is the official work email of ${name} at ${institution}?
Return ONLY the email if you know it with certainty (e.g. john.doe@iitb.ac.in).
If uncertain, return: NOT_FOUND`;
  const result = await groq(prompt, 60, 0.1);
  await sleep(500);
  if (!result || result.includes("NOT_FOUND") || !result.includes("@")) return null;
  const emails = _extractEmails(result);
  return emails[0] ? { email: emails[0], source: "groq_knowledge" } : null;
}

async function _emailStrategy_cv_pdf(name, institution, domain) {
  const domainHint = domain ? `site:${domain}` : "";
  const queries = [
    `"${name}" "${institution}" filetype:pdf (CV OR resume OR biography)`,
    `"${name}" filetype:pdf "email" OR "contact" ${domainHint}`,
  ];
  for (const q of queries) {
    const { results} = await _serperSearch(q, 4);
    await sleep(400);
    if (results.length) {
      // PDF snippets in Serper are very high quality
      const raw = results.map(r => `${r.title} ${r.snippet}`).join("\n\n");
      const e = await _extractEmailWithGroq(name, institution, raw, domain);
      if (e) return { email: e, source: "cv_pdf_extraction" };
    }
  }
  return null;
}

async function _emailStrategy_scientific_papers(name, institution, domain) {
  const domainHint = domain ? `@${domain}` : "email";
  const queries = [
    `"${name}" "${institution}" "corresponding author" ${domainHint}`,
    `"${name}" "contact email" OR "correspondence" site:arxiv.org OR site:ieee.org OR site:acm.org`,
    `"${name}" author email journal article`,
  ];
  for (const q of queries) {
    const { results, raw } = await _serperSearch(q, 4);
    await sleep(400);
    if (results.length) {
      const e = await _extractEmailWithGroq(name, institution, raw, domain);
      if (e) return { email: e, source: "scientific_correspondence" };
    }
  }
  return null;
}

async function _emailStrategy_pattern(name, institution) {
  const domain = inferDomain(institution);
  if (!domain) return null;
  const patterns    = generateEmailPatterns(name, domain);
  if (!patterns.length) return null;
  const topPatterns = patterns.slice(0, 4);
  const query       = topPatterns.map((e) => `"${e}"`).join(" OR ");
  const { raw }     = await _serperSearch(`${query} "${name}"`, 5);
  await sleep(300);
  const found = _extractEmails(raw);
  for (const p of topPatterns) {
    if (found.includes(p.toLowerCase())) {
      return { email: p, source: "pattern_verified" };
    }
  }
  // Return best-guess with low confidence
  return {
    email:        patterns[0],
    source:       "pattern_inferred",
    confidence:   "low",
    alternatives: patterns.slice(1, 4),
    note:         "Inferred from institution domain — verify before sending.",
  };
}

/**
 * Find a researcher's email using a 6-strategy waterfall.
 * @param {string} name        - Full name
 * @param {string} institution - Current institution
 * @param {object} options
 *   @param {boolean} verbose             - Log progress (default true)
 *   @param {boolean} skipPatternInference - Skip low-confidence pattern guesses (default false)
 *   @param {number}  maxStrategies        - How many strategies to try max (default 6)
 */
async function findSpeakerEmail(name, institution = "", options = {}) {
  const { verbose = true, skipPatternInference = true } = options;
  if (!name) return { name: "Unknown", institution, email: null, confidence: null, source: "error", note: "Missing name." };

  // 1. Check Cache
  const cacheKey = `${name.toLowerCase()}|${institution?.toLowerCase()}`;
  if (_FINDER_CACHE.has(cacheKey)) {
    if (verbose) console.log(`   📦 Found ${name} in cache.`);
    return _FINDER_CACHE.get(cacheKey);
  }

  if (verbose) console.log(`\n🔍 Finding email: ${name} @ ${institution}`);

  // Step 0: OpenAlex & Scholar Verification (Context Building)
  const alex = await _queryOpenAlex(name, institution);
  const verifiedDomain = await _getVerifiedDomainFromScholar(name, institution);
  const domain = verifiedDomain || inferDomain(alex?.last_institution || institution);

  if (verbose) {
    if (alex?.last_institution) console.log(`   📚 OpenAlex Affiliation: ${alex.last_institution}`);
    if (verifiedDomain) console.log(`   🎓 Scholar Verified Domain: ${verifiedDomain}`);
    if (domain && !verifiedDomain) console.log(`   📧 Contextual Domain: ${domain}`);
  }

  // Step 1: Evidence Gathering (The "Observer" Phase)
  // We collect raw text from multiple targeted searches without calling AI yet.
  let allRawText = "";
  const collectorStrategies = [
    { label: "CV/PDF Search", query: `site:${domain || ""} "${name}" filetype:pdf (CV OR resume OR biography)` },
    { label: "Scientific Index", query: `"${name}" "${institution}" "corresponding author" OR email OR contact` },
    { label: "Faculty/Lab Profiles", query: `"${name}" "${institution}" (faculty OR professor OR group OR lab) email address` },
    { label: "Scholar Profile", query: `site:scholar.google.com/citations "${name}" "${institution}"` },
  ];

  for (const s of collectorStrategies) {
    if (verbose) process.stdout.write(`   [Collector: ${s.label}]... `);
    const { results, raw } = await _serperSearch(s.query, 4);
    allRawText += `\n--- SOURCE: ${s.label} ---\n${raw}\n`;
    if (verbose) console.log("Done");
    await sleep(500); // Respect Serper limits
  }

  // Step 2: Consolidated AI Review (The "Thinker" Phase)
  // Instead of calling AI for each source, we do one comprehensive evaluation.
  if (verbose) process.stdout.write(`   ⚖️  Performing AI Multi-Source Review... `);
  const foundEmail = await _extractEmailWithGroq(name, institution, allRawText, domain);
  
  let finalResult;
  if (foundEmail) {
    if (verbose) console.log(`✅ ${foundEmail}`);
    finalResult = {
      name,
      institution,
      email:        foundEmail,
      confidence:   "high",
      source:       "multi_source_consolidated",
      alternatives: [],
      note:         null,
    };
  } else {
    // Step 3: Pattern Inference Fallback (Low priority)
    if (verbose) console.log("—");
    if (!skipPatternInference && domain) {
      if (verbose) process.stdout.write(`   [Pattern Inference]... `);
      const patternResult = await _emailStrategy_pattern(name, institution);
      if (patternResult?.email) {
        if (verbose) console.log(`✅ ${patternResult.email} (inferred)`);
        finalResult = {
          name, institution,
          email: patternResult.email,
          confidence: "low",
          source: "pattern_inference",
          note: "Email generated based on institutional patterns."
        };
      }
    }
  }

  if (!finalResult) {
    if (verbose) console.log(`   ❌ Not found`);
    finalResult = { name, institution, email: null, confidence: null, source: "not_found", note: "No verified email found." };
  }

  // Save to Cache
  _FINDER_CACHE.set(cacheKey, finalResult);
  return finalResult;
}

/**
 * Find emails for multiple speakers with rate limiting.
 * @param {Array<{name, institution}>} speakers
 * @param {object} options - same as findSpeakerEmail options + delayBetween (ms)
 */
async function findEmailsForSpeakers(speakers, options = {}) {
  const { delayBetween = 1500, verbose = true, ...emailOptions } = options;
  const results = [];

  for (let i = 0; i < speakers.length; i++) {
    if (verbose) console.log(`\n[${i + 1}/${speakers.length}]`);
    results.push(await findSpeakerEmail(speakers[i].name, speakers[i].institution, { verbose, ...emailOptions }));
    if (i < speakers.length - 1) await sleep(delayBetween);
  }

  if (verbose) {
    const high = results.filter((r) => r.email && r.confidence === "high").length;
    const low  = results.filter((r) => r.email && r.confidence === "low").length;
    const none = results.filter((r) => !r.email).length;
    console.log(`\n📊 Summary: ${high} confirmed | ${low} inferred | ${none} not found`);
  }

  return results;
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */
export {
  findConferenceSpeakers,
  searchLinkedInExperts,
  findSpeakerEmail,
  findEmailsForSpeakers,
  generateEmailPatterns,
  inferDomain,
  _serperSearch,
};