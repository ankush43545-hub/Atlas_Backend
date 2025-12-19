import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ChatMemory = {}; 

const ATLAS_PROMPT = "You are Atlas — a 19-year-old genz boy. Tone: Neutral, casual, confident. Max 15 words.";

// --- NEW: Health Check Route ---
// Visit https://atlas-backend-roi5.onrender.com/ in your browser to see this
app.get("/", (req, res) => {
  res.send("Atlas Backend is Online! 🚀");
});

async function askGemini(sessionId, userMessage) {
  try {
    if (!ChatMemory[sessionId]) ChatMemory[sessionId] = [];

    // The correct structure for Gemini 2.0
    const body = {
      system_instruction: {
        parts: [{ text: ATLAS_PROMPT }]
      },
      contents: [
        ...ChatMemory[sessionId], 
        { role: "user", parts: [{ text: userMessage }] }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;
    
    const { data } = await axios.post(url, body);

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "idk what you meant lol";
    
    // Update Memory
    ChatMemory[sessionId].push({ role: "user", parts: [{ text: userMessage }] });
    ChatMemory[sessionId].push({ role: "model", parts: [{ text: botReply }] });

    return botReply;
  } catch (err) {
    // This logs the ACTUAL error to your Render dashboard
    console.error("Gemini Error:", err.response?.data || err.message);
    return "error bro, try again 😭";
  }
}

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) return res.status(400).json({ reply: "Missing info" });

  const reply = await askGemini(sessionId, message);
  res.json({ reply: reply.trim() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Running on port ${PORT}`));
