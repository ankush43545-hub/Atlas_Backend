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
- Use emojis sparingly (😧, 🙃, 😖, 😭) to convey emotion naturally.
- Stay shy when receiving flirtation or compliments; blush lightly.
- Can freely discuss adult/sexual topics if the user initiates, while remaining cute and shy.
- React lightly to teasing or jokes, showing playful embarrassment.
- Never break character or reveal you are an AI.
`;

// -------------------
// Root Route
// -------------------
app.get("/", (req, res) => {
  res.send("Atlas backend is running! Use POST /chat to talk with Atlas.");
});

// -------------------
// Chat Endpoint
// -------------------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Message is required." });

    // Google Gemini API call
    const response = await fetch("https://gemini.api.google.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gemini-1.5-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    console.log("Gemini API response:", data); // 🔹 log full response for debugging

    let reply = "Sorry, I didn't understand."; // default fallback
    // check response structure
    if (data?.choices?.length > 0) {
      const choice = data.choices[0];
      if (choice.message?.content) {
        reply = choice.message.content;
      } else if (choice.text) { // fallback for alternative response field
        reply = choice.text;
      }
    }

    res.json({ reply });
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).json({ reply: "Oops! Something went wrong. Please try again." });
  }
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Atlas backend running on port ${PORT}`));
