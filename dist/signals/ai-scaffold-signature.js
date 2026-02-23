/**
 * AI Scaffold Signature signal analyzer.
 *
 * Detects telltale file/directory patterns left by AI coding platforms
 * (Replit, Bolt, v0, Lovable, Cursor, etc.). These platforms leave
 * characteristic files and directory structures that are strong evidence
 * the project was AI-generated.
 *
 * Detection:
 *   Scans ctx.fileList for platform-specific artifacts, scaffold patterns,
 *   and low-effort config patterns. Each pattern carries a weight (1-5).
 *
 * Scoring:
 *   clamp(totalWeight / 10, 0, 1)
 *   A single platform artifact (weight 5) scores 0.5; multiple signals
 *   push toward 1.0.
 *
 * Category: structure
 * Needs: [] (uses fileList only)
 * Attenuatable: false
 */
import { clamp } from "./utils/math.js";
/**
 * Check for Replit artifacts: `replit_integrations/` directory or `.replit` file.
 */
function detectReplit(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)replit_integrations\//.test(f) || /(?:^|\/)\.replit$/.test(f));
    return matched.length > 0
        ? { platform: "Replit", weight: 5, matchedFiles: matched }
        : null;
}
/**
 * Check for Bolt.new artifacts: `.bolt/` directory.
 */
function detectBolt(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)\.bolt\//.test(f));
    return matched.length > 0
        ? { platform: "Bolt.new", weight: 5, matchedFiles: matched }
        : null;
}
/**
 * Check for Vercel v0 artifacts: `.v0/` directory or `v0-` prefix files.
 */
function detectV0(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)\.v0\//.test(f) || /(?:^|\/)v0-/.test(f));
    return matched.length > 0
        ? { platform: "Vercel v0", weight: 5, matchedFiles: matched }
        : null;
}
/**
 * Check for Lovable.dev artifacts: `.lovable/` directory.
 */
function detectLovable(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)\.lovable\//.test(f));
    return matched.length > 0
        ? { platform: "Lovable.dev", weight: 5, matchedFiles: matched }
        : null;
}
/**
 * Check for Cursor AI artifacts: `.cursor/` directory.
 * Weight 2 — less definitive since Cursor is an editor, not a full scaffold.
 */
function detectCursor(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)\.cursor\//.test(f));
    return matched.length > 0
        ? { platform: "Cursor AI", weight: 2, matchedFiles: matched }
        : null;
}
/**
 * Check for AI-generated favicon placeholder: `generated-icon.png`.
 */
function detectGeneratedIcon(fileList) {
    const matched = fileList.filter((f) => /(?:^|\/)generated-icon\.png$/.test(f));
    return matched.length > 0
        ? { platform: "AI-generated icon", weight: 5, matchedFiles: matched }
        : null;
}
/**
 * Check for excessive shadcn scaffolding: 30+ files in `components/ui/`.
 */
function detectExcessiveShadcn(fileList) {
    const uiFiles = fileList.filter((f) => /(?:^|\/)components\/ui\//.test(f));
    return uiFiles.length >= 30
        ? {
            platform: "Excessive shadcn/ui scaffolding",
            weight: 3,
            matchedFiles: uiFiles.slice(0, 10),
        }
        : null;
}
/**
 * Check for shadcn boilerplate trio: tailwind.config.ts + postcss.config.js + components.json.
 */
function detectShadcnTrio(fileList) {
    const hasTailwind = fileList.some((f) => /(?:^|\/)tailwind\.config\.ts$/.test(f));
    const hasPostcss = fileList.some((f) => /(?:^|\/)postcss\.config\.js$/.test(f));
    const hasComponents = fileList.some((f) => /(?:^|\/)components\.json$/.test(f));
    if (hasTailwind && hasPostcss && hasComponents) {
        const matched = [];
        const tw = fileList.find((f) => /(?:^|\/)tailwind\.config\.ts$/.test(f));
        const pc = fileList.find((f) => /(?:^|\/)postcss\.config\.js$/.test(f));
        const cj = fileList.find((f) => /(?:^|\/)components\.json$/.test(f));
        if (tw)
            matched.push(tw);
        if (pc)
            matched.push(pc);
        if (cj)
            matched.push(cj);
        return {
            platform: "shadcn boilerplate trio",
            weight: 3,
            matchedFiles: matched,
        };
    }
    return null;
}
/** Config file patterns commonly found at project root. */
const ROOT_CONFIG_PATTERNS = [
    /^tsconfig(\.\w+)?\.json$/,
    /^vite\.config\.\w+$/,
    /^tailwind\.config\.\w+$/,
    /^postcss\.config\.\w+$/,
    /^\.eslintrc(\.\w+)?$/,
    /^eslint\.config\.\w+$/,
    /^\.prettierrc(\.\w+)?$/,
    /^prettier\.config\.\w+$/,
    /^drizzle\.config\.\w+$/,
    /^next\.config\.\w+$/,
    /^components\.json$/,
];
/**
 * Check for excessive config files at root (>5).
 */
function detectExcessiveConfig(fileList) {
    const rootConfigs = fileList.filter((f) => {
        // Only root-level files (no directory separator)
        if (f.includes("/"))
            return false;
        return ROOT_CONFIG_PATTERNS.some((p) => p.test(f));
    });
    return rootConfigs.length > 5
        ? {
            platform: "Excessive root config files",
            weight: 1,
            matchedFiles: rootConfigs,
        }
        : null;
}
/**
 * Check for Replit database template: drizzle.config.ts alongside schema.ts in same dir.
 */
function detectDrizzleTemplate(fileList) {
    const drizzleConfigs = fileList.filter((f) => /(?:^|\/)drizzle\.config\.ts$/.test(f));
    for (const drizzleConfig of drizzleConfigs) {
        const dir = drizzleConfig.includes("/")
            ? drizzleConfig.substring(0, drizzleConfig.lastIndexOf("/"))
            : "";
        const schemaPath = dir ? `${dir}/schema.ts` : "schema.ts";
        if (fileList.includes(schemaPath)) {
            return {
                platform: "Replit database template",
                weight: 1,
                matchedFiles: [drizzleConfig, schemaPath],
            };
        }
    }
    return null;
}
/* ------------------------------------------------------------------ */
/*  All detection functions                                           */
/* ------------------------------------------------------------------ */
const ALL_DETECTORS = [
    detectReplit,
    detectBolt,
    detectV0,
    detectLovable,
    detectCursor,
    detectGeneratedIcon,
    detectExcessiveShadcn,
    detectShadcnTrio,
    detectExcessiveConfig,
    detectDrizzleTemplate,
];
/* ------------------------------------------------------------------ */
/*  Signal definition                                                 */
/* ------------------------------------------------------------------ */
export const aiScaffoldSignature = {
    id: "ai-scaffold-signature",
    name: "AI Scaffold Signature",
    category: "structure",
    needs: [],
    attenuatable: false,
    analyze(ctx) {
        const { fileList } = ctx;
        // No fileList available — cannot analyze
        if (!fileList) {
            return {
                id: "ai-scaffold-signature",
                name: "AI Scaffold Signature",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "insufficient_data",
                confidence: "low",
                evidence: [],
            };
        }
        // Run all detectors
        const hits = [];
        for (const detect of ALL_DETECTORS) {
            const hit = detect(fileList);
            if (hit)
                hits.push(hit);
        }
        // Sum weighted hits
        const totalWeight = hits.reduce((sum, h) => sum + h.weight, 0);
        const rawScore = clamp(totalWeight / 10, 0, 1);
        const score = rawScore;
        // Build evidence
        const evidence = hits.map((hit) => ({
            summary: `${hit.platform} detected (weight ${hit.weight})`,
            files: hit.matchedFiles.slice(0, 10),
        }));
        // Determine confidence
        const platformHits = hits.filter((h) => h.weight >= 5);
        const confidence = platformHits.length > 0 ? "high" : hits.length > 0 ? "medium" : "high";
        return {
            id: "ai-scaffold-signature",
            name: "AI Scaffold Signature",
            category: "structure",
            score,
            rawScore,
            attenuatedScore: score,
            status: "scored",
            confidence,
            evidence,
        };
    },
};
export default aiScaffoldSignature;
//# sourceMappingURL=ai-scaffold-signature.js.map