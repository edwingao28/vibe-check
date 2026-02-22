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
export declare function shannonEntropy(values: string[]): number;
/**
 * Normalize entropy to [0, 1] relative to the maximum possible entropy
 * for the given number of distinct values.
 *
 * @param entropy - Raw Shannon entropy in bits
 * @param distinctCount - Number of distinct values observed
 * @returns Normalized entropy in [0, 1]. Returns 0 when distinctCount <= 1.
 */
export declare function normalizeEntropy(entropy: number, distinctCount: number): number;
/**
 * Compute the unique ratio: number of distinct values / total values.
 *
 * @param values - Array of observed values
 * @returns Ratio in [0, 1]. Returns 0 for empty input.
 */
export declare function uniqueRatio(values: string[]): number;
/**
 * Clamp a numeric value to the range [min, max].
 */
export declare function clamp(value: number, min: number, max: number): number;
