// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { OpenAI } = require("openai"); // requires openai package
const authRoutes = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

// mount auth routes (signup, login)
app.use("/", authRoutes);

// files
const DRUGS_FILE = path.join(__dirname, "drugs.json");
const HISTORY_FILE = path.join(__dirname, "history.json");

// ensure history.json exists
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]", "utf8");

// OpenAI client (optional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (err) {
    console.warn("OpenAI init error:", err);
  }
}

// Helper to read drugs DB
function readDrugs() {
  if (!fs.existsSync(DRUGS_FILE)) return [];
  const text = fs.readFileSync(DRUGS_FILE, "utf8");
  try { return JSON.parse(text); } catch { return []; }
}

// health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// /check?drug1=...&drug2=...
app.get("/check", async (req, res) => {
  const drug1 = (req.query.drug1 || "").trim();
  const drug2 = (req.query.drug2 || "").trim();

  if (!drug1 || !drug2) return res.json({ found: false, message: "Provide two drug names." });

  const drugs = readDrugs();
  // search ignoring case
  const result = drugs.find(item => {
    const a = (item.drug_1 || "").toLowerCase();
    const b = (item.drug_2 || "").toLowerCase();
    const d1 = drug1.toLowerCase();
    const d2 = drug2.toLowerCase();
    return (a === d1 && b === d2) || (a === d2 && b === d1);
  });

  if (!result) return res.json({ found: false, message: "No known interaction in database." });

  // ask AI for explanation if available
  let ai = "AI explanation unavailable.";
  if (openai) {
    try {
      const prompt = `Explain simply for an elderly patient: interaction between ${result.drug_1} and ${result.drug_2}. Keep it short (1-2 sentences).`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // use an appropriate available model on your plan
        messages: [
          { role: "system", content: "You are a helpful medical assistant. Use simple words." },
          { role: "user", content: prompt }
        ]
      });
      ai = (response?.choices?.[0]?.message?.content || ai);
    } catch (err) {
      console.warn("OpenAI call failed:", err?.message || err);
      ai = "AI explanation unavailable (model error).";
    }
  }

  return res.json({ found: true, interaction: result, ai });
});

// Save history (POST) — only called by frontend when user is logged in
app.post("/save-history", (req, res) => {
  const { email, drug1, drug2, resultText } = req.body || {};
  if (!email || !drug1 || !drug2) return res.json({ success: false, message: "Missing fields." });

  const hist = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]");
  hist.unshift({ email: email.toLowerCase(), drug1, drug2, resultText, time: new Date().toISOString() });
  // keep last 500 entries
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(hist.slice(0, 500), null, 2), "utf8");
  res.json({ success: true });
});

// Get history for a user
app.get("/history", (req, res) => {
  const email = (req.query.email || "").toLowerCase();
  if (!email) return res.json([]);
  const hist = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]");
  const userHist = hist.filter(h => h.email === email);
  res.json(userHist);
});

// start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
