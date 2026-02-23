import { describe, it, expect } from "vitest";
import { scaffoldBloat } from "../../src/signals/scaffold-bloat.js";
import { makeContext } from "./__helpers__/make-context.js";

describe("Scaffold Bloat", () => {
  it("scores high when 40+ ui/ files vs 4 custom files", () => {
    const uiFiles = Array.from(
      { length: 40 },
      (_, i) => `src/components/ui/component-${i}.tsx`,
    );
    const customFiles = [
      "src/components/dashboard/overview.tsx",
      "src/components/dashboard/sidebar.tsx",
      "src/components/auth/login-form.tsx",
      "src/components/auth/signup-form.tsx",
    ];

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    // ratio = 40/44 ~= 0.909 -> score = clamp((0.909 - 0.5) / 0.4, 0, 1) ~= 1.0
    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("scores low when balanced (50/50)", () => {
    const uiFiles = Array.from(
      { length: 10 },
      (_, i) => `components/ui/widget-${i}.tsx`,
    );
    const customFiles = Array.from(
      { length: 10 },
      (_, i) => `components/dashboard/page-${i}.tsx`,
    );

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    // ratio = 10/20 = 0.5 -> score = clamp((0.5 - 0.5) / 0.4, 0, 1) = 0
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });

  it("scores zero when mostly custom components", () => {
    const uiFiles = [
      "src/components/ui/button.tsx",
      "src/components/ui/input.tsx",
    ];
    const customFiles = Array.from(
      { length: 20 },
      (_, i) => `src/components/feature/custom-${i}.tsx`,
    );

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    // ratio = 2/22 ~= 0.091 -> score = clamp((0.091 - 0.5) / 0.4, 0, 1) = 0
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });

  it("scores zero when few ui files (under threshold)", () => {
    const uiFiles = [
      "components/ui/button.tsx",
      "components/ui/input.tsx",
      "components/ui/card.tsx",
    ];
    const customFiles = [
      "components/header/nav.tsx",
      "components/header/logo.tsx",
      "components/footer/links.tsx",
      "components/footer/copyright.tsx",
    ];

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    // ratio = 3/7 ~= 0.429 -> score = clamp((0.429 - 0.5) / 0.4, 0, 1) = 0
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });

  it("returns insufficient_data when fileList is undefined", () => {
    const ctx = makeContext({});
    const result = scaffoldBloat.analyze(ctx);

    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  it("returns insufficient_data when no component files found", () => {
    const ctx = makeContext({
      fileList: [
        "package.json",
        "tsconfig.json",
        "README.md",
        "src/lib/utils.ts",
        "src/types/index.ts",
      ],
    });
    const result = scaffoldBloat.analyze(ctx);

    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBe(0);
  });

  it("handles mixed directory structures (app/, pages/, features/)", () => {
    const uiFiles = Array.from(
      { length: 15 },
      (_, i) => `src/components/ui/primitive-${i}.tsx`,
    );
    const customFiles = [
      "src/app/dashboard/page.tsx",
      "src/app/settings/page.tsx",
      "src/pages/about.tsx",
      "src/features/auth/login.tsx",
      "src/features/auth/register.tsx",
      "src/modules/billing/checkout.tsx",
      "src/views/profile/edit.tsx",
      "src/components/layout/header.tsx",
    ];

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    // ratio = 15/23 ~= 0.652 -> score = clamp((0.652 - 0.5) / 0.4, 0, 1) ~= 0.38
    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it("evidence includes file counts and ratio", () => {
    const uiFiles = Array.from(
      { length: 20 },
      (_, i) => `components/ui/elem-${i}.tsx`,
    );
    const customFiles = [
      "components/dashboard/main.tsx",
      "components/dashboard/stats.tsx",
      "app/page.tsx",
    ];

    const ctx = makeContext({ fileList: [...uiFiles, ...customFiles] });
    const result = scaffoldBloat.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    const summary = result.evidence[0].summary;
    expect(summary).toContain("20 UI library file(s)");
    expect(summary).toContain("3 custom component file(s)");
    expect(summary).toMatch(/ratio: \d+%/);
  });

  it("ignores non-component files in ui/ directory", () => {
    const files = [
      "components/ui/button.tsx",
      "components/ui/utils.ts", // .ts, not .tsx — should be ignored
      "components/ui/styles.css", // .css — should be ignored
      "components/header/nav.tsx",
      "components/footer/links.tsx",
    ];

    const ctx = makeContext({ fileList: files });
    const result = scaffoldBloat.analyze(ctx);

    // Only 1 ui file (.tsx), 2 custom files
    // ratio = 1/3 ~= 0.333 -> score = 0
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0);
  });
});
