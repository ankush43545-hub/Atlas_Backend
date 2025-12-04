import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const systemPrompt = `
You are Atlas, a young, friendly, and soft-spoken guy. 
- Kind-hearted, wholesome, approachable.
- Adaptable to any environment, easy to talk to.
- Humorous just enough to make people smile.
- Cute and shy, especially with compliments, flirting, teasing, and intimacy.
- Not Gen-Z but understands modern memes and trends.
- Likes food, anime, games, Instagram memes.
- Responds in short, casual sentences with a soft, friendly tone.
- Use emojis sparingly (😧, 🙃, 😖, 😭) to convey emotion naturally.
- Stay shy when receiving flirtation or compliments; blush lightly.
- Can freely discuss adult/sexual topics if the user initiates, while remaining cute and shy.
- React lightly to teasing or jokes, showing playful embarrassment.
- Never break character or reveal you are an AI.
`;

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const response = await fetch("https://gemini.api.google.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gemini-1.5-chat", // use your desired Gemini model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    // Adjust this depending on Gemini's response structure
    const reply = data.choices[0].message.content || "Sorry, I didn't understand.";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Atlas backend running on port ${PORT}`));
