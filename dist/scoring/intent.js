// ---------------------------------------------------------------------------
// Framework-default CSS variable filtering
// ---------------------------------------------------------------------------
/**
 * CSS variable patterns from popular UI frameworks that represent
 * framework defaults, not custom design decisions.
 *
 * Variables matching any of these patterns are excluded from the intent
 * score because they ship out-of-the-box with shadcn/ui, Tailwind CSS,
 * Radix UI, etc. and do not indicate deliberate design work.
 */
const FRAMEWORK_CSS_VAR_PATTERNS = [
    // shadcn/ui / Radix UI defaults
    /^--background$/,
    /^--foreground$/,
    /^--card$/,
    /^--card-foreground$/,
    /^--popover$/,
    /^--popover-foreground$/,
    /^--primary$/,
    /^--primary-foreground$/,
    /^--secondary$/,
    /^--secondary-foreground$/,
    /^--muted$/,
    /^--muted-foreground$/,
    /^--accent$/,
    /^--accent-foreground$/,
    /^--destructive$/,
    /^--destructive-foreground$/,
    /^--border$/,
    /^--input$/,
    /^--ring$/,
    /^--radius$/,
    /^--chart-\d+$/,
    /^--sidebar-/, // --sidebar-background, --sidebar-foreground, etc.
    // Tailwind CSS defaults
    /^--tw-/, // Tailwind internal vars
    /^--color-/, // Tailwind v4 color vars
    /^--spacing$/,
    /^--font-/, // --font-sans, --font-mono, etc.
    /^--shadow-/, // --shadow-sm, --shadow-lg, etc.
    /^--animate-/, // --animate-* Tailwind animation vars
    /^--ease-/, // --ease-* timing functions
    /^--breakpoint-/, // --breakpoint-sm, etc.
    /^--container-/, // container query vars
    /^--default-/, // --default-* Tailwind defaults
    /^--text-/, // --text-sm, --text-base, etc.
    /^--tracking-/, // letter spacing
    /^--leading-/, // line height
    /^--radius-/, // --radius-sm, --radius-lg, etc.
    /^--inset-/, // --inset-ring, --inset-shadow
    /^--blur$/,
    /^--backdrop-/,
    /^--perspective-/,
    /^--aspect-/,
];
/**
 * Returns true if `varName` matches a known framework-default CSS variable
 * pattern. These variables ship with popular UI frameworks and should not
 * be counted as evidence of custom design intent.
 */
export function isFrameworkDefault(varName) {
    return FRAMEWORK_CSS_VAR_PATTERNS.some((pattern) => pattern.test(varName));
}
// ---------------------------------------------------------------------------
// Intent calculation
// ---------------------------------------------------------------------------
/**
 * Calculates the intent score from IR evidence.
 *
 * The intent score measures evidence of deliberate design decisions.
 * It is reported alongside (not instead of) the slop score.
 *
 * Contributing signals (from SPEC section 5.1):
 *   - CSS custom properties (--*): 2 per var, capped at 30
 *   - Design token files: 15 per file, capped at 30
 *   - Consistent naming conventions in CSS vars: 10 if consistent --prefix-* pattern
 *   - Distinct font-family values (>1 = custom fonts): 5 per font after first, cap 15
 *   - Style guide detection: 5 if STYLE_GUIDE.md or design-system/ found
 *
 * Total capped at 100.
 *
 * Tier derivation (SPEC section 5.2):
 *   0-20   -> "None"
 *   21-55  -> "Partial"
 *   56-100 -> "Full"
 */
export function calculateIntent(facts, fileList) {
    const evidence = [];
    let totalScore = 0;
    // -----------------------------------------------------------------------
    // Count CSS custom properties (--* in facts), filtering framework defaults
    // -----------------------------------------------------------------------
    const cssVarFacts = facts.filter((f) => f.property.startsWith("--") || f.value.startsWith("--"));
    // Deduplicate by property name to count unique vars
    const uniqueCssVars = new Set(cssVarFacts
        .filter((f) => f.property.startsWith("--"))
        .map((f) => f.property));
    // Partition into framework-default and custom (non-framework) vars
    const frameworkDefaultVars = new Set();
    const customCssVars = new Set();
    for (const varName of uniqueCssVars) {
        if (isFrameworkDefault(varName)) {
            frameworkDefaultVars.add(varName);
        }
        else {
            customCssVars.add(varName);
        }
    }
    const customCssVarCount = customCssVars.size;
    const frameworkDefaultCount = frameworkDefaultVars.size;
    const cssVarPoints = Math.min(customCssVarCount * 2, 30);
    if (customCssVarCount > 0 || frameworkDefaultCount > 0) {
        totalScore += cssVarPoints;
        const filteredNote = frameworkDefaultCount > 0
            ? ` (${frameworkDefaultCount} framework defaults filtered)`
            : "";
        evidence.push({
            type: "css-vars",
            count: customCssVarCount,
            description: `${customCssVarCount} custom CSS properties detected${filteredNote}`,
        });
    }
    // Count design token files
    const tokenFilePatterns = [/\btokens\./, /\bvariables\.css$/, /\btheme\.ts$/];
    const tokenFiles = fileList.filter((f) => {
        const basename = f.split("/").pop() ?? "";
        return tokenFilePatterns.some((p) => p.test(basename));
    });
    const tokenFileCount = tokenFiles.length;
    const tokenFilePoints = Math.min(tokenFileCount * 15, 30);
    if (tokenFileCount > 0) {
        totalScore += tokenFilePoints;
        evidence.push({
            type: "design-token-files",
            count: tokenFileCount,
            description: `${tokenFileCount} design token file(s) found: ${tokenFiles.map((f) => f.split("/").pop()).join(", ")}`,
        });
    }
    // Detect naming conventions in custom (non-framework) CSS vars only
    if (customCssVars.size >= 3) {
        const prefixes = new Map();
        for (const varName of customCssVars) {
            // Extract prefix: --prefix-* pattern (at least two segments)
            const match = varName.match(/^(--[a-zA-Z]+-)/);
            if (match) {
                const prefix = match[1];
                prefixes.set(prefix, (prefixes.get(prefix) ?? 0) + 1);
            }
        }
        // Check if there is a dominant prefix used by majority of custom vars
        const largestPrefixCount = Math.max(0, ...prefixes.values());
        if (largestPrefixCount >= 3 &&
            largestPrefixCount >= customCssVars.size * 0.5) {
            totalScore += 10;
            const dominantPrefix = [...prefixes.entries()].sort((a, b) => b[1] - a[1])[0][0];
            evidence.push({
                type: "naming-conventions",
                count: largestPrefixCount,
                description: `Consistent naming convention detected: ${dominantPrefix}* pattern (${largestPrefixCount} vars)`,
            });
        }
    }
    // Count distinct font-family values
    const fontFacts = facts.filter((f) => f.property === "font-family");
    const uniqueFonts = new Set(fontFacts.map((f) => f.value.toLowerCase()));
    if (uniqueFonts.size > 1) {
        const customFontCount = uniqueFonts.size - 1;
        const fontPoints = Math.min(customFontCount * 5, 15);
        totalScore += fontPoints;
        evidence.push({
            type: "custom-fonts",
            count: customFontCount,
            description: `${customFontCount} custom font(s) beyond the primary: ${[...uniqueFonts].join(", ")}`,
        });
    }
    // Style guide detection
    const styleGuidePatterns = [/\bSTYLE_GUIDE\.md$/i, /\bdesign-system\//i];
    const hasStyleGuide = fileList.some((f) => styleGuidePatterns.some((p) => p.test(f)));
    if (hasStyleGuide) {
        totalScore += 5;
        evidence.push({
            type: "style-guide",
            count: 1,
            description: "Style guide or design-system directory detected",
        });
    }
    // Cap at 100
    const finalScore = Math.min(totalScore, 100);
    // Derive tier
    const tier = deriveTier(finalScore);
    // Build attenuations map based on tier
    const attenuations = buildAttenuationMap(tier);
    return {
        score: finalScore,
        tier,
        evidence,
        attenuations,
    };
}
/**
 * Derives the intent tier from a raw intent score.
 *
 * SPEC section 5.2:
 *   0-20  -> "None"
 *   21-55 -> "Partial"
 *   56-100 -> "Full"
 */
export function deriveTier(score) {
    if (score <= 20)
        return "None";
    if (score <= 55)
        return "Partial";
    return "Full";
}
/**
 * Builds the attenuation multiplier map based on intent tier.
 * Used to report which signals were attenuated and by how much.
 *
 * From SPEC section 5.3.
 */
function buildAttenuationMap(tier) {
    const table = {
        "font-crime": { None: 1.0, Partial: 0.7, Full: 0.4 },
        "purple-plague": { None: 1.0, Partial: 0.6, Full: 0.3 },
        "border-radius-maximum": { None: 1.0, Partial: 0.8, Full: 0.5 },
        "shadow-realm": { None: 1.0, Partial: 0.9, Full: 0.7 },
    };
    const result = {};
    for (const [signalId, multipliers] of Object.entries(table)) {
        result[signalId] = multipliers[tier];
    }
    return result;
}
//# sourceMappingURL=intent.js.map