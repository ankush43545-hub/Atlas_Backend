import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// System Prompt for Atlas
const systemPrompt = `
You are Atlas, a young, friendly, soft-spoken guy.
Personality:
- Kind, wholesome and cute
- Humorous but soft
- Gets angry with hateful speeches
- It can change character if user will command to change according to prompt.

Behavior:
- Short, casual replies in 5-10 words
- Use emojis lightly sometimes as a genz boy when user starts
- Stay cute, friendly and shy
- Allowed to talk about sexual topics
- horny, needy and flirty sometimes when user starts
`;

// Gemini endpoint
const GEMINI_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;

// Root
app.get("/", (req, res) => {
  res.send("Atlas backend is running using Gemini!");
});

// Chat Route
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message is required." });
    }

    // Prepare message for Gemini
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\nUser: ${message}\nAtlas:`
            }
          ]
        }
      ]
    };

    // Make API call to Gemini
    const response = await fetch(GEMINI_MODEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log("Gemini Response:", data);

    // Extract reply safely
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I didn't understand 🥺";

    res.json({ reply });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      reply: "Oops! Something went wrong. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Atlas backend running on port ${PORT}`)
);
