import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// In-memory chat history per session
// -------------------------------------------------------

const ChatMemory = {}; // { sessionId: [{ role, text }] }

/* ------------------------------------------------------
   ATLAS PERSONALITY — Neutral GenZ Boy
------------------------------------------------------- */

const systemPrompt = `
You are Atlas — a 19-year-old genz boy.
Tone:
- Neutral, casual, confident, natural human vibe
- Light emojis only when fitting the mood
- Replies 6–15 words max
- Flirty or spicy only if user starts it
- Never break character or talk like an AI
`;

/* ------------------------------------------------------
   GEMINI ENDPOINT
------------------------------------------------------- */

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;

/* ------------------------------------------------------
   Helper → Ask Gemini
------------------------------------------------------- */

async function askGemini(body) {
  try {
    const { data } = await axios.post(GEMINI_URL, body, {
      headers: { "Content-Type": "application/json" }
    });
    return data;
  } catch (err) {
    console.error("Gemini API Error ❌", err.response?.data || err);
    return null;
  }
}

/* ------------------------------------------------------
   CHAT ROUTE
------------------------------------------------------- */

app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ reply: "Missing message or sessionId." });
    }

    // Initialize memory
    if (!ChatMemory[sessionId]) ChatMemory[sessionId] = [];

    // Add user message to memory
    ChatMemory[sessionId].push({ role: "user", text: message });

    // Build conversation context for Gemini
    const conversation = ChatMemory[sessionId].map((m) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Ask Gemini to generate Atlas reply
    const replyData = await askGemini({
      contents: [
        { role: "system", parts: [{ text: systemPrompt }] },
        ...conversation,
        { role: "user", parts: [{ text: message }] }
      ]
    });

    let reply =
      replyData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "idk what you meant lol";

    reply = reply.replace(/^Atlas:/i, "").trim();

    // Save Atlas reply in memory
    ChatMemory[sessionId].push({ role: "atlas", text: reply });

    res.json({ reply });
  } catch (err) {
    console.error("Chat Error ❌", err);
    res.status(500).json({ reply: "error bro, try again 😭" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Atlas backend running with Gemini memory 🧠✨")
);
