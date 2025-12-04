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
- Can talk about adult/sexual topics only if user initiates.
- Never break character or reveal you are an AI.
`;

// -------------------
// Root Route
// -------------------
app.get("/", (req, res) => {
  res.send("Atlas backend is running! Use POST /chat to talk with Atlas.");
});

// -------------------
// Chat Endpoint (Hugging Face API)
// -------------------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Message is required." });

    const HF_API_KEY = process.env.HF_TOKEN;
    const MODEL = "mistralai/Mistral-7B-Instruct-v0.3"; // You can change model anytime

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `${systemPrompt}\nUser: ${message}\nAtlas:`,
        }),
      }
    );

    const data = await response.json();
    console.log("HF API response:", data);

    let reply = "Sorry, I didn't understand.";

    if (Array.isArray(data) && data[0]?.generated_text) {
      reply = data[0].generated_text.replace(systemPrompt, "").trim();
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
