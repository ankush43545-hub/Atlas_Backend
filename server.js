import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// MongoDB Connection
// -------------------------------------------------------

const client = new MongoClient(process.env.MONGO_URI);
let memoryCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("atlas_ai");
    memoryCollection = db.collection("memories");
    console.log("MongoDB connected ✔");
  } catch (err) {
    console.error("MongoDB error ❌", err);
  }
}
connectDB();

// -------------------------------------------------------
// In-memory short-term memory
// -------------------------------------------------------

const STMemory = {}; // { sessionId: { chat: [], emotion: "" } }

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
- Never break character, never talk like an AI
- Adapt fully to user's emotional state
`;

/* ------------------------------------------------------
   Emotion Analyzer
------------------------------------------------------- */

const emotionPrompt = `
Analyze the user's message and pick ONE emotion:

happy
excited
sad
angry
flirty
horny
anxious
lonely
romantic
neutral

Only return the single word.
`;

/* ------------------------------------------------------
   GEMINI URL
------------------------------------------------------- */

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;

/* ------------------------------------------------------
   Helper: Ask Gemini
------------------------------------------------------- */

async function askGemini(body) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await response.json();
}

/* ------------------------------------------------------
   Fetch Long-Term Memory from MongoDB
------------------------------------------------------- */

async function loadLongTermMemory(sessionId) {
  return await memoryCollection.findOne({ sessionId }) || {
    sessionId,
    facts: [],
    preferences: {},
    emotionalPattern: "neutral"
  };
}

/* ------------------------------------------------------
   Save Long-Term Memory
------------------------------------------------------- */

async function saveLongTermMemory(sessionId, memory) {
  await memoryCollection.updateOne(
    { sessionId },
    { $set: memory },
    { upsert: true }
  );
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

    // -------------------------------
    // Load long term memory
    // -------------------------------
    const LTMemory = await loadLongTermMemory(sessionId);

    // -------------------------------
    // Initialize short term memory
    // -------------------------------
    if (!STMemory[sessionId]) {
      STMemory[sessionId] = { chat: [], emotion: "neutral" };
    }

    // -------------------------------
    // Emotion Detection
    // -------------------------------

    const emotionData = await askGemini({
      contents: [
        { role: "system", parts: [{ text: emotionPrompt }] },
        { role: "user", parts: [{ text: message }] }
      ]
    });

    let emotion =
      emotionData?.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim()
        ?.toLowerCase() || "neutral";

    const validEmotions = [
      "happy",
      "excited",
      "sad",
      "angry",
      "flirty",
      "horny",
      "anxious",
      "lonely",
      "romantic",
      "neutral"
    ];

    if (!validEmotions.includes(emotion)) emotion = "neutral";

    // Save emotion in ST + LT memory
    STMemory[sessionId].emotion = emotion;
    LTMemory.emotionalPattern = emotion;

    // -------------------------------
    // Save important user statements  
    // (auto facts extraction)
    // -------------------------------

    if (message.length > 6) {
      LTMemory.facts.push(message);
      if (LTMemory.facts.length > 30)
        LTMemory.facts.splice(0, LTMemory.facts.length - 30);
    }

    // Save long-term memory
    await saveLongTermMemory(sessionId, LTMemory);

    // -------------------------------
    // Build Chat Context (ST history)
    // -------------------------------

    STMemory[sessionId].chat.push({ role: "user", text: message });

    if (STMemory[sessionId].chat.length > 25) {
      STMemory[sessionId].chat.splice(
        0,
        STMemory[sessionId].chat.length - 25
      );
    }

    const emotionContext = `
User's detected emotion: ${emotion}.
User emotional pattern: ${LTMemory.emotionalPattern}.

Adjust tone accordingly.
Important memories to consider: ${LTMemory.facts.join(", ")}
`;

    const historyParts = STMemory[sessionId].chat.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    // -------------------------------
    // Ask Gemini: Atlas Response
    // -------------------------------

    const replyData = await askGemini({
      contents: [
        { role: "system", parts: [{ text: systemPrompt }] },
        { role: "system", parts: [{ text: emotionContext }] },
        ...historyParts,
        { role: "user", parts: [{ text: message }] }
      ]
    });

    let reply =
      replyData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "idk what you meant lol";

    reply = reply.replace(/^Atlas:/i, "").trim();

    STMemory[sessionId].chat.push({ role: "atlas", text: reply });

    res.json({
      reply,
      emotionDetected: emotion
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "error bro, try again 😭" });
  }
});

app.listen(3000, () =>
  console.log("Atlas backend with MongoDB memory running 🧠✨")
);
