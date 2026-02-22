import type { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "./types.js";
import type { ExtractorResult, ExtractorStatus } from "../extractors/types.js";
export declare class IRStore {
    facts: StyleFact[];
    colors: ColorFact[];
    texts: TextFact[];
    structures: StructuralFact[];
    suppressions: SuppressionFact[];
    extractorHealth: Map<string, ExtractorStatus>;
    private extractorResults;
    addExtractorResult(result: ExtractorResult): void;
    getExtractorResults(): ExtractorResult[];
    getCoverage(): {
        filesAttempted: number;
        filesParsed: number;
        overallCoverage: number;
    };
}
