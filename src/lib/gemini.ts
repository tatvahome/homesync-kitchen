// Client-side Gemini multimodal client. Calls Google's Generative Language API
// directly from the browser. The API key lives in IndexedDB (see ./db.ts).
// Free-tier friendly model: gemini-2.5-flash (multimodal, supports vision).

// Gemini 3.1 Flash Lite — higher free-tier rate limits, multimodal-capable.
const MODEL = "gemini-flash-lite-latest";
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

export class GeminiError extends Error {
  kind: "no-key" | "network" | "no-detection" | "bad-response" | "auth" | "rate";
  constructor(kind: GeminiError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface SingleItemResult {
  name: string;
  brand?: string;
  category?: string;
  emoji: string;
  suggestedQuantity: number;
  suggestedUnit: string;
  estimatedShelfDays: number;
  confidence: number;
}

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  likelyFridgeItem: boolean;
}

export interface ReceiptResult {
  items: ReceiptLineItem[];
  currency: string;
}

function stripDataUrl(b64: string): { mime: string; data: string } {
  const m = b64.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: b64 };
}

function extractJson(text: string): unknown {
  // Gemini sometimes wraps JSON in ```json fences. Strip them.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  // Find first { or [ to first matching close
  const first = raw.search(/[\[{]/);
  if (first < 0) throw new GeminiError("bad-response", "No JSON in response");
  const snippet = raw.slice(first);
  try {
    return JSON.parse(snippet);
  } catch {
    throw new GeminiError("bad-response", "Could not parse JSON");
  }
}

async function callGemini(key: string, prompt: string, imageB64: string): Promise<string> {
  if (!key) throw new GeminiError("no-key", "Gemini API key missing");
  const img = stripDataUrl(imageB64);
  let res: Response;
  try {
    res = await fetch(ENDPOINT(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: img.mime, data: img.data } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch (e) {
    throw new GeminiError("network", e instanceof Error ? e.message : "Network error");
  }
  if (res.status === 401 || res.status === 403) {
    throw new GeminiError("auth", "API key was rejected by Gemini");
  }
  if (res.status === 429) {
    throw new GeminiError("rate", "Rate limit reached. Try again shortly.");
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new GeminiError("network", `Gemini error ${res.status}: ${t.slice(0, 140)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new GeminiError("no-detection", "No content returned");
  return text;
}

const SINGLE_PROMPT = `You are a fridge/grocery item identifier. Look at this photo and identify the MAIN food, drink, produce, or grocery item visible — even if packaging is partial, blurry, or only part of the item is in frame. Always make your best guess; do not refuse.

Return STRICT JSON ONLY matching this shape (no markdown, no commentary):
{
  "name": "short product name e.g. Greek Yogurt or Banana",
  "brand": "brand if clearly visible, otherwise null",
  "category": "dairy | produce | meat | beverage | bakery | condiment | frozen | pantry | other",
  "emoji": "single best emoji for the item",
  "suggestedQuantity": 1,
  "suggestedUnit": "pc | kg | g | L | ml | bunch | pack",
  "estimatedShelfDays": 7,
  "confidence": 0.0
}

Use confidence 0.9+ when sure, 0.5-0.8 for a reasonable guess, 0.2-0.4 for a rough guess. ONLY return {"error":"no-detection"} if the image is completely black, blank, or shows zero food/grocery/packaged-good content (e.g. a wall, ceiling, person's face with no item).`;

export async function scanSingleItem(key: string, imageB64: string): Promise<SingleItemResult> {
  const text = await callGemini(key, SINGLE_PROMPT, imageB64);
  const parsed = extractJson(text) as Record<string, unknown>;
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    throw new GeminiError("no-detection", "No product detected in frame");
  }
  const get = <T,>(k: string, d: T): T => (parsed[k] as T) ?? d;
  return {
    name: get<string>("name", "Item"),
    brand: (parsed.brand as string) || undefined,
    category: get<string>("category", "fridge"),
    emoji: get<string>("emoji", "📦"),
    suggestedQuantity: Number(parsed.suggestedQuantity) || 1,
    suggestedUnit: get<string>("suggestedUnit", "pc"),
    estimatedShelfDays: Number(parsed.estimatedShelfDays) || 7,
    confidence: Number(parsed.confidence) || 0.7,
  };
}

const RECEIPT_PROMPT = `Extract every line item from this receipt/bill/invoice image. Be generous — read partial or faded text and make your best guess for each line.
For each line, decide whether it is plausibly a fridge or grocery item
(produce, dairy, meat, beverages, prepared food) vs a non-fridge item
(detergent, paper, toiletries, electronics, services). Default to true
only when reasonably sure it belongs in a fridge/pantry.

Return STRICT JSON ONLY matching this shape:
{
  "currency": string,      // e.g. "INR", "USD"
  "items": [
    {
      "name": string,
      "quantity": number,
      "unit": string,        // "pc" if unknown
      "price": number,       // total line price, numeric
      "likelyFridgeItem": boolean
    }
  ]
}
ONLY return {"error":"no-detection"} if the image shows zero text or is clearly not a receipt/bill at all.`;

export async function scanReceipt(key: string, imageB64: string): Promise<ReceiptResult> {
  const text = await callGemini(key, RECEIPT_PROMPT, imageB64);
  const parsed = extractJson(text) as Record<string, unknown>;
  if (parsed && "error" in parsed) {
    throw new GeminiError("no-detection", "Could not read this receipt");
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (items.length === 0) {
    throw new GeminiError("no-detection", "No line items found on receipt");
  }
  return {
    currency: (parsed.currency as string) || "INR",
    items: items.map((raw) => {
      const it = raw as Record<string, unknown>;
      return {
        name: (it.name as string) || "Item",
        quantity: Number(it.quantity) || 1,
        unit: (it.unit as string) || "pc",
        price: Number(it.price) || 0,
        likelyFridgeItem: Boolean(it.likelyFridgeItem),
      };
    }),
  };
}