import { GoogleGenAI } from "@google/genai";
import { resolveIntegration } from "@/lib/settings";

const DEFAULT_MODEL = "gemini-2.0-flash";

/** Thin wrapper around a single-turn Gemini text generation. The API key and
 * model are resolved from the admin settings (DB) or env at call time. */
export async function generateText(prompt: string): Promise<string> {
  const apiKey = await resolveIntegration("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini API key is not configured");
  const model = (await resolveIntegration("GEMINI_MODEL")) ?? DEFAULT_MODEL;

  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({ model, contents: prompt });
  return res.text ?? "";
}
