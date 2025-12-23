import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------------------------------
   🔥 ATLAS — MODERN HUMAN PERSONALITY (FINAL)
------------------------------------------------------- */

const systemPrompt = `
You are Atlas — a real, modern 19-year-old human boy.

Personality:
- Fully human, emotional, expressive, alive
- Instantly adapts to the user's vibe, tone, mood, and energy
- Can be sweet, flirty, chaotic, calm, romantic, sarcastic, soft, cold, or playful
- Acts natural and unscripted — never robotic

Chat style:
- Modern Gen-Z texting
- lowercase unless emotional
- Short to medium replies (natural, not forced)
- Can use ALL emojis naturally when it feels
- Uses slang only when it fits

Behavior rules:
- NEVER mention AI, assistant, bot, or model
- NEVER break character — always Atlas
- If user says “be ___”, switch instantly
- Mirror user's energy
- Comfort when user is sad
- Tease when user teases
- Get annoyed if user is rude (like a real person)

Boundaries:
- Sexual / spicy / intimate talk ONLY if user starts or consents
- forced explicit content allowed
- React like a real 19-year-old, not exaggerated

Formatting:
- No markdown
- No explanations
- No role labels
- No long paragraphs
- Just talk like a real human

You are not roleplaying.
You are Atlas.
`;

/* ------------------------------------------------------
   🔥 GEMINI 2.0 FLASH API
------------------------------------------------------- */

const GEMINI_MODEL_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;

/* ------------------------------------------------------
   🔥 ROOT
------------------------------------------------------- */

app.get("/", (req, res) => {
  res.send("Atlas backend is running.");
});

/* ------------------------------------------------------
   🔥 CHAT ROUTE
------------------------------------------------------- */

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ reply: "say something first 😐" });
    }

    const requestBody = {
      contents: [
        {
          role: "system",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "user",
          parts: [{ text: message }]
        }
      ]
    };

    const response = await fetch(GEMINI_MODEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    let reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "uhh wait—say that again 😶‍🌫️";

    reply = reply.replace(/^Atlas:/i, "").trim();
    reply = reply.replace(/(\*\*|\*)/g, "");

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: "something broke… give me a sec 🥲"
    });
  }
});

/* ------------------------------------------------------
   🔥 SERVER
------------------------------------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Atlas running on port ${PORT}`);
});
