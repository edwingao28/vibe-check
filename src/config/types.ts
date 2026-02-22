export interface SlopConfig {
  scope: {
    exclude: string[];
  };
  signals: {
    disabled: string[];
    thresholds: Record<string, { warn: number; error: number }>;
    categoryWeights: Record<string, number>;
  };
  intent: {
    palette: {
      brandColors: string[];
    };
    tokens: {
      cssVarPrefixes: string[];
    };
  };
  suppressions: {
    allowInline: boolean;
  };
}
