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
import type { SignalDefinition } from "./types.js";
export declare const stockPhotoSyndrome: SignalDefinition;
export default stockPhotoSyndrome;
