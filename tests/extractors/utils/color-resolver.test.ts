import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  rgbToHsl,
  parseRgbFunction,
  parseHslFunction,
  hslToHex,
  resolveColor,
  resolveTailwindColor,
  isColorValue,
} from "../../../src/extractors/utils/color-resolver.js";

describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("#7c3aed")).toEqual([124, 58, 237]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
  });

  it("parses 3-digit hex", () => {
    expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });

  it("parses 8-digit hex (with alpha)", () => {
    expect(hexToRgb("#ff0000ff")).toEqual([255, 0, 0]);
  });

  it("returns null for invalid hex", () => {
    expect(hexToRgb("#xyz")).toBeNull();
    expect(hexToRgb("#12")).toBeNull();
    expect(hexToRgb("notahex")).toBeNull();
  });
});

describe("rgbToHsl", () => {
  it("converts pure red to HSL", () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it("converts pure green to HSL", () => {
    const [h, s, l] = rgbToHsl(0, 128, 0);
    expect(h).toBe(120);
    expect(s).toBe(100);
    expect(l).toBe(25);
  });

  it("converts pure blue to HSL", () => {
    const [h, s, l] = rgbToHsl(0, 0, 255);
    expect(h).toBe(240);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it("converts white to HSL", () => {
    const [h, s, l] = rgbToHsl(255, 255, 255);
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBe(100);
  });

  it("converts black to HSL", () => {
    const [h, s, l] = rgbToHsl(0, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it("converts a purple value", () => {
    const [h, s, l] = rgbToHsl(124, 58, 237);
    // Purple hue should be in 260-280 range
    expect(h).toBeGreaterThan(250);
    expect(h).toBeLessThan(280);
    expect(s).toBeGreaterThan(60);
    expect(l).toBeGreaterThan(40);
    expect(l).toBeLessThan(70);
  });
});

describe("parseRgbFunction", () => {
  it("parses rgb() with commas", () => {
    expect(parseRgbFunction("rgb(255, 0, 0)")).toEqual([255, 0, 0]);
    expect(parseRgbFunction("rgb(124, 58, 237)")).toEqual([124, 58, 237]);
  });

  it("parses rgb() with spaces", () => {
    expect(parseRgbFunction("rgb(255 0 0)")).toEqual([255, 0, 0]);
  });

  it("parses rgba()", () => {
    expect(parseRgbFunction("rgba(0, 0, 0, 0.1)")).toEqual([0, 0, 0]);
    expect(parseRgbFunction("rgba(124, 58, 237, 0.5)")).toEqual([124, 58, 237]);
  });

  it("returns null for invalid input", () => {
    expect(parseRgbFunction("not-rgb")).toBeNull();
    expect(parseRgbFunction("hsl(0, 0%, 0%)")).toBeNull();
  });
});

describe("parseHslFunction", () => {
  it("parses hsl() with commas", () => {
    expect(parseHslFunction("hsl(270, 80%, 60%)")).toEqual([270, 80, 60]);
    expect(parseHslFunction("hsl(0, 100%, 50%)")).toEqual([0, 100, 50]);
  });

  it("parses hsl() with spaces", () => {
    expect(parseHslFunction("hsl(270 80% 60%)")).toEqual([270, 80, 60]);
  });

  it("parses hsla()", () => {
    expect(parseHslFunction("hsla(270, 80%, 60%, 0.5)")).toEqual([270, 80, 60]);
  });

  it("returns null for invalid input", () => {
    expect(parseHslFunction("not-hsl")).toBeNull();
    expect(parseHslFunction("rgb(0, 0, 0)")).toBeNull();
  });
});

describe("hslToHex", () => {
  it("converts pure red HSL to hex", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });

  it("converts pure blue HSL to hex", () => {
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
  });

  it("converts white to hex", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
  });

  it("converts black to hex", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("resolveColor", () => {
  it("resolves hex colors", () => {
    const result = resolveColor("#7c3aed");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#7c3aed");
    expect(result!.hsl).toHaveLength(3);
    // Purple range
    expect(result!.hsl[0]).toBeGreaterThan(250);
    expect(result!.hsl[0]).toBeLessThan(280);
  });

  it("resolves short hex colors", () => {
    const result = resolveColor("#f00");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#ff0000");
    expect(result!.hsl).toEqual([0, 100, 50]);
  });

  it("resolves rgb() colors", () => {
    const result = resolveColor("rgb(124, 58, 237)");
    expect(result).not.toBeNull();
    expect(result!.hsl[0]).toBeGreaterThan(250);
  });

  it("resolves hsl() colors", () => {
    const result = resolveColor("hsl(270, 80%, 60%)");
    expect(result).not.toBeNull();
    expect(result!.hsl).toEqual([270, 80, 60]);
  });

  it("resolves named colors", () => {
    const result = resolveColor("purple");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#800080");

    const white = resolveColor("white");
    expect(white).not.toBeNull();
    expect(white!.hex).toBe("#ffffff");
  });

  it("returns null for non-color values", () => {
    expect(resolveColor("transparent")).toBeNull();
    expect(resolveColor("inherit")).toBeNull();
    expect(resolveColor("currentColor")).toBeNull();
    expect(resolveColor("none")).toBeNull();
  });

  it("returns null for unresolvable values", () => {
    expect(resolveColor("var(--color-primary)")).toBeNull();
    expect(resolveColor("not-a-color")).toBeNull();
  });
});

describe("resolveTailwindColor", () => {
  it("resolves standard Tailwind colors", () => {
    const result = resolveTailwindColor("purple-500");
    expect(result).not.toBeNull();
    expect(result!.hex).toBe("#a855f7");
    expect(result!.hsl[0]).toBeGreaterThan(250);
  });

  it("resolves black and white", () => {
    const black = resolveTailwindColor("black");
    expect(black).not.toBeNull();
    expect(black!.hex).toBe("#000000");

    const white = resolveTailwindColor("white");
    expect(white).not.toBeNull();
    expect(white!.hex).toBe("#ffffff");
  });

  it("returns null for transparent/current", () => {
    expect(resolveTailwindColor("transparent")).toBeNull();
    expect(resolveTailwindColor("current")).toBeNull();
  });

  it("returns null for unknown tokens", () => {
    expect(resolveTailwindColor("brand-500")).toBeNull();
    expect(resolveTailwindColor("nonexistent")).toBeNull();
  });
});

describe("isColorValue", () => {
  it("identifies hex colors", () => {
    expect(isColorValue("#ff0000")).toBe(true);
    expect(isColorValue("#f00")).toBe(true);
  });

  it("identifies rgb colors", () => {
    expect(isColorValue("rgb(255, 0, 0)")).toBe(true);
    expect(isColorValue("rgba(0,0,0,0.5)")).toBe(true);
  });

  it("identifies hsl colors", () => {
    expect(isColorValue("hsl(270, 80%, 60%)")).toBe(true);
  });

  it("identifies named colors", () => {
    expect(isColorValue("red")).toBe(true);
    expect(isColorValue("purple")).toBe(true);
    expect(isColorValue("rebeccapurple")).toBe(true);
  });

  it("rejects non-color values", () => {
    expect(isColorValue("16px")).toBe(false);
    expect(isColorValue("none")).toBe(false);
    expect(isColorValue("auto")).toBe(false);
  });
});
