/**
 * Testimonial Factory signal analyzer.
 *
 * Detects generic, AI-generated testimonial sections with fake quotes
 * and attribution patterns. LLMs produce predictable testimonials like
 * "This product changed my life" with "John D., CEO at TechCorp".
 *
 * Detection:
 *   1. Look for testimonial-section StructuralFacts
 *   2. Scan TextFacts for generic praise phrases (tiered weights)
 *   3. Detect attribution patterns ("— Name, Title")
 *
 * Scoring:
 *   weightedHits / threshold, boosted if testimonial-section is present
 *   Only flags when weightedHits > 2 AND matchCount > 1
 */
import type { SignalDefinition } from "./types.js";
export declare const testimonialFactory: SignalDefinition;
export default testimonialFactory;
