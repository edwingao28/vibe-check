import { describe, it, expect } from "vitest";
import {
  parseSuppressions,
  isLineSuppressed,
} from "../../../src/extractors/utils/suppression-parser.js";

describe("parseSuppressions", () => {
  it("parses CSS block comment style", () => {
    const source = `/* slop-ignore: shadow-realm */
.card { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }`;
    const result = parseSuppressions(source, "test.css");
    expect(result).toHaveLength(1);
    expect(result[0].signals).toEqual(["shadow-realm"]);
    expect(result[0].file).toBe("test.css");
    expect(result[0].line).toBe(1);
  });

  it("parses JS single-line comment style", () => {
    const source = `const x = 1;
// slop-ignore: purple-plague
const brandColor = '#7C3AED';`;
    const result = parseSuppressions(source, "test.ts");
    expect(result).toHaveLength(1);
    expect(result[0].signals).toEqual(["purple-plague"]);
    expect(result[0].line).toBe(2);
  });

  it("parses JSX comment style", () => {
    const source = `<div>
  {/* slop-ignore: font-crime */}
  <h1 className="font-sans">Title</h1>
</div>`;
    const result = parseSuppressions(source, "test.tsx");
    expect(result).toHaveLength(1);
    expect(result[0].signals).toEqual(["font-crime"]);
    expect(result[0].line).toBe(2);
  });

  it("parses multiple signals in one comment", () => {
    const source = `/* slop-ignore: shadow-realm, gradient-overload */
.hero { background: linear-gradient(to right, #7c3aed, #4f46e5); }`;
    const result = parseSuppressions(source, "test.css");
    expect(result).toHaveLength(1);
    expect(result[0].signals).toEqual(["shadow-realm", "gradient-overload"]);
  });

  it("parses multiple suppression comments in one file", () => {
    const source = `/* slop-ignore: shadow-realm */
.card { box-shadow: 0 4px 6px; }

/* slop-ignore: font-crime */
body { font-family: Inter; }

// slop-ignore: purple-plague
const color = '#7c3aed';`;
    const result = parseSuppressions(source, "test.css");
    expect(result).toHaveLength(3);
    expect(result[0].signals).toEqual(["shadow-realm"]);
    expect(result[1].signals).toEqual(["font-crime"]);
    expect(result[2].signals).toEqual(["purple-plague"]);
  });

  it("returns empty array when no suppressions", () => {
    const source = `.card { padding: 16px; }`;
    const result = parseSuppressions(source, "test.css");
    expect(result).toHaveLength(0);
  });

  it("ignores comments that don't match the pattern", () => {
    const source = `/* This is just a regular comment */
/* TODO: fix this later */
.card { padding: 16px; }`;
    const result = parseSuppressions(source, "test.css");
    expect(result).toHaveLength(0);
  });
});

describe("isLineSuppressed", () => {
  it("detects suppression on the previous line", () => {
    const suppressions = [
      { signals: ["shadow-realm"], file: "test.css", line: 1 },
    ];
    // Line 2 should be suppressed (suppression on line 1)
    expect(isLineSuppressed(suppressions, "test.css", 2, "shadow-realm")).toBe(true);
  });

  it("detects suppression on the same line", () => {
    const suppressions = [
      { signals: ["shadow-realm"], file: "test.css", line: 5 },
    ];
    expect(isLineSuppressed(suppressions, "test.css", 5, "shadow-realm")).toBe(true);
  });

  it("does not suppress unrelated signals", () => {
    const suppressions = [
      { signals: ["shadow-realm"], file: "test.css", line: 1 },
    ];
    expect(isLineSuppressed(suppressions, "test.css", 2, "font-crime")).toBe(false);
  });

  it("does not suppress in different files", () => {
    const suppressions = [
      { signals: ["shadow-realm"], file: "test.css", line: 1 },
    ];
    expect(isLineSuppressed(suppressions, "other.css", 2, "shadow-realm")).toBe(false);
  });

  it("supports wildcard suppression", () => {
    const suppressions = [
      { signals: ["*"], file: "test.css", line: 1 },
    ];
    expect(isLineSuppressed(suppressions, "test.css", 2, "shadow-realm")).toBe(true);
    expect(isLineSuppressed(suppressions, "test.css", 2, "font-crime")).toBe(true);
  });

  it("does not suppress distant lines", () => {
    const suppressions = [
      { signals: ["shadow-realm"], file: "test.css", line: 1 },
    ];
    expect(isLineSuppressed(suppressions, "test.css", 5, "shadow-realm")).toBe(false);
  });
});
