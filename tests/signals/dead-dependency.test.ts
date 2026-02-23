import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeContext } from "./__helpers__/make-context.js";

// Mock node:fs so we don't touch the real filesystem
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
const mockReadFileSync = vi.mocked(readFileSync);

// Import the signal under test *after* the mock is installed
import { deadDependency } from "../../src/signals/dead-dependency.js";

/* ---------- helpers ---------- */

/** Build a minimal package.json string with the given dependency names. */
function makePackageJson(deps: string[] = [], devDeps: string[] = []): string {
  const dependencies: Record<string, string> = {};
  for (const d of deps) dependencies[d] = "^1.0.0";
  const devDependencies: Record<string, string> = {};
  for (const d of devDeps) devDependencies[d] = "^1.0.0";
  return JSON.stringify({ dependencies, devDependencies });
}

describe("Dead Dependency signal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---- Test 1: High score — heavy deps installed but not imported ----
  it("scores high when framer-motion + recharts are installed but never imported", () => {
    const packageJson = makePackageJson(["framer-motion", "recharts", "react"]);
    const sourceContent = `import React from "react";\nconsole.log("hello");`;

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      // All source files return content with no heavy imports
      return sourceContent;
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx", "src/main.ts"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    // 2 unused * 2 / 6 = 0.667
    expect(result.score).toBeCloseTo((2 * 2) / 6, 2);
    expect(result.score).toBeGreaterThan(0.5);
  });

  // ---- Test 2: Zero score — all heavy deps are actually imported ----
  it("scores zero when all heavy deps are actually imported", () => {
    const packageJson = makePackageJson(["framer-motion", "recharts", "d3"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      return [
        'import { motion } from "framer-motion";',
        'import { LineChart } from "recharts";',
        'import * as d3 from "d3";',
      ].join("\n");
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });

  // ---- Test 3: Zero score — no heavy deps in package.json ----
  it("scores zero when no heavy deps are in package.json", () => {
    const packageJson = makePackageJson(["react", "lodash", "axios"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      return 'import React from "react";';
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
    expect(result.evidence[0].summary).toContain("No heavy/specialty packages");
  });

  // ---- Test 4: insufficient_data when projectRoot is undefined ----
  it("returns insufficient_data when projectRoot is undefined", () => {
    const ctx = makeContext({
      fileList: ["src/app.tsx"],
      // projectRoot intentionally omitted
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBe(0);
  });

  // ---- Test 5: insufficient_data when package.json doesn't exist ----
  it("returns insufficient_data when package.json cannot be read", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBe(0);
  });

  // ---- Test 6: Medium score — 1 unused heavy dep out of 3 installed ----
  it("scores medium when 1 of 3 heavy deps is unused", () => {
    const packageJson = makePackageJson(["framer-motion", "recharts", "gsap"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      // Source imports framer-motion and recharts, but NOT gsap
      return [
        'import { motion } from "framer-motion";',
        'import { BarChart } from "recharts";',
      ].join("\n");
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx", "src/charts.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    // 1 unused * 2 / 6 = 0.333
    expect(result.score).toBeCloseTo((1 * 2) / 6, 2);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.5);
  });

  // ---- Test 7: Only checks heavy deps, ignores light deps ----
  it("ignores light/common packages like react, lodash, axios", () => {
    // react, lodash, axios are NOT in the heavy list, even if unused
    const packageJson = makePackageJson([
      "react",
      "lodash",
      "axios",
      "next",
      "tailwindcss",
    ]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      // Source doesn't import any of these, but they're not heavy deps
      return "const x = 1;";
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
    expect(result.evidence[0].summary).toContain("No heavy/specialty packages");
  });

  // ---- Test 8: Evidence lists which dependencies are unused ----
  it("evidence lists the specific unused heavy dependencies", () => {
    const packageJson = makePackageJson(["three", "gsap", "d3"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      // Only imports d3
      return 'import * as d3 from "d3";';
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/viz.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    // 2 unused (three, gsap) * 2 / 6 = 0.667
    expect(result.score).toBeCloseTo((2 * 2) / 6, 2);

    const summary = result.evidence[0].summary;
    expect(summary).toContain("three");
    expect(summary).toContain("gsap");
    expect(summary).not.toContain("d3");
    expect(summary).toContain(
      "2 heavy package(s) installed but never imported",
    );
  });

  // ---- Bonus: require() syntax is also detected ----
  it("detects require() style imports as usage", () => {
    const packageJson = makePackageJson(["chart.js"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      return 'const Chart = require("chart.js");';
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/chart.js"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });

  // ---- Bonus: Score caps at 1.0 ----
  it("caps score at 1.0 even with many unused heavy deps", () => {
    const packageJson = makePackageJson([
      "framer-motion",
      "three",
      "recharts",
      "d3",
      "gsap",
      "chart.js",
    ]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      return "const x = 1;";
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    // 6 unused * 2 / 6 = 2.0 → clamped to 1.0
    expect(result.score).toBe(1);
  });

  // ---- Only reads source file extensions ----
  it("only reads .ts/.tsx/.js/.jsx files, skips others", () => {
    const packageJson = makePackageJson(["framer-motion"]);

    mockReadFileSync.mockImplementation((filePath: any) => {
      const p = String(filePath);
      if (p.endsWith("package.json")) return packageJson;
      // Only the .tsx file would be read
      return 'import { motion } from "framer-motion";';
    });

    const ctx = makeContext({
      projectRoot: "/fake/project",
      fileList: ["src/app.tsx", "src/styles.css", "README.md", "src/data.json"],
    });

    const result = deadDependency.analyze(ctx);

    expect(result.status).toBe("scored");
    // The .tsx file imports framer-motion, so it's used
    expect(result.score).toBe(0);
  });
});
