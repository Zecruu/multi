import { GoogleGenAI } from "@google/genai";

export type RatingParse = {
  rating: number | null;
  source: "digit" | "keyword" | "ai" | "none";
};

const KEYWORDS: Array<[RegExp, number]> = [
  [/\b(excelente|excellent|great|amazing|incredible|perfecto|perfect)\b/i, 5],
  [/\b(muy\s+bueno|very\s+good|buenisimo|buen[íi]simo|bien|bueno)\b/i, 4],
  [/\b(ok|okay|regular|normal|so\s+so|[áa]s[íi])\b/i, 3],
  [/\b(mal|malo|bad|poor|pobre|deficient)\b/i, 2],
  [/\b(terrible|horrible|awful|pesimo|p[ée]simo|worst)\b/i, 1],
];

/** Look for a plain 1-5 digit. Handles "5", "5!", "rating 4", "le doy un 4". */
function parseDigit(text: string): number | null {
  const m = text.match(/\b([1-5])\b(?!\s*star)/);
  if (m) return Number(m[1]);
  // Also accept "X stars" / "X estrellas"
  const s = text.match(/\b([1-5])\s*(stars?|estrellas?)\b/i);
  if (s) return Number(s[1]);
  return null;
}

function parseKeyword(text: string): number | null {
  for (const [re, val] of KEYWORDS) {
    if (re.test(text)) return val;
  }
  return null;
}

async function parseAi(text: string): Promise<number | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Clasifica el siguiente mensaje SMS del cliente en una escala de 1 (muy mala experiencia) a 5 (excelente experiencia). Responde SOLO con un dígito del 1 al 5, o "0" si el mensaje no es una calificación.\n\nMensaje: "${text.replace(/"/g, "'")}"`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 5 },
    });
    const raw =
      res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "";
    const match = raw.match(/([1-5])/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export async function parseRating(text: string): Promise<RatingParse> {
  const digit = parseDigit(text);
  if (digit) return { rating: digit, source: "digit" };

  const kw = parseKeyword(text);
  if (kw) return { rating: kw, source: "keyword" };

  const ai = await parseAi(text);
  if (ai) return { rating: ai, source: "ai" };

  return { rating: null, source: "none" };
}

const STOP_KEYWORDS = /\b(STOP|BAJA|CANCELAR|UNSUBSCRIBE|END|QUIT)\b/i;
const HELP_KEYWORDS = /\b(HELP|AYUDA|INFO)\b/i;

export function isStop(text: string) {
  return STOP_KEYWORDS.test(text.trim());
}
export function isHelp(text: string) {
  return HELP_KEYWORDS.test(text.trim());
}
