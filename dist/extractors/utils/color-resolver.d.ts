/**
 * Color resolver: converts hex/rgb/hsl/named CSS colors to HSL.
 * Also handles Tailwind palette lookups.
 */
export interface ResolvedColor {
    hex: string;
    hsl: [number, number, number];
}
/**
 * Parse a hex color string to RGB.
 * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 */
export declare function hexToRgb(hex: string): [number, number, number] | null;
/**
 * Convert RGB (0-255) to HSL (hue 0-360, saturation 0-100, lightness 0-100).
 */
export declare function rgbToHsl(r: number, g: number, b: number): [number, number, number];
/**
 * Parse an rgb() or rgba() CSS function to RGB values.
 */
export declare function parseRgbFunction(value: string): [number, number, number] | null;
/**
 * Parse an hsl() or hsla() CSS function to HSL values.
 */
export declare function parseHslFunction(value: string): [number, number, number] | null;
/**
 * Convert HSL to hex string.
 */
export declare function hslToHex(h: number, s: number, l: number): string;
/**
 * Resolve a CSS color value to HSL + hex.
 * Handles: hex, rgb(), rgba(), hsl(), hsla(), named colors.
 * Returns null if the color cannot be resolved.
 */
export declare function resolveColor(value: string): ResolvedColor | null;
/**
 * Resolve a Tailwind color token (e.g., "purple-500") to HSL + hex.
 */
export declare function resolveTailwindColor(token: string): ResolvedColor | null;
/**
 * Check if a CSS value is a color value (hex, rgb, hsl, named).
 */
export declare function isColorValue(value: string): boolean;
