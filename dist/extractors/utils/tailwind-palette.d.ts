/**
 * Bundled Tailwind v3 default color palette.
 * Maps Tailwind color class suffixes (e.g., "purple-500") to hex values.
 */
export declare const TAILWIND_COLORS: Record<string, string>;
/** Special Tailwind colors that map to single values */
export declare const TAILWIND_SPECIAL_COLORS: Record<string, string>;
/**
 * Look up a Tailwind color token (e.g., "purple-500") and return its hex value.
 * Returns undefined if not found.
 */
export declare function lookupTailwindColor(token: string): string | undefined;
