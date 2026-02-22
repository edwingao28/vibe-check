import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { resolveScope } from "../../src/scope/resolver.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";

const TEST_DIR = join(import.meta.dirname, "__tmp_scope_test__");

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

/**
 * Helper: creates a directory structure mimicking a Next.js project with src/.
 */
function createNextJsProject(): void {
  // src/app/
  mkdirSync(join(TEST_DIR, "src", "app"), { recursive: true });
  writeFileSync(join(TEST_DIR, "src", "app", "page.tsx"), "export default function Home() {}");
  writeFileSync(join(TEST_DIR, "src", "app", "layout.tsx"), "export default function Layout() {}");

  // src/components/
  mkdirSync(join(TEST_DIR, "src", "components"), { recursive: true });
  writeFileSync(join(TEST_DIR, "src", "components", "Card.tsx"), "export function Card() {}");
  writeFileSync(join(TEST_DIR, "src", "components", "Hero.tsx"), "export function Hero() {}");

  // src/styles/
  mkdirSync(join(TEST_DIR, "src", "styles"), { recursive: true });
  writeFileSync(join(TEST_DIR, "src", "styles", "globals.css"), "body { margin: 0; }");

  // node_modules/ (should be excluded)
  mkdirSync(join(TEST_DIR, "node_modules", "react"), { recursive: true });
  writeFileSync(join(TEST_DIR, "node_modules", "react", "index.js"), "module.exports = {}");

  // .next/ (should be excluded)
  mkdirSync(join(TEST_DIR, ".next"), { recursive: true });
  writeFileSync(join(TEST_DIR, ".next", "build-manifest.js"), "{}");

  // Test files (should be excluded)
  mkdirSync(join(TEST_DIR, "src", "__tests__"), { recursive: true });
  writeFileSync(join(TEST_DIR, "src", "__tests__", "Card.test.tsx"), "test('Card', () => {})");

  // A test file not in __tests__ dir
  writeFileSync(join(TEST_DIR, "src", "components", "Hero.test.tsx"), "test('Hero', () => {})");

  // Root config files
  writeFileSync(join(TEST_DIR, "package.json"), "{}");
  writeFileSync(join(TEST_DIR, "tsconfig.json"), "{}");
}

/**
 * Helper: creates a project WITHOUT src/ directory (root-level structure).
 */
function createRootLevelProject(): void {
  // app/
  mkdirSync(join(TEST_DIR, "app"), { recursive: true });
  writeFileSync(join(TEST_DIR, "app", "page.tsx"), "export default function Home() {}");

  // components/
  mkdirSync(join(TEST_DIR, "components"), { recursive: true });
  writeFileSync(join(TEST_DIR, "components", "Card.tsx"), "export function Card() {}");

  // pages/
  mkdirSync(join(TEST_DIR, "pages"), { recursive: true });
  writeFileSync(join(TEST_DIR, "pages", "index.tsx"), "export default function Index() {}");

  // A root-level file
  writeFileSync(join(TEST_DIR, "global.css"), "body {}");

  // node_modules/ (should be excluded)
  mkdirSync(join(TEST_DIR, "node_modules", "react"), { recursive: true });
  writeFileSync(join(TEST_DIR, "node_modules", "react", "index.js"), "module.exports = {}");
}

describe("resolveScope", () => {
  describe("user-specified path", () => {
    it("scans the specified path with method 'user-specified'", () => {
      createNextJsProject();

      const result = resolveScope(TEST_DIR, "src/components");

      expect(result.method).toBe("user-specified");
      expect(result.resolvedPath).toBe("src/components");
      // Should find Card.tsx and Hero.tsx but NOT Hero.test.tsx
      expect(result.files).toContain("src/components/Card.tsx");
      expect(result.files).toContain("src/components/Hero.tsx");
      expect(result.files).not.toContain("src/components/Hero.test.tsx");
      expect(result.files).toHaveLength(2);
    });
  });

  describe("full scan", () => {
    it("scans entire project root with method 'full'", () => {
      createNextJsProject();

      const result = resolveScope(TEST_DIR, undefined, true);

      expect(result.method).toBe("full");
      expect(result.resolvedPath).toBe(".");
      // Should find all scannable files under src/ but exclude node_modules, .next, tests
      expect(result.files).toContain("src/app/page.tsx");
      expect(result.files).toContain("src/app/layout.tsx");
      expect(result.files).toContain("src/components/Card.tsx");
      expect(result.files).toContain("src/components/Hero.tsx");
      expect(result.files).toContain("src/styles/globals.css");
      // Excluded
      expect(result.files).not.toContain("node_modules/react/index.js");
      expect(result.files).not.toContain(".next/build-manifest.js");
      expect(result.files).not.toContain("src/components/Hero.test.tsx");
    });
  });

  describe("smart-ui scope with src/", () => {
    it("auto-detects src/ and scans it", () => {
      createNextJsProject();

      const result = resolveScope(TEST_DIR);

      expect(result.method).toBe("smart-ui");
      expect(result.resolvedPath).toBe("src");
      expect(result.files).toContain("src/app/page.tsx");
      expect(result.files).toContain("src/app/layout.tsx");
      expect(result.files).toContain("src/components/Card.tsx");
      expect(result.files).toContain("src/components/Hero.tsx");
      expect(result.files).toContain("src/styles/globals.css");
      // Excluded
      expect(result.files).not.toContain("src/components/Hero.test.tsx");
    });
  });

  describe("smart-ui scope without src/", () => {
    it("scans UI_DIRECTORIES when no src/ exists", () => {
      createRootLevelProject();

      const result = resolveScope(TEST_DIR);

      expect(result.method).toBe("smart-ui");
      expect(result.resolvedPath).toBe(".");
      expect(result.files).toContain("app/page.tsx");
      expect(result.files).toContain("components/Card.tsx");
      expect(result.files).toContain("pages/index.tsx");
      // Root-level CSS file should also be included (root files collection)
      expect(result.files).toContain("global.css");
      // Excluded
      const hasNodeModules = result.files.some((f) => f.includes("node_modules"));
      expect(hasNodeModules).toBe(false);
    });
  });

  describe("exclude patterns", () => {
    it("applies DEFAULT_EXCLUDES", () => {
      createNextJsProject();

      const result = resolveScope(TEST_DIR);

      // node_modules, .next, __tests__, and *.test.* should all be excluded
      for (const file of result.files) {
        expect(file).not.toMatch(/node_modules/);
        expect(file).not.toMatch(/\.next/);
        expect(file).not.toMatch(/__tests__/);
        expect(file).not.toMatch(/\.test\./);
        expect(file).not.toMatch(/\.spec\./);
        expect(file).not.toMatch(/\.stories\./);
      }
    });

    it("applies custom excludes from config", () => {
      createNextJsProject();

      // Add a custom directory
      mkdirSync(join(TEST_DIR, "src", "legacy"), { recursive: true });
      writeFileSync(join(TEST_DIR, "src", "legacy", "OldPage.tsx"), "export default function() {}");

      const config = {
        ...DEFAULT_CONFIG,
        scope: {
          exclude: ["**/legacy/**"],
        },
      };

      const result = resolveScope(TEST_DIR, undefined, false, config);

      expect(result.files).not.toContain("src/legacy/OldPage.tsx");
      expect(result.excludesApplied).toContain("**/legacy/**");
    });
  });

  describe("file extensions", () => {
    it("only includes files with SCANNABLE_EXTENSIONS", () => {
      createNextJsProject();

      // Add non-scannable files
      writeFileSync(join(TEST_DIR, "src", "README.md"), "# Hello");
      writeFileSync(join(TEST_DIR, "src", "data.json"), "{}");
      writeFileSync(join(TEST_DIR, "src", "image.png"), "binary");

      const result = resolveScope(TEST_DIR);

      for (const file of result.files) {
        const ext = file.match(/\.[^.]+$/)?.[0];
        expect([".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".sass", ".mdx"]).toContain(ext);
      }
    });
  });

  describe("excludesApplied", () => {
    it("returns the full list of exclude patterns applied", () => {
      createNextJsProject();

      const result = resolveScope(TEST_DIR);

      expect(result.excludesApplied).toContain("node_modules/**");
      expect(result.excludesApplied).toContain(".next/**");
      expect(result.excludesApplied).toContain("**/*.test.*");
      expect(result.excludesApplied).toContain("**/*.spec.*");
      expect(result.excludesApplied).toContain("**/*.stories.*");
    });
  });

  describe("empty project", () => {
    it("returns empty file list for empty directory", () => {
      // TEST_DIR is already created but empty
      const result = resolveScope(TEST_DIR);

      expect(result.method).toBe("smart-ui");
      expect(result.files).toHaveLength(0);
    });
  });
});
