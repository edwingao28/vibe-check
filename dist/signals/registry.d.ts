/**
 * Signal registry.
 *
 * Imports all signal definitions and provides `runSignals()` which:
 * 1. Checks the config disabled list
 * 2. Checks extractor health for each signal's dependencies
 * 3. Runs each eligible signal
 * 4. Returns SignalResult[] for all signals
 *
 * Designed to be extensible: Tier 2 signals can be added to the
 * `tier1Signals` / exported `allSignals` array.
 */
import type { SignalDefinition, SignalResult, SignalContext } from "./types.js";
import type { SlopConfig } from "../config/types.js";
/**
 * Tier 1 signal definitions (deterministic, always run).
 */
export declare const tier1Signals: SignalDefinition[];
/**
 * Tier 2 signal definitions (heuristic-based).
 */
export declare const tier2Signals: SignalDefinition[];
/**
 * All registered signals (Tier 1 + Tier 2).
 */
export declare const allSignals: SignalDefinition[];
/**
 * Run all enabled signals against the given context.
 *
 * @param ctx - The signal context containing IR facts and extractor health
 * @param config - The SlopConfig (used to check disabled list)
 * @returns Array of SignalResult for every registered signal (including skipped/insufficient)
 */
export declare function runSignals(ctx: SignalContext, config: SlopConfig): SignalResult[];
