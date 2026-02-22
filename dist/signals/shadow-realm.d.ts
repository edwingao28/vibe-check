/**
 * Shadow Realm signal analyzer.
 *
 * Detects excessive shadow usage. AI-generated sites often apply box-shadow
 * to a large fraction of components, creating a "floating card" look.
 *
 * Score: shadowComponentRatio clamped to [0, 1]
 *   - Components with shadows / total components
 *
 * Components are approximated by unique (file, component) pairs in the IR.
 * If component names are unavailable, unique files serve as proxy.
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: yes
 */
import type { SignalDefinition } from "./types.js";
export declare const shadowRealm: SignalDefinition;
