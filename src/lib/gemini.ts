import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

/** Thin wrapper around a single-turn Gemini text generation. */
export async function generateText(prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return res.text ?? "";
}
