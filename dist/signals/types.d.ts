export type SignalStatus = "scored" | "insufficient_data";
export type CategoryId = "typography-color" | "spacing-effects" | "content" | "structure";
export interface SignalEvidence {
    summary: string;
    files: string[];
    detail?: string;
}
export interface SignalResult {
    id: string;
    name: string;
    category: CategoryId;
    score: number;
    rawScore: number;
    attenuatedScore: number;
    status: SignalStatus;
    confidence: "high" | "medium" | "low";
    evidence: SignalEvidence[];
}
export interface SignalDefinition {
    id: string;
    name: string;
    category: CategoryId;
    needs: string[];
    attenuatable: boolean;
    analyze: (ctx: SignalContext) => SignalResult;
}
export interface SignalContext {
    facts: import("../ir/types.js").StyleFact[];
    colors: import("../ir/types.js").ColorFact[];
    texts: import("../ir/types.js").TextFact[];
    structures: import("../ir/types.js").StructuralFact[];
    suppressions: import("../ir/types.js").SuppressionFact[];
    extractorHealth: Map<string, import("../extractors/types.js").ExtractorStatus>;
    config: import("../config/types.js").SlopConfig;
}
