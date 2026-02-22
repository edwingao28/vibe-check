import { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "../ir/types.js";
export type ExtractorStatus = "healthy" | "degraded" | "failed";
export interface ExtractorError {
    file: string;
    message: string;
    line?: number;
}
export interface ExtractorResult {
    name: string;
    status: ExtractorStatus;
    filesAttempted: number;
    filesParsed: number;
    coverage: number;
    facts: StyleFact[];
    colors: ColorFact[];
    texts: TextFact[];
    structures: StructuralFact[];
    suppressions: SuppressionFact[];
    errors: ExtractorError[];
    note?: string;
}
