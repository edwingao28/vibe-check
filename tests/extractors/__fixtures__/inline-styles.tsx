import React from "react";

const dynamicPadding = "20px";

export function StyledBox() {
  return (
    <div
      style={{
        padding: "16px",
        margin: "8px",
        backgroundColor: "#7c3aed",
        color: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "24px" }}>
        Hello World
      </h2>
    </div>
  );
}

export function DynamicBox() {
  const isActive = true;
  return (
    <div
      style={{
        padding: dynamicPadding,
        backgroundColor: isActive ? "#7c3aed" : "#gray",
        margin: 16,
      }}
    >
      {/* slop-ignore: purple-plague */}
      <span style={{ color: "#9333ea" }}>Dynamic content</span>
    </div>
  );
}

export function EmptyStyle() {
  return <div style={{}}>No styles</div>;
}

// --- Text and structure extraction fixtures ---

export function HeroSection() {
  return (
    <section className="hero-banner">
      <h1>Welcome to Our Platform</h1>
      <p>The best solution for your needs.</p>
      <button>Get Started</button>
      <a href="/learn">Learn more</a>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="feature-list">
      <h2>Amazing Features</h2>
      <p>We offer cutting-edge solutions.</p>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="pricing-table">
      <h2>Pricing Plans</h2>
    </section>
  );
}

export function TestimonialBlock() {
  return (
    <section className="testimonial-carousel">
      <h3>What Our Customers Say</h3>
    </section>
  );
}

export function UnknownSection() {
  return (
    <section>
      <h2>Something</h2>
      <p>Some content here</p>
    </section>
  );
}

const name = "World";

export function MixedTextContent() {
  return (
    <div>
      <h1>Hello {name}</h1>
      <p>Static text {"and more"}</p>
      <button>Click {name} now</button>
    </div>
  );
}

export function HeroByContentHeuristic() {
  return (
    <section>
      <h1>Big Title</h1>
      <p>Subtitle paragraph</p>
      <button>Sign Up</button>
    </section>
  );
}

export function CtaBlock() {
  return (
    <main className="cta-section">
      <h2>Ready to start?</h2>
      <button>Try Now</button>
    </main>
  );
}

export function FooterArea() {
  return (
    <section className="footer">
      <p>Copyright 2026</p>
    </section>
  );
}
