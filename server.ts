import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));

// Lazy initialize Gemini client
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Regex Explainer endpoint
app.post("/api/ai/explain-regex", async (req, res) => {
  try {
    const { regex, flags = "", testString = "" } = req.body;
    if (!regex) {
      return res.status(400).json({ error: "Regex pattern is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to secrets in Settings.",
      });
    }

    const prompt = `You are an expert software engineer and regex specialist. 
Provide a clear, educational, and structured breakdown of this regular expression:
Pattern: /${regex}/${flags}
${testString ? `Example text provided by user: "${testString}"` : ""}

Return a structured JSON with:
{
  "summary": "Brief 1-2 sentence overview of what this pattern does",
  "tokens": [
    { "part": "exact regex substring", "explanation": "what this token does" }
  ],
  "captureGroups": [
    { "group": "Group 1 or named group", "pattern": "subpattern", "purpose": "what it captures" }
  ],
  "potentialPitfalls": [
    "Edge cases, performance concerns like catastrophic backtracking, or unexpected matches"
  ],
  "suggestedOptimizations": [
    "Any recommended improvements or modern syntax alternatives"
  ]
}
Ensure the response is valid pure JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json({ success: true, data: output });
  } catch (error: any) {
    console.error("Error in explain-regex:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate regex explanation",
    });
  }
});

// AI Natural Language to Regex / Cron generator
app.post("/api/ai/generate-utility", async (req, res) => {
  try {
    const { type, query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query prompt is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to secrets.",
      });
    }

    let prompt = "";
    if (type === "cron") {
      prompt = `Generate a standard 5-part cron expression for this request: "${query}".
Return a JSON object with:
{
  "cron": "* * * * *",
  "humanDescription": "Clear plain English description of the schedule",
  "explanation": "Explanation of minute, hour, day-of-month, month, day-of-week fields",
  "sampleNextRuns": ["ISO or human timestamps"]
}
Strictly return valid JSON.`;
    } else if (type === "regex") {
      prompt = `Generate a precise regular expression for this request: "${query}".
Return a JSON object with:
{
  "regex": "the pattern without delimiters",
  "flags": "e.g. g or i",
  "explanation": "Clear explanation of how the pattern works",
  "testCases": {
    "shouldMatch": ["string1", "string2"],
    "shouldNotMatch": ["string3", "string4"]
  }
}
Strictly return valid JSON.`;
    } else {
      return res.status(400).json({ error: "Invalid type specified" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const output = response.text ? JSON.parse(response.text.trim()) : null;
    res.json({ success: true, data: output });
  } catch (error: any) {
    console.error("Error in generate-utility:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate utility output",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DevFormat Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
