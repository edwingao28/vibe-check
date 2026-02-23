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
 * Lorem ipsum fragments — nearly always placeholder text.
 */
const LOREM_IPSUM: PlaceholderCategory = {
  weight: 5,
  label: "lorem ipsum",
  patterns: [/lorem ipsum/i, /dolor sit amet/i, /consectetur adipiscing/i],
};

/**
 * Common fake/dummy names that appear in AI-generated demos,
 * dashboards, and landing page testimonials.
 */
const FAKE_NAMES: PlaceholderCategory = {
  weight: 2,
  label: "fake names",
  patterns: [
    /\bJohn Doe\b/i,
    /\bJane Smith\b/i,
    /\bJohn Smith\b/i,
    /\bJane Doe\b/i,
    /\bAlex Johnson\b/i,
    /\bSarah Wilson\b/i,
    /\bMike Chen\b/i,
    /\bEmily Davis\b/i,
  ],
};

/**
 * Placeholder metrics — suspiciously round/generic numbers found in
 * AI-generated dashboards and landing pages.
 */
const PLACEHOLDER_METRICS: PlaceholderCategory = {
  weight: 1,
  label: "placeholder metrics",
  patterns: [
    /\b10,000\+/,
    /\b99\.9%/,
    /\$\d{1,3}\.\d{2}\/mo\b/i,
    /\b\d{1,3}%\s+faster\b/i,
    /\b\d+k\+\s+users\b/i,
    /\b24\/7\s+support\b/i,
  ],
};

/**
 * Generic placeholder text — boilerplate or stub content indicating
 * unfinished or AI-generated filler.
 */
const GENERIC_PLACEHOLDER: PlaceholderCategory = {
  weight: 2,
  label: "generic placeholder",
  patterns: [
    /\byour text here\b/i,
    /\bcoming soon\b/i,
    /\bsample text\b/i,
    /\bplaceholder\b/i,
    /\bexample\.com\b/i,
    /\btest@example\b/i,
  ],
};

/**
 * All placeholder categories, exported as an array for easy iteration.
 */
export const PLACEHOLDER_CATEGORIES: PlaceholderCategory[] = [
  LOREM_IPSUM,
  FAKE_NAMES,
  PLACEHOLDER_METRICS,
  GENERIC_PLACEHOLDER,
];
