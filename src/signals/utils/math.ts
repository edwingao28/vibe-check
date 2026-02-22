/**
 * Math utility functions for signal analyzers.
 *
 * Provides Shannon entropy calculation and unique-ratio computation
 * used primarily by the Whitespace Wasteland signal.
 */

/**
 * Compute Shannon entropy of a value distribution.
 *
 * Entropy measures the "surprise" or diversity of a distribution.
 * A uniform distribution over N values yields log2(N).
 * A single repeated value yields 0.
 *
 * @param values - Array of observed values (strings or numbers)
 * @returns Entropy in bits. Returns 0 for empty input.
 */
export function shannonEntropy(values: string[]): number {
  if (values.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const total = values.length;
  let entropy = 0;

  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Normalize entropy to [0, 1] relative to the maximum possible entropy
 * for the given number of distinct values.
 *
 * @param entropy - Raw Shannon entropy in bits
 * @param distinctCount - Number of distinct values observed
 * @returns Normalized entropy in [0, 1]. Returns 0 when distinctCount <= 1.
 */
export function normalizeEntropy(entropy: number, distinctCount: number): number {
  if (distinctCount <= 1) return 0;
  const maxEntropy = Math.log2(distinctCount);
  if (maxEntropy === 0) return 0;
  return Math.min(1, entropy / maxEntropy);
}

/**
 * Compute the unique ratio: number of distinct values / total values.
 *
 * @param values - Array of observed values
 * @returns Ratio in [0, 1]. Returns 0 for empty input.
 */
export function uniqueRatio(values: string[]): number {
  if (values.length === 0) return 0;
  const distinct = new Set(values).size;
  return distinct / values.length;
}

/**
 * Clamp a numeric value to the range [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
