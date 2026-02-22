import type { ScoringResult } from "../scoring/types.js";
import type { IRStore } from "../ir/store.js";
import type { ScopeResult } from "../scope/types.js";
import type { ScanReport } from "./types.js";
/**
 * Parameters for generating a scan report.
 */
export interface ReportParams {
    scoringResult: ScoringResult;
    irStore: IRStore;
    scopeResult: ScopeResult;
    configFile: string | null;
    duration: number;
    flags: string[];
    verbose?: boolean;
}
/**
 * Generates a ScanReport JSON object from pipeline results.
 *
 * Conforms to SPEC section 12 output schema.
 *
 * @param params - All pipeline results needed to build the report
 * @returns The full ScanReport object
 */
export declare function generateReport(params: ReportParams): ScanReport;
