/**
 * AI Scaffold Signature signal analyzer.
 *
 * Detects telltale file/directory patterns left by AI coding platforms
 * (Replit, Bolt, v0, Lovable, Cursor, etc.). These platforms leave
 * characteristic files and directory structures that are strong evidence
 * the project was AI-generated.
 *
 * Detection:
 *   Scans ctx.fileList for platform-specific artifacts, scaffold patterns,
 *   and low-effort config patterns. Each pattern carries a weight (1-5).
 *
 * Scoring:
 *   clamp(totalWeight / 10, 0, 1)
 *   A single platform artifact (weight 5) scores 0.5; multiple signals
 *   push toward 1.0.
 *
 * Category: structure
 * Needs: [] (uses fileList only)
 * Attenuatable: false
 */
import type { SignalDefinition } from "./types.js";
export declare const aiScaffoldSignature: SignalDefinition;
export default aiScaffoldSignature;
