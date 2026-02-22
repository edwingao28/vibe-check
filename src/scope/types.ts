export interface ScopeResult {
  method: "user-specified" | "smart-ui" | "full";
  resolvedPath: string;
  files: string[];
  excludesApplied: string[];
}
