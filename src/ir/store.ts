import type { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "./types.js";
import type { ExtractorResult, ExtractorStatus } from "../extractors/types.js";

export class IRStore {
  facts: StyleFact[] = [];
  colors: ColorFact[] = [];
  texts: TextFact[] = [];
  structures: StructuralFact[] = [];
  suppressions: SuppressionFact[] = [];
  extractorHealth: Map<string, ExtractorStatus> = new Map();

  private extractorResults: ExtractorResult[] = [];

  addExtractorResult(result: ExtractorResult): void {
    this.extractorResults.push(result);
    this.facts.push(...result.facts);
    this.colors.push(...result.colors);
    this.texts.push(...result.texts);
    this.structures.push(...result.structures);
    this.suppressions.push(...result.suppressions);
    this.extractorHealth.set(result.name, result.status);
  }

  getExtractorResults(): ExtractorResult[] {
    return this.extractorResults;
  }

  getCoverage(): { filesAttempted: number; filesParsed: number; overallCoverage: number } {
    const filesAttempted = this.extractorResults.reduce((sum, r) => sum + r.filesAttempted, 0);
    const filesParsed = this.extractorResults.reduce((sum, r) => sum + r.filesParsed, 0);
    return {
      filesAttempted,
      filesParsed,
      overallCoverage: filesAttempted > 0 ? filesParsed / filesAttempted : 1,
    };
  }
}
