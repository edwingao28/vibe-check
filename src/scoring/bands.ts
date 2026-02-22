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
export function getBand(score: number): Band {
  if (score <= 25) return "Low";
  if (score <= 50) return "Moderate";
  if (score <= 75) return "High";
  return "Severe";
}

/**
 * Derives a confidence rating from overall extractor coverage and extractor statuses.
 *
 * From SPEC section 4.4:
 *   >0.9 coverage and all extractors healthy -> "High"
 *   0.7-0.9 coverage or some degraded -> "Medium"
 *   <0.7 coverage -> "Low"
 */
export function getConfidence(
  overallCoverage: number,
  extractorStatuses: string[],
  excludedCategories?: number,
): Confidence {
  const allHealthy = extractorStatuses.every((s) => s === "healthy");

  let confidence: Confidence;
  if (overallCoverage > 0.9 && allHealthy) {
    confidence = "High";
  } else if (overallCoverage >= 0.7) {
    confidence = "Medium";
  } else {
    confidence = "Low";
  }

  // If any categories were excluded due to insufficient data, cap at Medium
  if (excludedCategories && excludedCategories > 0 && confidence === "High") {
    confidence = "Medium";
  }

  return confidence;
}
