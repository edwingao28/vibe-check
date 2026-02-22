import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseInlineStyles, extractInlineStyles } from "../../src/extractors/inline.js";
import { readFileSync } from "node:fs";

const FIXTURES = join(import.meta.dirname, "__fixtures__");

describe("parseInlineStyles", () => {
  it("extracts static padding from style={{}} in inline-styles.tsx", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const paddingFacts = result.facts.filter(
      (f) => f.property === "padding" && f.confidence === "high"
    );
    expect(paddingFacts.length).toBeGreaterThanOrEqual(1);
    expect(paddingFacts.some((f) => f.value === "16px")).toBe(true);
  });

  it("extracts static margin from style={{}} ", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const marginFacts = result.facts.filter(
      (f) => f.property === "margin" && f.confidence === "high"
    );
    expect(marginFacts.length).toBeGreaterThanOrEqual(1);
    expect(marginFacts.some((f) => f.value === "8px")).toBe(true);
  });

  it("extracts backgroundColor as color fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const bgFacts = result.facts.filter(
      (f) => f.property === "background-color" && f.confidence === "high"
    );
    expect(bgFacts.length).toBeGreaterThanOrEqual(1);

    // Should have resolved color
    const resolvedColors = result.colors.filter(
      (c) => c.hex === "#7c3aed" && c.confidence === "high"
    );
    expect(resolvedColors.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts borderRadius fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const radiusFacts = result.facts.filter(
      (f) => f.property === "border-radius" && f.confidence === "high"
    );
    expect(radiusFacts.length).toBeGreaterThanOrEqual(1);
    expect(radiusFacts.some((f) => f.value === "12px")).toBe(true);
  });

  it("extracts boxShadow fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const shadowFacts = result.facts.filter(
      (f) => f.property === "box-shadow" && f.confidence === "high"
    );
    expect(shadowFacts.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts fontFamily fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const fontFacts = result.facts.filter(
      (f) => f.property === "font-family" && f.confidence === "high"
    );
    expect(fontFacts.length).toBeGreaterThanOrEqual(1);
    expect(fontFacts.some((f) => f.value.includes("Inter"))).toBe(true);
  });

  it("tags dynamic values as low confidence", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const lowConfidence = result.facts.filter(
      (f) => f.confidence === "low"
    );
    // dynamicPadding and conditional background should be low confidence
    expect(lowConfidence.length).toBeGreaterThanOrEqual(1);
  });

  it("handles numeric values (converted to px)", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    // margin: 16 should become "16px"
    const numericMargin = result.facts.find(
      (f) => f.property === "margin" && f.value === "16px"
    );
    expect(numericMargin).toBeDefined();
  });

  it("sets source to inline for all facts", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    for (const fact of result.facts) {
      expect(fact.source).toBe("inline");
    }
    for (const color of result.colors) {
      expect(color.source).toBe("inline");
    }
  });

  it("extracts suppressions from JSX comments", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    expect(result.suppressions.length).toBeGreaterThanOrEqual(1);
    expect(result.suppressions.some((s) => s.signals.includes("purple-plague"))).toBe(true);
  });
});

describe("parseInlineStyles with simple JSX", () => {
  it("parses style={{ padding: '16px' }} into a StyleFact", () => {
    const content = `
      export function Box() {
        return <div style={{ padding: '16px' }}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    const paddingFact = result.facts.find((f) => f.property === "padding");
    expect(paddingFact).toBeDefined();
    expect(paddingFact!.value).toBe("16px");
    expect(paddingFact!.source).toBe("inline");
    expect(paddingFact!.confidence).toBe("high");
  });

  it("parses color values into ColorFact", () => {
    const content = `
      export function Box() {
        return <div style={{ color: '#ff0000', backgroundColor: 'blue' }}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    expect(result.colors.length).toBeGreaterThanOrEqual(2);
    const redColor = result.colors.find((c) => c.hex?.includes("ff0000"));
    expect(redColor).toBeDefined();
  });

  it("handles empty style object", () => {
    const content = `
      export function Box() {
        return <div style={{}}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");
    expect(result.facts).toHaveLength(0);
  });

  it("handles variable style reference as low confidence", () => {
    const content = `
      const myStyle = { padding: '16px' };
      export function Box() {
        return <div style={myStyle}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    const refFact = result.facts.find((f) => f.property === "style-ref");
    expect(refFact).toBeDefined();
    expect(refFact!.confidence).toBe("low");
  });
});

describe("TextFact extraction", () => {
  it("extracts heading text from <h1>", () => {
    const content = `
      export function Page() {
        return <h1>Welcome</h1>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const heading = result.texts.find(
      (t) => t.context === "heading" && t.text === "Welcome"
    );
    expect(heading).toBeDefined();
    expect(heading!.file).toBe("Page.tsx");
  });

  it("extracts heading text from h2-h6", () => {
    const content = `
      export function Page() {
        return (
          <div>
            <h2>Subtitle</h2>
            <h3>Section Title</h3>
            <h6>Smallest Heading</h6>
          </div>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const headings = result.texts.filter((t) => t.context === "heading");
    expect(headings.length).toBe(3);
    expect(headings.some((h) => h.text === "Subtitle")).toBe(true);
    expect(headings.some((h) => h.text === "Section Title")).toBe(true);
    expect(headings.some((h) => h.text === "Smallest Heading")).toBe(true);
  });

  it("extracts paragraph text from <p>", () => {
    const content = `
      export function Page() {
        return <p>Some text</p>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const para = result.texts.find(
      (t) => t.context === "paragraph" && t.text === "Some text"
    );
    expect(para).toBeDefined();
  });

  it("extracts button text from <button>", () => {
    const content = `
      export function Page() {
        return <button>Click me</button>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const btn = result.texts.find(
      (t) => t.context === "button" && t.text === "Click me"
    );
    expect(btn).toBeDefined();
  });

  it("extracts link text from <a>", () => {
    const content = `
      export function Page() {
        return <a href="#">Learn more</a>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const link = result.texts.find(
      (t) => t.context === "link" && t.text === "Learn more"
    );
    expect(link).toBeDefined();
  });

  it("concatenates mixed static text children, skipping dynamic expressions", () => {
    const content = `
      export function Page() {
        const name = "World";
        return <h1>Hello {name}</h1>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const heading = result.texts.find((t) => t.context === "heading");
    expect(heading).toBeDefined();
    expect(heading!.text).toBe("Hello");
  });

  it("extracts string literals inside JSXExpressionContainer", () => {
    const content = `
      export function Page() {
        return <p>Static text {"and more"}</p>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const para = result.texts.find((t) => t.context === "paragraph");
    expect(para).toBeDefined();
    expect(para!.text).toBe("Static text and more");
  });

  it("does not extract text from non-semantic elements like div or span", () => {
    const content = `
      export function Page() {
        return (
          <div>Some text in div</div>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    expect(result.texts).toHaveLength(0);
  });

  it("emits TextFact with '(dynamic)' for elements with dynamic-only children", () => {
    const content = `
      export function Page() {
        const title = "Dynamic";
        return <h1>{title}</h1>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    // h1 has dynamic children — still emits a TextFact for structural detection
    expect(result.texts).toHaveLength(1);
    expect(result.texts[0].text).toBe("(dynamic)");
    expect(result.texts[0].context).toBe("heading");
  });

  it("extracts text from nested children", () => {
    const content = `
      export function Page() {
        return <button><span>Click</span> here</button>;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const btn = result.texts.find((t) => t.context === "button");
    expect(btn).toBeDefined();
    expect(btn!.text).toBe("Click here");
  });
});

describe("StructuralFact extraction", () => {
  it("classifies section with hero className", () => {
    const content = `
      export function Page() {
        return (
          <section className="hero">
            <h1>Title</h1>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const hero = result.structures.find((s) => s.sectionType === "hero");
    expect(hero).toBeDefined();
    expect(hero!.file).toBe("Page.tsx");
  });

  it("classifies HeroSection component name as hero", () => {
    const content = `
      function HeroSection() {
        return <div>Hero content</div>;
      }
      export function Page() {
        return <HeroSection />;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const hero = result.structures.find((s) => s.sectionType === "hero");
    expect(hero).toBeDefined();
  });

  it("classifies feature section by className", () => {
    const content = `
      export function Page() {
        return (
          <section className="feature-list">
            <h2>Features</h2>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const feature = result.structures.find(
      (s) => s.sectionType === "feature-grid"
    );
    expect(feature).toBeDefined();
  });

  it("classifies testimonial section by className", () => {
    const content = `
      export function Page() {
        return (
          <section className="testimonial-carousel">
            <h3>Testimonials</h3>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const testimonial = result.structures.find(
      (s) => s.sectionType === "testimonial-section"
    );
    expect(testimonial).toBeDefined();
  });

  it("classifies pricing section by className", () => {
    const content = `
      export function Page() {
        return (
          <section className="pricing-table">
            <h2>Pricing</h2>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const pricing = result.structures.find(
      (s) => s.sectionType === "pricing"
    );
    expect(pricing).toBeDefined();
  });

  it("classifies cta section by className", () => {
    const content = `
      export function Page() {
        return (
          <main className="cta-section">
            <h2>Ready?</h2>
          </main>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const cta = result.structures.find(
      (s) => s.sectionType === "cta-block"
    );
    expect(cta).toBeDefined();
  });

  it("classifies footer section by className", () => {
    const content = `
      export function Page() {
        return (
          <section className="footer">
            <p>Copyright</p>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const footer = result.structures.find(
      (s) => s.sectionType === "footer"
    );
    expect(footer).toBeDefined();
  });

  it("classifies section without hints as unknown", () => {
    const content = `
      export function Page() {
        return (
          <section>
            <div>Some content</div>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const unknown = result.structures.find(
      (s) => s.sectionType === "unknown"
    );
    expect(unknown).toBeDefined();
  });

  it("applies hero heuristic: 1 heading + 1 paragraph + 1 button", () => {
    const content = `
      export function Page() {
        return (
          <section>
            <h1>Big Title</h1>
            <p>Subtitle paragraph</p>
            <button>Sign Up</button>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const hero = result.structures.find((s) => s.sectionType === "hero");
    expect(hero).toBeDefined();
  });

  it("does not apply hero heuristic when there are 2 headings", () => {
    const content = `
      export function Page() {
        return (
          <section>
            <h1>Title 1</h1>
            <h2>Title 2</h2>
            <p>Paragraph</p>
            <button>Click</button>
          </section>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    // Should be "unknown" since 2 headings doesn't match hero heuristic
    const hero = result.structures.find((s) => s.sectionType === "hero");
    expect(hero).toBeUndefined();
  });

  it("emits StructuralFact for div elements whose className matches a section keyword", () => {
    const content = `
      export function Page() {
        return (
          <div className="hero">
            <h1>Title</h1>
          </div>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    // P1: divs with className matching a section keyword now emit StructuralFact
    expect(result.structures).toHaveLength(1);
    expect(result.structures[0].sectionType).toBe("hero");
  });

  it("does not emit StructuralFact for div elements without a keyword className", () => {
    const content = `
      export function Page() {
        return (
          <div className="container">
            <h1>Title</h1>
          </div>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    // div with a non-keyword className should not emit a structural fact
    expect(result.structures).toHaveLength(0);
  });

  it("classifies component by name (e.g., FeatureGrid)", () => {
    const content = `
      function FeatureGrid() {
        return <div>Features</div>;
      }
      export function Page() {
        return <FeatureGrid />;
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    const feature = result.structures.find(
      (s) => s.sectionType === "feature-grid"
    );
    expect(feature).toBeDefined();
  });

  it("classifies component by name with various keywords", () => {
    const content = `
      export function Page() {
        return (
          <div>
            <StatsSection />
            <FaqBlock />
            <ContactForm />
            <AboutUs />
          </div>
        );
      }
    `;
    const result = parseInlineStyles(content, "Page.tsx");

    expect(result.structures.some((s) => s.sectionType === "stats")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "faq")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "contact")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "about")).toBe(true);
  });
});

describe("TextFact and StructuralFact from fixture file", () => {
  it("extracts text facts from the fixture", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    // Should find headings from HeroSection, FeatureGrid, etc.
    const headings = result.texts.filter((t) => t.context === "heading");
    expect(headings.length).toBeGreaterThanOrEqual(4);
    expect(headings.some((h) => h.text === "Welcome to Our Platform")).toBe(true);
    expect(headings.some((h) => h.text === "Amazing Features")).toBe(true);

    // Should find paragraphs
    const paragraphs = result.texts.filter((t) => t.context === "paragraph");
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs.some((p) => p.text === "The best solution for your needs.")).toBe(true);

    // Should find buttons
    const buttons = result.texts.filter((t) => t.context === "button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons.some((b) => b.text === "Get Started")).toBe(true);

    // Should find links
    const links = result.texts.filter((t) => t.context === "link");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.some((l) => l.text === "Learn more")).toBe(true);
  });

  it("extracts structural facts from the fixture", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    // Should find hero, feature, pricing, testimonial, cta, footer sections
    expect(result.structures.some((s) => s.sectionType === "hero")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "feature-grid")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "pricing")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "testimonial-section")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "cta-block")).toBe(true);
    expect(result.structures.some((s) => s.sectionType === "footer")).toBe(true);
  });
});

describe("extractInlineStyles", () => {
  it("processes files and reports health", () => {
    const files = [join(FIXTURES, "inline-styles.tsx")];
    const result = extractInlineStyles(files);

    expect(result.name).toBe("inline");
    expect(result.status).toBe("healthy");
    expect(result.filesAttempted).toBe(1);
    expect(result.filesParsed).toBe(1);
    expect(result.coverage).toBe(1);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports healthy for empty file list", () => {
    const result = extractInlineStyles([]);
    expect(result.status).toBe("healthy");
    expect(result.coverage).toBe(1);
  });

  it("handles non-existent files", () => {
    const files = [
      join(FIXTURES, "inline-styles.tsx"),
      join(FIXTURES, "nonexistent.tsx"),
    ];
    const result = extractInlineStyles(files);
    expect(result.filesAttempted).toBe(2);
    expect(result.filesParsed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.status).toBe("degraded");
  });

  it("wires text and structure facts through extractInlineStyles", () => {
    const files = [join(FIXTURES, "inline-styles.tsx")];
    const result = extractInlineStyles(files);

    expect(result.texts.length).toBeGreaterThan(0);
    expect(result.structures.length).toBeGreaterThan(0);
  });
});
