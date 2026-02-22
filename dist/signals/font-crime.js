/**
 * Font Crime signal analyzer.
 *
 * Detects lack of font variety. AI-generated sites often use a single font
 * (e.g., Inter) for everything. A well-designed site typically uses 2-4
 * distinct font families (body, headings, accent, mono).
 *
 * Score: `1 - (min(distinctFonts, 4) / 4)`
 *   - 0 fonts detected = 1.0 (only defaults / no declarations)
 *   - 1 font = 0.75
 *   - 2 fonts = 0.5
 *   - 3 fonts = 0.25
 *   - 4+ fonts = 0.0
 *
 * Category: typography-color
 * Needs: ["css", "tailwind"]
 * Attenuatable: yes (design tokens may justify single font)
 */
import { clamp } from "./utils/math.js";
function analyze(ctx) {
    const fontFacts = ctx.facts.filter((f) => f.property === "font-family");
    // Collect distinct font-family values (normalized to lowercase, trimmed)
    const distinctFonts = new Set();
    const fileLocations = [];
    for (const fact of fontFacts) {
        // Normalize: lowercase, strip quotes, trim
        const normalized = fact.value
            .toLowerCase()
            .replace(/["']/g, "")
            .trim();
        if (normalized && normalized !== "inherit" && normalized !== "initial" && normalized !== "unset") {
            distinctFonts.add(normalized);
            if (fileLocations.length < 10) {
                fileLocations.push(`${fact.file}:${fact.line}`);
            }
        }
    }
    const count = distinctFonts.size;
    const rawScore = clamp(1 - Math.min(count, 4) / 4, 0, 1);
    const fontList = Array.from(distinctFonts).slice(0, 5);
    const summary = count === 0
        ? "No font-family declarations found"
        : `${count} font famil${count === 1 ? "y" : "ies"} (${fontList.map((f) => `'${f}'`).join(", ")}) across ${fontFacts.length} declarations`;
    const detail = count <= 1
        ? "No display or accent font detected. All text appears to use the same family."
        : count >= 4
            ? "Good font variety detected."
            : `Consider adding display or accent fonts for visual hierarchy.`;
    return {
        id: "font-crime",
        name: "Font Crime",
        category: "typography-color",
        score: rawScore,
        rawScore,
        attenuatedScore: rawScore,
        status: "scored",
        confidence: "high",
        evidence: [
            {
                summary,
                files: fileLocations,
                detail,
            },
        ],
    };
}
export const fontCrime = {
    id: "font-crime",
    name: "Font Crime",
    category: "typography-color",
    needs: ["css", "tailwind"],
    attenuatable: true,
    analyze,
};
//# sourceMappingURL=font-crime.js.map