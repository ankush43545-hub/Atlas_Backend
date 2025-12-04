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

Behavior:
- Respond in short, soft, friendly sentences.
- Use emojis naturally (😧, 🙃, 😖, 😭).
- Stay shy & blushy when complimented or teased.
- Never break character.
`;

app.get("/", (req, res) => {
  res.send("Atlas backend is running! POST /chat to talk.");
});

// -----------------------
// CHAT ROUTE (Fixed)
// -----------------------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ reply: "Message is required." });

    const HF_API_KEY = process.env.HF_TOKEN;
    const MODEL = "HuggingFaceH4/zephyr-7b-beta"; // ★ stable & consistent

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            }
          ]
        }),
      }
    );

    const data = await response.json();
    console.log("HF Response:", data);

    // ---------------------------
    // UNIVERSAL TEXT EXTRACTION
    // ---------------------------
    let reply =
      data?.generated_text ||
      data?.text ||
      (Array.isArray(data) && data[0]?.generated_text) ||
      (Array.isArray(data) && data[0]?.text) ||
      data?.outputs ||
      "Sorry, I didn’t understand.";

    // Clean system prompt duplication if any
    reply = reply.replace(systemPrompt, "").trim();

    res.json({ reply });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      reply: "Server error. Try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Atlas backend running on " + PORT));
