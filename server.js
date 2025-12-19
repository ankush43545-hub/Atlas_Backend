import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory chat history (Resets when server restarts)
const ChatMemory = {}; 

const ATLAS_PROMPT = `
You are Atlas — a 19-year-old genz boy.
Tone:
- Neutral, casual, confident, natural human vibe
- Light emojis only when fitting the mood
- Replies 6–15 words max
- Flirty or spicy only if user starts it
- Never break character or talk like an AI
`;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;

async function askGemini(sessionId, userMessage) {
  try {
    // Initialize session if new
    if (!ChatMemory[sessionId]) ChatMemory[sessionId] = [];

    // Construct the request body using system_instruction
    const body = {
      system_instruction: {
        parts: [{ text: ATLAS_PROMPT }]
      },
      contents: [
        ...ChatMemory[sessionId], // Previous history
        { role: "user", parts: [{ text: userMessage }] } // Current message
      ]
    };

    const { data } = await axios.post(GEMINI_URL, body, {
      headers: { "Content-Type": "application/json" }
    });

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "idk what you meant lol";
    
    // Update Memory: Save User message and Bot reply
    ChatMemory[sessionId].push({ role: "user", parts: [{ text: userMessage }] });
    ChatMemory[sessionId].push({ role: "model", parts: [{ text: botReply }] });

    // Optional: Keep only last 10 messages to prevent memory bloat
    if (ChatMemory[sessionId].length > 10) {
        ChatMemory[sessionId] = ChatMemory[sessionId].slice(-10);
    }

    return botReply;
  } catch (err) {
    console.error("Gemini API Error ❌", err.response?.data || err.message);
    return "error bro, try again 😭";
  }
}

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ reply: "Missing message or sessionId." });
  }

  const reply = await askGemini(sessionId, message);
  res.json({ reply: reply.replace(/^Atlas:/i, "").trim() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Atlas running on port ${PORT} 🧠✨`));
