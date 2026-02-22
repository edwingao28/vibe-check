import { describe, it, expect } from "vitest";
import { getBand, getConfidence } from "../../src/scoring/bands.js";

describe("getBand", () => {
  it("returns 'Low' for scores 0-25", () => {
    expect(getBand(0)).toBe("Low");
    expect(getBand(1)).toBe("Low");
    expect(getBand(12.5)).toBe("Low");
    expect(getBand(25)).toBe("Low");
  });

  it("returns 'Moderate' for scores 26-50", () => {
    expect(getBand(26)).toBe("Moderate");
    expect(getBand(30)).toBe("Moderate");
    expect(getBand(50)).toBe("Moderate");
  });

  it("returns 'High' for scores 51-75", () => {
    expect(getBand(51)).toBe("High");
    expect(getBand(60)).toBe("High");
    expect(getBand(75)).toBe("High");
  });

  it("returns 'Severe' for scores 76-100", () => {
    expect(getBand(76)).toBe("Severe");
    expect(getBand(90)).toBe("Severe");
    expect(getBand(100)).toBe("Severe");
  });

  it("handles exact boundary values", () => {
    // 25 is the upper bound of Low
    expect(getBand(25)).toBe("Low");
    // 25.01 crosses into Moderate
    expect(getBand(25.01)).toBe("Moderate");
    // 50 is the upper bound of Moderate
    expect(getBand(50)).toBe("Moderate");
    // 50.01 crosses into High
    expect(getBand(50.01)).toBe("High");
    // 75 is the upper bound of High
    expect(getBand(75)).toBe("High");
    // 75.01 crosses into Severe
    expect(getBand(75.01)).toBe("Severe");
  });
});

describe("getConfidence", () => {
  it("returns 'High' when coverage > 0.9 and all extractors healthy", () => {
    expect(getConfidence(0.95, ["healthy", "healthy", "healthy"])).toBe("High");
    expect(getConfidence(1.0, ["healthy"])).toBe("High");
    expect(getConfidence(0.91, ["healthy", "healthy"])).toBe("High");
  });

  it("returns 'Medium' when coverage > 0.9 but some extractors degraded", () => {
    expect(getConfidence(0.95, ["healthy", "degraded"])).toBe("Medium");
    expect(getConfidence(0.92, ["healthy", "degraded", "healthy"])).toBe(
      "Medium",
    );
  });

  it("returns 'Medium' when coverage is 0.7-0.9", () => {
    expect(getConfidence(0.7, ["healthy", "healthy"])).toBe("Medium");
    expect(getConfidence(0.85, ["healthy", "healthy"])).toBe("Medium");
    expect(getConfidence(0.9, ["healthy"])).toBe("Medium");
  });

  it("returns 'Low' when coverage < 0.7", () => {
    expect(getConfidence(0.5, ["healthy", "healthy"])).toBe("Low");
    expect(getConfidence(0.69, ["healthy"])).toBe("Low");
    expect(getConfidence(0.0, [])).toBe("Low");
  });

  it("returns 'Low' when coverage < 0.7 regardless of extractor health", () => {
    expect(getConfidence(0.3, ["failed", "degraded"])).toBe("Low");
    expect(getConfidence(0.6, ["healthy", "healthy"])).toBe("Low");
  });

  it("handles edge case of empty extractor statuses with high coverage", () => {
    // No extractors -> allHealthy is true (vacuous truth), but need > 0.9
    expect(getConfidence(0.95, [])).toBe("High");
  });
});
