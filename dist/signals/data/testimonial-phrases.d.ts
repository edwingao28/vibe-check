/**
 * Common AI-generated testimonial phrases and attribution patterns.
 *
 * Tiered by specificity:
 * - Tier 1 (weight 3): Highly generic phrases almost never seen in real testimonials
 * - Tier 2 (weight 2): Common AI filler phrases
 * - Tier 3 (weight 1): Soft indicators (might appear naturally)
 */
export interface TestimonialPhraseTier {
    weight: number;
    phrases: RegExp[];
}
export declare const TESTIMONIAL_PHRASES: Record<string, TestimonialPhraseTier>;
/**
 * Attribution patterns that suggest fake testimonials.
 * Matches "- Name, Title" or "Name, Title at Company" patterns.
 */
export declare const ATTRIBUTION_PATTERNS: RegExp[];
