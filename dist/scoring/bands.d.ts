import type { Band, Confidence } from "./types.js";
/**
 * Maps a slop score (0-100) to a severity band.
 *
 * Band boundaries (from SPEC section 4.3):
 *   0-25  -> "Low"
 *   26-50 -> "Moderate"
 *   51-75 -> "High"
 *   76-100 -> "Severe"
 */
export declare function getBand(score: number): Band;
/**
 * Derives a confidence rating from overall extractor coverage and extractor statuses.
 *
 * From SPEC section 4.4:
 *   >0.9 coverage and all extractors healthy -> "High"
 *   0.7-0.9 coverage or some degraded -> "Medium"
 *   <0.7 coverage -> "Low"
 */
export declare function getConfidence(overallCoverage: number, extractorStatuses: string[], excludedCategories?: number): Confidence;
