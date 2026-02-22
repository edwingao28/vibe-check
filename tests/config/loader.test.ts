import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../../src/config/loader.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";

const TEST_DIR = join(import.meta.dirname, "__tmp_config_test__");

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    const { config, configFile } = loadConfig(TEST_DIR);
    expect(configFile).toBeNull();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("merges .sloprc with defaults", () => {
    writeFileSync(join(TEST_DIR, ".sloprc"), `
signals:
  disabled:
    - gradient-overload
  thresholds:
    font-crime:
      warn: 0.5
      error: 0.9
`);
    const { config, configFile } = loadConfig(TEST_DIR);
    expect(configFile).toContain(".sloprc");
    expect(config.signals.disabled).toEqual(["gradient-overload"]);
    expect(config.signals.thresholds["font-crime"]).toEqual({ warn: 0.5, error: 0.9 });
    // Other thresholds should still have defaults
    expect(config.signals.thresholds["shadow-realm"]).toEqual(DEFAULT_CONFIG.signals.thresholds["shadow-realm"]);
  });

  it("reads .sloprc.yaml variant", () => {
    writeFileSync(join(TEST_DIR, ".sloprc.yaml"), `
suppressions:
  allowInline: false
`);
    const { config } = loadConfig(TEST_DIR);
    expect(config.suppressions.allowInline).toBe(false);
  });
});
