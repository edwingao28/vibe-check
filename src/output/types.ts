import type { Band, Confidence, IntentTier } from "../scoring/types.js";
import type { ExtractorStatus } from "../extractors/types.js";
import type { SignalStatus, CategoryId } from "../signals/types.js";

export interface ScanReport {
  schemaVersion: string;
  scannerVersion: string;
  scoringEpoch: string;
  scanMeta: {
    duration: number;
    timestamp: string;
    flags: string[];
    configFile: string | null;
  };
  scope: {
    method: "user-specified" | "smart-ui" | "full";
    resolvedPath: string;
    filesScanned: number;
    excludesApplied: string[];
  };
  coverage: {
    filesAttempted: number;
    filesParsed: number;
    overallCoverage: number;
    extractors: Array<{
      name: string;
      status: ExtractorStatus;
      filesAttempted: number;
      filesParsed: number;
      coverage: number;
      note?: string;
    }>;
  };
  overall: {
    slopScore: number;
    band: Band;
    confidence: Confidence;
  };
  intent: {
    score: number;
    tier: IntentTier;
    evidence: Array<{ type: string; count: number; description: string }>;
    attenuations: Record<string, number>;
  };
  categories: Array<{
    id: CategoryId;
    name: string;
    score: number;
    signals: string[];
  }>;
  signals: Array<{
    id: string;
    name: string;
    category: CategoryId;
    score: number;
    rawScore: number;
    attenuatedScore: number;
    status: SignalStatus;
    confidence: "high" | "medium" | "low";
    evidence: Array<{ summary: string; files: string[]; detail?: string }>;
  }>;
  suppressions: Array<{
    signal: string;
    file: string;
    line: number;
    type: "inline" | "config";
  }>;
  recommendations: {
    deepScanSuggested: boolean;
    reason: string;
  };
}
