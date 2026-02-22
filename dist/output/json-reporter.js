/** Schema version for the JSON output. */
const SCHEMA_VERSION = "1.0.0";
/** Scanner version — matches package.json. */
const SCANNER_VERSION = "0.1.0";
/** Scoring epoch identifier. */
const SCORING_EPOCH = "v1";
/**
 * Generates a ScanReport JSON object from pipeline results.
 *
 * Conforms to SPEC section 12 output schema.
 *
 * @param params - All pipeline results needed to build the report
 * @returns The full ScanReport object
 */
export function generateReport(params) {
    const { scoringResult, irStore, scopeResult, configFile, duration, flags, } = params;
    const coverage = irStore.getCoverage();
    const extractorResults = irStore.getExtractorResults();
    // Build recommendations
    const deepScanSuggested = scoringResult.slopScore > 50;
    let reason = "";
    if (deepScanSuggested) {
        const tier2Signals = scoringResult.signals.filter((s) => s.id === "hero-syndrome" ||
            s.id === "buzzword-bingo" ||
            s.id === "cookie-cutter-layout" ||
            s.id === "cta-mania");
        const tier2Fired = tier2Signals.some((s) => s.status === "scored" && s.score > 0.3);
        if (tier2Fired) {
            reason =
                `Slop Score exceeds 50 and heuristic content/structure signals flagged patterns. ` +
                    `Consider --deep for nuanced content analysis.`;
        }
        else {
            reason =
                `Slop Score exceeds 50. Consider --deep for detailed content and structure analysis.`;
        }
    }
    // Collect suppressions from the IR
    const suppressions = irStore.suppressions.map((s) => ({
        signal: s.signals.join(", "),
        file: s.file,
        line: s.line,
        type: "inline",
    }));
    const report = {
        schemaVersion: SCHEMA_VERSION,
        scannerVersion: SCANNER_VERSION,
        scoringEpoch: SCORING_EPOCH,
        scanMeta: {
            duration,
            timestamp: new Date().toISOString(),
            flags,
            configFile,
        },
        scope: {
            method: scopeResult.method,
            resolvedPath: scopeResult.resolvedPath,
            filesScanned: scopeResult.files.length,
            excludesApplied: scopeResult.excludesApplied,
        },
        coverage: {
            filesAttempted: coverage.filesAttempted,
            filesParsed: coverage.filesParsed,
            overallCoverage: coverage.overallCoverage,
            extractors: extractorResults.map((r) => ({
                name: r.name,
                status: r.status,
                filesAttempted: r.filesAttempted,
                filesParsed: r.filesParsed,
                coverage: r.coverage,
                ...(r.note ? { note: r.note } : {}),
            })),
        },
        overall: {
            slopScore: scoringResult.slopScore,
            band: scoringResult.band,
            confidence: scoringResult.confidence,
        },
        intent: {
            score: scoringResult.intent.score,
            tier: scoringResult.intent.tier,
            evidence: scoringResult.intent.evidence,
            attenuations: scoringResult.intent.attenuations,
        },
        categories: scoringResult.categories.map((c) => ({
            id: c.id,
            name: c.name,
            score: Number.isNaN(c.score) ? null : c.score,
            signals: c.signals,
        })),
        signals: scoringResult.signals.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            score: s.score,
            rawScore: s.rawScore,
            attenuatedScore: s.attenuatedScore,
            status: s.status,
            confidence: s.confidence,
            evidence: s.evidence,
        })),
        suppressions,
        recommendations: {
            deepScanSuggested,
            reason,
        },
    };
    return report;
}
//# sourceMappingURL=json-reporter.js.map