/**
 * CTA Mania signal analyzer.
 *
 * Detects excessive call-to-action elements on individual pages.
 * AI-generated landing pages often pack 5-8+ CTA buttons onto a single
 * page, which is a strong signal of template-driven design.
 *
 * Filtering:
 *   1. Navigation links (Home, About, Blog, etc.) are excluded from both
 *      buttons and links.
 *   2. App/functional buttons (Edit, Save, Delete, Configure, etc.) are
 *      excluded — these are normal UI controls, not marketing CTAs.
 *
 * Scoring:
 *   Count TextFact[] where context === "button" or "link" per file,
 *   after filtering out nav links and app buttons.
 *
 *   Marketing pages (landing, home, index, hero, pricing, marketing):
 *     min(1, (ctaCount - 3) / 5)
 *   App pages (everything else):
 *     min(1, (ctaCount - 6) / 8)
 *
 *   The worst marketing-page score takes priority; app pages are only
 *   used as fallback when no marketing page has CTAs above threshold.
 */
import type { SignalDefinition } from "./types.js";
export declare const ctaMania: SignalDefinition;
export default ctaMania;
