/**
 * Color resolver: converts hex/rgb/hsl/named CSS colors to HSL.
 * Also handles Tailwind palette lookups.
 */

import { lookupTailwindColor } from "./tailwind-palette.js";

export interface ResolvedColor {
  hex: string;
  hsl: [number, number, number]; // [hue 0-360, saturation 0-100, lightness 0-100]
}

/**
 * Named CSS colors (subset of the most common ones).
 */
const CSS_NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00ff00",
  aqua: "#00ffff",
  teal: "#008080",
  navy: "#000080",
  fuchsia: "#ff00ff",
  coral: "#ff7f50",
  salmon: "#fa8072",
  tomato: "#ff6347",
  gold: "#ffd700",
  khaki: "#f0e68c",
  plum: "#dda0dd",
  orchid: "#da70d6",
  violet: "#ee82ee",
  indigo: "#4b0082",
  turquoise: "#40e0d0",
  tan: "#d2b48c",
  chocolate: "#d2691e",
  firebrick: "#b22222",
  crimson: "#dc143c",
  darkblue: "#00008b",
  darkgreen: "#006400",
  darkred: "#8b0000",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  dodgerblue: "#1e90ff",
  hotpink: "#ff69b4",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightgreen: "#90ee90",
  lightgray: "#d3d3d3",
  lightgrey: "#d3d3d3",
  lightyellow: "#ffffe0",
  mediumblue: "#0000cd",
  mediumpurple: "#9370db",
  midnightblue: "#191970",
  royalblue: "#4169e1",
  slategray: "#708090",
  slategrey: "#708090",
  steelblue: "#4682b4",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32",
  rebeccapurple: "#663399",
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  blanchedalmond: "#ffebcd",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgrey: "#a9a9a9",
  darkcyan: "#008b8b",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  goldenrod: "#daa520",
  greenyellow: "#adff2f",
  honeydew: "#f0fff0",
  indianred: "#cd5c5c",
  ivory: "#fffff0",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  mediumaquamarine: "#66cdaa",
  mediumorchid: "#ba55d3",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  oldlace: "#fdf5e6",
  olivedrab: "#6b8e23",
  orangered: "#ff4500",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  powderblue: "#b0e0e6",
  rosybrown: "#bc8f8f",
  saddlebrown: "#8b4513",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  skyblue: "#87ceeb",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  thistle: "#d8bfd8",
  wheat: "#f5deb3",
};

/**
 * Parse a hex color string to RGB.
 * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  let r: number, g: number, b: number;

  if (clean.length === 3 || clean.length === 4) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/**
 * Convert RGB (0-255) to HSL (hue 0-360, saturation 0-100, lightness 0-100).
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(l * 100),
  ];
}

/**
 * Parse an rgb() or rgba() CSS function to RGB values.
 */
export function parseRgbFunction(value: string): [number, number, number] | null {
  // Match rgb(r, g, b) or rgba(r, g, b, a) or rgb(r g b) or rgb(r g b / a)
  const match = value.match(
    /rgba?\(\s*(\d+(?:\.\d+)?%?)\s*[,\s]\s*(\d+(?:\.\d+)?%?)\s*[,\s]\s*(\d+(?:\.\d+)?%?)/
  );
  if (!match) return null;

  const parseComponent = (val: string): number => {
    if (val.endsWith("%")) {
      return Math.round((parseFloat(val) / 100) * 255);
    }
    return Math.round(parseFloat(val));
  };

  const r = parseComponent(match[1]);
  const g = parseComponent(match[2]);
  const b = parseComponent(match[3]);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

/**
 * Parse an hsl() or hsla() CSS function to HSL values.
 */
export function parseHslFunction(value: string): [number, number, number] | null {
  // Match hsl(h, s%, l%) or hsla(h, s%, l%, a) or hsl(h s% l%) or hsl(h s% l% / a)
  const match = value.match(
    /hsla?\(\s*(\d+(?:\.\d+)?(?:deg|rad|turn)?)\s*[,\s]\s*(\d+(?:\.\d+)?)%\s*[,\s]\s*(\d+(?:\.\d+)?)%/
  );
  if (!match) return null;

  let h = parseFloat(match[1]);
  // Handle units
  if (match[1].includes("rad")) {
    h = (h * 180) / Math.PI;
  } else if (match[1].includes("turn")) {
    h = h * 360;
  }

  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);

  if (isNaN(h) || isNaN(s) || isNaN(l)) return null;
  return [
    Math.round(((h % 360) + 360) % 360),
    Math.round(Math.max(0, Math.min(100, s))),
    Math.round(Math.max(0, Math.min(100, l))),
  ];
}

/**
 * Convert HSL to hex string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number): string => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolve a CSS color value to HSL + hex.
 * Handles: hex, rgb(), rgba(), hsl(), hsla(), named colors.
 * Returns null if the color cannot be resolved.
 */
export function resolveColor(value: string): ResolvedColor | null {
  const trimmed = value.trim().toLowerCase();

  // Skip non-color values
  if (
    trimmed === "transparent" ||
    trimmed === "currentcolor" ||
    trimmed === "inherit" ||
    trimmed === "initial" ||
    trimmed === "unset" ||
    trimmed === "none"
  ) {
    return null;
  }

  // Hex color
  if (trimmed.startsWith("#")) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) return null;
    const hsl = rgbToHsl(...rgb);
    return { hex: trimmed.length <= 5 ? expandShortHex(trimmed) : trimmed.slice(0, 7), hsl };
  }

  // rgb() / rgba()
  if (trimmed.startsWith("rgb")) {
    const rgb = parseRgbFunction(trimmed);
    if (!rgb) return null;
    const hsl = rgbToHsl(...rgb);
    const hex = hslToHex(...hsl);
    return { hex, hsl };
  }

  // hsl() / hsla()
  if (trimmed.startsWith("hsl")) {
    const hsl = parseHslFunction(trimmed);
    if (!hsl) return null;
    const hex = hslToHex(...hsl);
    return { hex, hsl };
  }

  // Named CSS colors
  const namedHex = CSS_NAMED_COLORS[trimmed];
  if (namedHex) {
    const rgb = hexToRgb(namedHex);
    if (!rgb) return null;
    const hsl = rgbToHsl(...rgb);
    return { hex: namedHex, hsl };
  }

  return null;
}

/**
 * Resolve a Tailwind color token (e.g., "purple-500") to HSL + hex.
 */
export function resolveTailwindColor(token: string): ResolvedColor | null {
  const hex = lookupTailwindColor(token);
  if (!hex || hex === "transparent" || hex === "currentColor") return null;

  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const hsl = rgbToHsl(...rgb);
  return { hex, hsl };
}

/**
 * Expand short hex (#RGB) to full hex (#RRGGBB).
 */
function expandShortHex(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 4) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  return hex;
}

/**
 * Check if a CSS value is a color value (hex, rgb, hsl, named).
 */
export function isColorValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("rgb")) return true;
  if (trimmed.startsWith("hsl")) return true;
  if (CSS_NAMED_COLORS[trimmed]) return true;
  return false;
}
