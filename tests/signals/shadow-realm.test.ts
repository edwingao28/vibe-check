import { describe, it, expect } from "vitest";
import { shadowRealm } from "../../src/signals/shadow-realm.js";
import { makeContext, makeFact } from "./__helpers__/make-context.js";

describe("Shadow Realm signal", () => {
  it("scores high (sloppy) when most components have shadows", () => {
    // 8 components total: 6 with shadows = 75% ratio
    const facts = [
      // Components with shadows (each file = component proxy)
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "Card.tsx", line: 5 }),
      makeFact({ property: "box-shadow", value: "0 2px 4px rgba(0,0,0,0.1)", file: "Hero.tsx", line: 10 }),
      makeFact({ property: "box-shadow", value: "0 10px 15px rgba(0,0,0,0.1)", file: "Feature.tsx", line: 3 }),
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "Pricing.tsx", line: 8 }),
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "Testimonial.tsx", line: 4 }),
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "CTA.tsx", line: 6 }),
      // Non-shadow facts for components without shadows
      makeFact({ property: "padding", value: "16px", file: "Layout.tsx", line: 1 }),
      makeFact({ property: "margin", value: "8px", file: "Footer.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = shadowRealm.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores low (clean) when few components have shadows", () => {
    const facts = [
      // Only 1 component with shadow out of 10
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "Card.tsx", line: 5 }),
      makeFact({ property: "padding", value: "16px", file: "Layout.tsx", line: 1 }),
      makeFact({ property: "margin", value: "8px", file: "Hero.tsx", line: 1 }),
      makeFact({ property: "padding", value: "12px", file: "Footer.tsx", line: 1 }),
      makeFact({ property: "padding", value: "8px", file: "Nav.tsx", line: 1 }),
      makeFact({ property: "padding", value: "16px", file: "Sidebar.tsx", line: 1 }),
      makeFact({ property: "margin", value: "24px", file: "Main.tsx", line: 1 }),
      makeFact({ property: "padding", value: "8px", file: "Heading.tsx", line: 1 }),
      makeFact({ property: "margin", value: "16px", file: "Section.tsx", line: 1 }),
      makeFact({ property: "padding", value: "32px", file: "Container.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = shadowRealm.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it("scores 0 with no shadow declarations", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "padding", value: "16px" }),
        makeFact({ property: "margin", value: "8px" }),
      ],
    });

    const result = shadowRealm.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("scores 0 with empty facts", () => {
    const ctx = makeContext({ facts: [] });
    const result = shadowRealm.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("handles component-level granularity", () => {
    // Same file but different components
    const facts = [
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "ui.tsx", component: "Card", line: 5 }),
      makeFact({ property: "box-shadow", value: "0 2px 4px rgba(0,0,0,0.1)", file: "ui.tsx", component: "Button", line: 10 }),
      makeFact({ property: "padding", value: "16px", file: "ui.tsx", component: "Layout", line: 15 }),
    ];

    const ctx = makeContext({ facts });
    const result = shadowRealm.analyze(ctx);

    // 2 out of 3 components have shadows = 66.7%
    expect(result.score).toBeGreaterThanOrEqual(0.6);
  });

  it("provides evidence with ratio details", () => {
    const facts = [
      makeFact({ property: "box-shadow", value: "0 4px 6px rgba(0,0,0,0.1)", file: "Card.tsx", line: 5 }),
      makeFact({ property: "padding", value: "16px", file: "Layout.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = shadowRealm.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].summary).toContain("%");
    expect(result.evidence[0].summary).toContain("components");
  });
});
