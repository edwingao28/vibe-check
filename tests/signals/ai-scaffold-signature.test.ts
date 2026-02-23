import { describe, it, expect } from "vitest";
import { aiScaffoldSignature } from "../../src/signals/ai-scaffold-signature.js";
import { makeContext } from "./__helpers__/make-context.js";

describe("AI Scaffold Signature signal", () => {
  it("scores high with Replit artifacts (replit_integrations/, .replit)", () => {
    const ctx = makeContext({
      fileList: [
        "replit_integrations/nix/replit.nix",
        ".replit",
        "src/index.ts",
        "package.json",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 5 for replit artifacts → 5/10 = 0.5
    expect(result.score).toBeCloseTo(0.5, 1);
    expect(result.score).toBeGreaterThanOrEqual(0.5);

    // Evidence should mention Replit
    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("Replit"))).toBe(true);
  });

  it("scores high with Bolt artifacts (.bolt/)", () => {
    const ctx = makeContext({
      fileList: [
        ".bolt/config.json",
        ".bolt/prompt",
        "src/App.tsx",
        "package.json",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 5 → 5/10 = 0.5
    expect(result.score).toBeCloseTo(0.5, 1);

    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("Bolt"))).toBe(true);
  });

  it("scores medium with excessive shadcn files (30+ ui/ files)", () => {
    // Generate 35 shadcn component files
    const uiFiles = Array.from(
      { length: 35 },
      (_, i) => `src/components/ui/component-${i}.tsx`,
    );
    const ctx = makeContext({
      fileList: [...uiFiles, "src/App.tsx", "package.json"],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 3 → 3/10 = 0.3
    expect(result.score).toBeCloseTo(0.3, 1);

    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("shadcn"))).toBe(true);
  });

  it("scores low with just Cursor directory (.cursor/)", () => {
    const ctx = makeContext({
      fileList: [".cursor/settings.json", "src/index.ts", "package.json"],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 2 → 2/10 = 0.2
    expect(result.score).toBeCloseTo(0.2, 1);
    expect(result.score).toBeLessThan(0.5);

    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("Cursor"))).toBe(true);
  });

  it("scores zero with a clean project (no AI artifacts)", () => {
    const ctx = makeContext({
      fileList: [
        "src/index.ts",
        "src/components/Header.tsx",
        "src/components/Footer.tsx",
        "package.json",
        "tsconfig.json",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
    expect(result.evidence).toHaveLength(0);
  });

  it("returns insufficient_data when fileList is undefined", () => {
    // Do not pass fileList, so it remains undefined
    const ctx = makeContext({});

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  it("detects combined platform + scaffold patterns and scores near 1.0", () => {
    const uiFiles = Array.from(
      { length: 35 },
      (_, i) => `components/ui/widget-${i}.tsx`,
    );

    const ctx = makeContext({
      fileList: [
        // Replit (weight 5)
        ".replit",
        "replit_integrations/nix/replit.nix",
        // Generated icon (weight 5)
        "generated-icon.png",
        // Excessive shadcn (weight 3)
        ...uiFiles,
        // shadcn trio (weight 3)
        "tailwind.config.ts",
        "postcss.config.js",
        "components.json",
        // Some normal files
        "src/App.tsx",
        "package.json",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 5+5+3+3 = 16 → clamp(16/10, 0, 1) = 1.0
    expect(result.score).toBe(1.0);
    expect(result.evidence.length).toBeGreaterThanOrEqual(3);
  });

  it("evidence lists which platforms were detected", () => {
    const ctx = makeContext({
      fileList: [
        ".bolt/config.json",
        ".lovable/config.json",
        "generated-icon.png",
        "src/index.ts",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    const summaries = result.evidence.map((e) => e.summary);

    // Each detected platform should have its own evidence entry
    expect(summaries.some((s) => s.includes("Bolt"))).toBe(true);
    expect(summaries.some((s) => s.includes("Lovable"))).toBe(true);
    expect(summaries.some((s) => s.includes("AI-generated icon"))).toBe(true);

    // Weight 5+5+5 = 15 → clamp(15/10, 0, 1) = 1.0
    expect(result.score).toBe(1.0);
    expect(result.confidence).toBe("high");
  });

  it("detects v0 artifacts (.v0/ and v0- prefix files)", () => {
    const ctx = makeContext({
      fileList: [
        ".v0/config.json",
        "v0-generated-component.tsx",
        "src/App.tsx",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 5 → 5/10 = 0.5
    expect(result.score).toBeCloseTo(0.5, 1);

    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("v0"))).toBe(true);
  });

  it("detects drizzle template pattern", () => {
    const ctx = makeContext({
      fileList: ["drizzle.config.ts", "schema.ts", "src/index.ts"],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // Weight 1 → 1/10 = 0.1
    expect(result.score).toBeCloseTo(0.1, 1);

    const summaries = result.evidence.map((e) => e.summary);
    expect(summaries.some((s) => s.includes("database template"))).toBe(true);
  });

  it("detects excessive root config files", () => {
    const ctx = makeContext({
      fileList: [
        "tsconfig.json",
        "vite.config.ts",
        "tailwind.config.ts",
        "postcss.config.js",
        "eslint.config.js",
        "prettier.config.js",
        "components.json",
        "src/index.ts",
      ],
    });

    const result = aiScaffoldSignature.analyze(ctx);

    expect(result.status).toBe("scored");
    // 7 root configs > 5, so weight 1
    // Also shadcn trio detected (tailwind.config.ts + postcss.config.js + components.json), weight 3
    // Total: 1 + 3 = 4 → 4/10 = 0.4
    expect(result.score).toBeGreaterThan(0);
  });
});
