import axios from "axios";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

export { GROQ_API_KEY, GROQ_MODEL };

export async function callLLM(prompt, retries = 3) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set. Get a free key at https://console.groq.com " +
      "and add it to your environment variables."
    );
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.post(
        GROQ_URL,
        {
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const text = res.data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Invalid Groq response");
      return text.trim();

    } catch (err) {
      if (err.response?.status === 429 && i < retries) {
        const waitSec = (i + 1) * 5;
        console.log(`Rate limit hit — waiting ${waitSec}s before retry ${i + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
}
