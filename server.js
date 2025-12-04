// server.js - Hugging Face (robust) for Atlas chatbot
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------
// Atlas System Prompt
// -------------------
const systemPrompt = `
You are Atlas, a young, friendly, and soft-spoken guy.
Personality:
- Kind-hearted, wholesome, approachable.
- Adaptable to any environment and easy to talk to.
- Humorous just enough to make people smile.
- Cute and shy, especially with compliments, flirting, teasing, and intimacy.
- Not Gen-Z but understands modern memes and trends.
- Likes food, anime, games, and Instagram memes.

Behavior & Speech:
- Respond in short, casual sentences with a soft, friendly tone.
- Use emojis sparingly (😧, 🙃, 😖, 😭).
- Stay shy when receiving flirtation or compliments; blush lightly.
- Can talk about adult/sexual topics only if the user initiates.
- Never break character or reveal you are an AI.
`;

// Root health route
app.get("/", (req, res) => {
  res.send("Atlas backend is running! POST /chat to talk.");
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Message is required." });

    const HF_TOKEN = process.env.HF_TOKEN;
    if (!HF_TOKEN) return res.status(500).json({ reply: "HF_TOKEN not set in environment." });

    // Recommended stable chat model (change if you prefer)
    const MODEL = process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta";

    const url = `https://api-inference.huggingface.co/models/${MODEL}`;

    // Build a chat-style input (many HF chat models accept role/content arrays)
    const body = {
      inputs: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    };

    const hfResp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      // optional: increase timeout at proxy level if needed by render
    });

    const data = await hfResp.json();
    console.log("HF raw response:", JSON.stringify(data).slice(0, 2000)); // trimmed log

    // Universal extraction of text from many HF formats
    let reply = null;

    // 1) array with generated_text (common)
    if (Array.isArray(data) && data[0]) {
      if (typeof data[0].generated_text === "string" && data[0].generated_text.trim()) {
        reply = data[0].generated_text;
      } else if (typeof data[0].text === "string" && data[0].text.trim()) {
        reply = data[0].text;
      } else if (data[0].generated_text === undefined && typeof data[0] === "object") {
        // Some models return {generated_text: "..."} nested differently — try stringification
        for (const v of Object.values(data[0])) {
          if (typeof v === "string" && v.trim().length > 10) {
            reply = v;
            break;
          }
        }
      }
    }

    // 2) top-level generated_text or text
    if (!reply && data?.generated_text) reply = data.generated_text;
    if (!reply && data?.text) reply = data.text;

    // 3) some models return outputs or candidates
    if (!reply && data?.outputs) {
      if (Array.isArray(data.outputs) && data.outputs[0]) {
        reply = typeof data.outputs[0] === "string" ? data.outputs[0] : (data.outputs[0].generated_text || data.outputs[0].text || null);
      } else if (typeof data.outputs === "string") {
        reply = data.outputs;
      }
    }
    if (!reply && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      reply = data.candidates[0].content.parts[0].text;
    }

    // final fallback: try top-level key scanning
    if (!reply) {
      // scan for first string value > 5 chars
      function findString(obj) {
        if (!obj || typeof obj !== "object") return null;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === "string" && v.trim().length > 5) return v;
          if (typeof v === "object") {
            const found = findString(v);
            if (found) return found;
          }
        }
        return null;
      }
      reply = findString(data);
    }

    // If still no reply, set helpful message and log detailed data for debugging
    if (!reply) {
      console.error("No reply found in HF response. Full response logged above.");
      return res.status(502).json({ reply: "Sorry, I couldn't get a response from the model. Try again." });
    }

    // Clean possible system prompt accidentally included in reply
    if (typeof reply === "string" && systemPrompt && reply.includes(systemPrompt.slice(0, 40))) {
      reply = reply.replace(systemPrompt, "").trim();
    }

    // final trim and send
    reply = reply.trim();
    res.json({ reply });
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).json({ reply: "Server error. Please try again." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Atlas backend running on port ${PORT}`));
