import type { SlopConfig } from "./types.js";
export declare function loadConfig(projectRoot: string): {
    config: SlopConfig;
    configFile: string | null;
};
