/**
 * Stock Photo Syndrome signal analyzer.
 *
 * Detects usage of stock photo service URLs and generic placeholder images.
 * AI generators commonly reference unsplash.com, pexels.com, placeholder.com,
 * and use generic alt text like "team working" or "office building".
 *
 * Detection:
 *   1. Scan TextFacts for stock photo service URLs (captured from img src)
 *   2. Scan TextFacts for generic alt-text descriptions
 *
 * Scoring:
 *   Based on stock photo URL count + generic alt matches:
 *   1-2 = 0.3, 3-4 = 0.5, 5-7 = 0.7, 8+ = 1.0
 */

import type { SignalDefinition, SignalResult, SignalContext, SignalEvidence } from "./types.js";
import type { TextFact } from "../ir/types.js";
import { clamp } from "./utils/math.js";

/** Stock photo service URL patterns */
const STOCK_URL_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /unsplash\.com/i, name: "Unsplash" },
  { pattern: /pexels\.com/i, name: "Pexels" },
  { pattern: /pixabay\.com/i, name: "Pixabay" },
  { pattern: /shutterstock\.com/i, name: "Shutterstock" },
  { pattern: /istockphoto\.com/i, name: "iStock" },
  { pattern: /gettyimages\.com/i, name: "Getty" },
  { pattern: /stockphoto/i, name: "Stock Photo" },
  { pattern: /placeholder\.com/i, name: "Placeholder.com" },
  { pattern: /placehold\.co/i, name: "Placehold.co" },
  { pattern: /placeholdit/i, name: "Placehold.it" },
  { pattern: /via\.placeholder/i, name: "Via Placeholder" },
  { pattern: /picsum\.photos/i, name: "Lorem Picsum" },
  { pattern: /loremflickr\.com/i, name: "LoremFlickr" },
  { pattern: /randomuser\.me/i, name: "RandomUser" },
  { pattern: /pravatar\.cc/i, name: "Pravatar" },
  { pattern: /i\.pravatar/i, name: "Pravatar" },
  { pattern: /dummyimage\.com/i, name: "Dummy Image" },
  { pattern: /fakeimg\.pl/i, name: "FakeImg" },
  { pattern: /placeimg\.com/i, name: "PlaceIMG" },
];

/** Generic alt text patterns that suggest stock/placeholder images */
const GENERIC_ALT_PATTERNS: RegExp[] = [
  /^(?:image|photo|picture|img)\s*\d*$/i,
  /(?:happy|smiling)\s+(?:team|people|group|woman|man|person|business)/i,
  /(?:team|people|group)\s+(?:working|collaborating|meeting|celebrating)/i,
  /(?:modern|beautiful|professional)\s+(?:office|workspace|building|city)/i,
  /(?:business|corporate)\s+(?:team|meeting|presentation|handshake)/i,
  /(?:stock|placeholder|sample|dummy|test)\s*(?:image|photo|picture)?/i,
  /^hero\s*(?:image|banner|background)?$/i,
  /^(?:avatar|profile\s*(?:pic|photo|image)|user\s*(?:photo|avatar))$/i,
  /(?:laptop|computer|desk|coffee)\s+(?:on|in|at|with)/i,
  /^(?:feature|product|service)\s*(?:image|icon|illustration)?\s*\d*$/i,
];

interface StockPhotoMatch {
  text: string;
  type: "url" | "alt";
  service?: string;
  file: string;
  line: number;
}

function isUrl(text: string): boolean {
  return /^https?:\/\//.test(text) || /\.\w{2,4}\//.test(text);
}

function findStockPhotoMatches(texts: TextFact[]): StockPhotoMatch[] {
  const matches: StockPhotoMatch[] = [];

  for (const t of texts) {
    const text = t.text;

    // Check for stock photo URLs
    if (isUrl(text)) {
      for (const { pattern, name } of STOCK_URL_PATTERNS) {
        if (pattern.test(text)) {
          matches.push({
            text: text.slice(0, 80),
            type: "url",
            service: name,
            file: t.file,
            line: t.line,
          });
          break; // One match per text fact
        }
      }
    }

    // Check for generic alt text (non-URL text content)
    if (!isUrl(text) && text.length < 100) {
      for (const pattern of GENERIC_ALT_PATTERNS) {
        if (pattern.test(text)) {
          matches.push({
            text: text.slice(0, 60),
            type: "alt",
            file: t.file,
            line: t.line,
          });
          break;
        }
      }
    }
  }

  return matches;
}

function scoreFromCount(count: number): number {
  if (count >= 8) return 1.0;
  if (count >= 5) return 0.7;
  if (count >= 3) return 0.5;
  if (count >= 1) return 0.3;
  return 0;
}

export const stockPhotoSyndrome: SignalDefinition = {
  id: "stock-photo-syndrome",
  name: "Stock Photo Syndrome",
  category: "content",
  needs: ["tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { texts } = ctx;

    if (texts.length === 0) {
      return {
        id: "stock-photo-syndrome",
        name: "Stock Photo Syndrome",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
        confidence: "low",
        evidence: [],
      };
    }

    const matches = findStockPhotoMatches(texts);

    if (matches.length === 0) {
      return {
        id: "stock-photo-syndrome",
        name: "Stock Photo Syndrome",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "high",
        evidence: [],
      };
    }

    const urlMatches = matches.filter((m) => m.type === "url");
    const altMatches = matches.filter((m) => m.type === "alt");

    // URLs are stronger signals than generic alt text
    const effectiveCount = urlMatches.length + altMatches.length * 0.5;
    const rawScore = scoreFromCount(effectiveCount);

    // Boost if multiple different stock services are used
    const services = new Set(urlMatches.map((m) => m.service).filter(Boolean));
    const score = services.size >= 2 ? clamp(rawScore * 1.2, 0, 1) : rawScore;

    const evidence: SignalEvidence[] = [];

    if (urlMatches.length > 0) {
      const serviceList = [...services].join(", ");
      const files = [...new Set(urlMatches.map((m) => `${m.file}:${m.line}`))].slice(0, 5);
      evidence.push({
        summary: `${urlMatches.length} stock photo URL(s) detected (${serviceList})`,
        files,
        detail: urlMatches
          .slice(0, 5)
          .map((m) => `${m.service}: "${m.text}"`)
          .join("; "),
      });
    }

    if (altMatches.length > 0) {
      const files = [...new Set(altMatches.map((m) => `${m.file}:${m.line}`))].slice(0, 5);
      evidence.push({
        summary: `${altMatches.length} generic placeholder alt text(s) detected`,
        files,
        detail: altMatches
          .slice(0, 5)
          .map((m) => `"${m.text}"`)
          .join(", "),
      });
    }

    return {
      id: "stock-photo-syndrome",
      name: "Stock Photo Syndrome",
      category: "content",
      score,
      rawScore,
      attenuatedScore: score,
      status: "scored",
      confidence: "high",
      evidence,
    };
  },
};

export default stockPhotoSyndrome;
