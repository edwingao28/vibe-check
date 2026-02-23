/**
 * Placeholder content pattern definitions for the Placeholder Content signal.
 *
 * Categories of placeholder patterns commonly found in AI-generated projects:
 *
 * - Lorem ipsum (weight 5): Classic placeholder text, strong indicator
 * - Fake names (weight 2): Common dummy names used in templates and demos
 * - Placeholder metrics (weight 1): Suspiciously round numbers and generic stats
 * - Generic placeholder text (weight 2): "coming soon", "your text here", etc.
 */
export interface PlaceholderCategory {
    weight: number;
    label: string;
    patterns: RegExp[];
}
/**
 * All placeholder categories, exported as an array for easy iteration.
 */
export declare const PLACEHOLDER_CATEGORIES: PlaceholderCategory[];
