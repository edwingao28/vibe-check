import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG } from "./defaults.js";
export function loadConfig(projectRoot) {
    const configPath = join(projectRoot, ".sloprc");
    const configYamlPath = join(projectRoot, ".sloprc.yaml");
    const configYmlPath = join(projectRoot, ".sloprc.yml");
    const filePath = [configPath, configYamlPath, configYmlPath].find(p => existsSync(p));
    if (!filePath) {
        return { config: DEFAULT_CONFIG, configFile: null };
    }
    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(raw) ?? {};
    const config = {
        scope: {
            exclude: parsed?.scope?.exclude ?? DEFAULT_CONFIG.scope.exclude,
        },
        signals: {
            disabled: parsed?.signals?.disabled ?? DEFAULT_CONFIG.signals.disabled,
            thresholds: { ...DEFAULT_CONFIG.signals.thresholds, ...parsed?.signals?.thresholds },
            categoryWeights: { ...DEFAULT_CONFIG.signals.categoryWeights, ...parsed?.signals?.categoryWeights },
        },
        intent: {
            palette: {
                brandColors: parsed?.intent?.palette?.brandColors ?? DEFAULT_CONFIG.intent.palette.brandColors,
            },
            tokens: {
                cssVarPrefixes: parsed?.intent?.tokens?.cssVarPrefixes ?? DEFAULT_CONFIG.intent.tokens.cssVarPrefixes,
            },
        },
        suppressions: {
            allowInline: parsed?.suppressions?.allowInline ?? DEFAULT_CONFIG.suppressions.allowInline,
        },
    };
    return { config, configFile: filePath };
}
//# sourceMappingURL=loader.js.map