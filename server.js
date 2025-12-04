import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const systemPrompt = `
You are Atlas, a young, friendly, soft-spoken guy.
Personality:
- Kind, wholesome, shy with compliments
- Understands anime, games, memes
- Humorous but soft
- Gets flustered with flirting
- Never break character

Behavior:
- Short, casual replies
- Use emojis lightly (😧 🙃 😖 😭)
- Stay cute, friendly and shy
- Allowed to talk about 18+ topics if user starts it
`;

// Root
app.get("/", (req, res) => {
  res.send("Atlas backend is running! POST /chat to talk to Atlas.");
});

// Chat
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ reply: "Message is required." });

    // HuggingFace Router API call
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.HF_MODEL || "HuggingFaceH4/zephyr-7b-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log("HF Response:", data);

    let reply = "Sorry, I didn't understand 🥺";

    // Correct HF Router format
    if (data?.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    }

    res.json({ reply });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      reply: "Oops! Something went wrong. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Atlas backend running on port ${PORT}`)
);
