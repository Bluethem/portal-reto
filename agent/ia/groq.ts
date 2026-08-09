export interface GroqEnv {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const HINT_TIMEOUT_MS = 2500;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function phraseHint(env: GroqEnv, nextColor: string, level: number): Promise<string | null> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = env.GROQ_MODEL || DEFAULT_MODEL;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HINT_TIMEOUT_MS);
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 60,
        messages: [
          {
            role: "system",
            content:
              "Eres el asistente de un desactivador de bombas en un juego cooperativo. " +
              "Das recomendaciones cortas, directas y en español, estilo manual táctico. " +
              "Máximo 1 o 2 frases. No inventes cables ni colores.",
          },
          {
            role: "user",
            content: `Nivel ${level}: recomienda cortar el cable ${nextColor} ahora.`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
