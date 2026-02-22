import type { SignalResult, CategoryId } from "../signals/types.js";

export type Band = "Low" | "Moderate" | "High" | "Severe";
export type Confidence = "High" | "Medium" | "Low";
export type IntentTier = "None" | "Partial" | "Full";

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  signalIds: string[];
  weight: number;
}

export interface CategoryResult {
  id: CategoryId;
  name: string;
  score: number;
  signals: string[];
}

export interface IntentEvidence {
  type: string;
  count: number;
  description: string;
}

export interface IntentResult {
  score: number;
  tier: IntentTier;
  evidence: IntentEvidence[];
  attenuations: Record<string, number>;
}

export interface ScoringResult {
  slopScore: number;
  band: Band;
  confidence: Confidence;
  categories: CategoryResult[];
  intent: IntentResult;
  signals: SignalResult[];
}
