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
import { clamp } from "./utils/math.js";
/**
 * Common navigation link texts that should be excluded from CTA counting.
 * Applied to both buttons and links.
 */
const NAV_LINK_PATTERNS = [
    /^home$/i,
    /^about$/i,
    /^contact$/i,
    /^blog$/i,
    /^docs$/i,
    /^faq$/i,
    /^pricing$/i,
    /^features$/i,
    /^login$/i,
    /^sign in$/i,
    /^menu$/i,
    /^nav$/i,
    /^sign up$/i,
    /^register$/i,
    /^log\s?in$/i,
    /^dashboard$/i,
    /^settings$/i,
];
/**
 * Common app/functional button labels that should NOT count as CTAs.
 * These represent normal UI controls rather than marketing calls-to-action.
 * Applied to both buttons and links.
 */
const APP_BUTTON_PATTERNS = [
    /^edit$/i,
    /^save$/i,
    /^delete$/i,
    /^cancel$/i,
    /^close$/i,
    /^submit$/i,
    /^update$/i,
    /^remove$/i,
    /^add$/i,
    /^create$/i,
    /^copy$/i,
    /^preview$/i,
    /^configure/i, // "Configure", "Configure Preferences"
    /^manage/i, // "Manage", "Manage Settings"
    /^view$/i,
    /^show$/i,
    /^hide$/i,
    /^toggle$/i,
    /^expand$/i,
    /^collapse$/i,
    /^refresh$/i,
    /^retry$/i,
    /^reset$/i,
    /^clear$/i,
    /^apply$/i,
    /^confirm$/i,
    /^dismiss$/i,
    /^back$/i,
    /^next$/i,
    /^previous$/i,
    /^settings$/i,
    /^preferences$/i,
    /^profile$/i,
    /^log\s?out$/i,
    /^sign\s?out$/i,
];
/**
 * Determine if a TextFact is likely a navigation link rather than a CTA.
 * Navigation links are typically short, generic labels for site sections.
 * Applied to both buttons and links.
 */
function isNavLink(fact) {
    const trimmed = fact.text.trim();
    if (trimmed.length === 0)
        return true;
    for (const pattern of NAV_LINK_PATTERNS) {
        if (pattern.test(trimmed))
            return true;
    }
    return false;
}
/**
 * Determine if a TextFact is likely a functional app button rather than a CTA.
 * App buttons are UI controls (Edit, Save, Delete, etc.) that appear in
 * application interfaces and should not count toward CTA overload.
 * Applied to both buttons and links.
 */
function isAppButton(fact) {
    const trimmed = fact.text.trim();
    if (trimmed.length === 0)
        return true;
    for (const pattern of APP_BUTTON_PATTERNS) {
        if (pattern.test(trimmed))
            return true;
    }
    return false;
}
/**
 * Detect whether a file is likely a marketing/landing page vs an app page.
 * Marketing pages use the stricter CTA threshold since excessive CTAs there
 * are a stronger signal of template-driven design.
 */
function isLikelyMarketingPage(filename) {
    const lower = filename.toLowerCase();
    return (lower.includes("landing") ||
        lower.includes("home") ||
        lower.includes("index") ||
        lower.includes("marketing") ||
        lower.includes("hero") ||
        lower.includes("pricing"));
}
/**
 * Count CTA elements (buttons + links) per file, filtering out nav links
 * and app/functional buttons. Tracks how many app buttons were filtered
 * for evidence reporting.
 */
function countCtasPerFile(texts) {
    const byFile = new Map();
    for (const t of texts) {
        if (t.context !== "button" && t.context !== "link")
            continue;
        // Skip nav links (both buttons and links)
        if (isNavLink(t))
            continue;
        // Track app buttons that are filtered out
        if (isAppButton(t)) {
            const entry = byFile.get(t.file) ?? {
                count: 0,
                ctas: [],
                filteredAppButtons: 0,
            };
            entry.filteredAppButtons++;
            byFile.set(t.file, entry);
            continue;
        }
        const entry = byFile.get(t.file) ?? {
            count: 0,
            ctas: [],
            filteredAppButtons: 0,
        };
        entry.count++;
        entry.ctas.push(t);
        byFile.set(t.file, entry);
    }
    return byFile;
}
/**
 * Compute a raw CTA score for a given page based on its type.
 * Marketing pages: (ctaCount - 3) / 5
 * App pages: (ctaCount - 6) / 8
 */
function scoreForPage(ctaCount, filename) {
    if (isLikelyMarketingPage(filename)) {
        return clamp((ctaCount - 3) / 5, 0, 1);
    }
    return clamp((ctaCount - 6) / 8, 0, 1);
}
export const ctaMania = {
    id: "cta-mania",
    name: "CTA Mania",
    category: "structure",
    needs: ["tailwind", "inline"],
    attenuatable: false,
    analyze(ctx) {
        const { texts } = ctx;
        if (texts.length === 0) {
            return {
                id: "cta-mania",
                name: "CTA Mania",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "insufficient_data",
                confidence: "low",
                evidence: [],
            };
        }
        const ctasByFile = countCtasPerFile(texts);
        if (ctasByFile.size === 0) {
            return {
                id: "cta-mania",
                name: "CTA Mania",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "scored",
                confidence: "high",
                evidence: [],
            };
        }
        // Separate marketing pages from app pages
        const marketingPages = [];
        const appPages = [];
        for (const [file, info] of ctasByFile) {
            if (isLikelyMarketingPage(file)) {
                marketingPages.push([file, info]);
            }
            else {
                appPages.push([file, info]);
            }
        }
        // Find the worst marketing page first; fall back to app pages
        let worstFile = "";
        let worstCount = 0;
        let worstScore = 0;
        // Prioritize marketing pages
        for (const [file, { count }] of marketingPages) {
            const pageScore = scoreForPage(count, file);
            if (pageScore > worstScore ||
                (pageScore === worstScore && count > worstCount)) {
                worstScore = pageScore;
                worstCount = count;
                worstFile = file;
            }
        }
        // Only consider app pages if no marketing page produced a positive score
        if (worstScore === 0) {
            for (const [file, { count }] of appPages) {
                const pageScore = scoreForPage(count, file);
                if (pageScore > worstScore ||
                    (pageScore === worstScore && count > worstCount)) {
                    worstScore = pageScore;
                    worstCount = count;
                    worstFile = file;
                }
            }
        }
        const rawScore = worstScore;
        // Build evidence
        const evidence = [];
        // Determine the flagging threshold per page type
        const allPages = [...ctasByFile.entries()];
        const flaggedPages = allPages
            .filter(([file, { count }]) => {
            const threshold = isLikelyMarketingPage(file) ? 3 : 6;
            return count > threshold;
        })
            .sort(([, a], [, b]) => b.count - a.count);
        for (const [file, { count, ctas, filteredAppButtons }] of flaggedPages) {
            const ctaLabels = ctas
                .slice(0, 5)
                .map((c) => `"${c.text.slice(0, 30)}"`)
                .join(", ");
            const filteredNote = filteredAppButtons > 0
                ? ` (${filteredAppButtons} app buttons excluded)`
                : "";
            evidence.push({
                summary: `${count} CTA elements on ${file}${filteredNote}`,
                files: [file],
                detail: `CTA labels: ${ctaLabels}${ctas.length > 5 ? ` (+${ctas.length - 5} more)` : ""}`,
            });
        }
        // Also note pages where significant app button filtering occurred,
        // even if they didn't breach the CTA threshold
        const filteredOnlyPages = allPages.filter(([file, { count, filteredAppButtons }]) => filteredAppButtons > 0 &&
            count <= (isLikelyMarketingPage(file) ? 3 : 6));
        for (const [file, { filteredAppButtons }] of filteredOnlyPages) {
            evidence.push({
                summary: `${filteredAppButtons} app buttons excluded on ${file}`,
                files: [file],
                detail: "Functional UI buttons were not counted as marketing CTAs",
            });
        }
        return {
            id: "cta-mania",
            name: "CTA Mania",
            category: "structure",
            score: rawScore,
            rawScore,
            attenuatedScore: rawScore,
            status: "scored",
            confidence: "high",
            evidence,
        };
    },
};
export default ctaMania;
//# sourceMappingURL=cta-mania.js.map