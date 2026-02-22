export const DEFAULT_CONFIG = {
    scope: {
        exclude: [],
    },
    signals: {
        disabled: [],
        thresholds: {
            "font-crime": { warn: 0.4, error: 0.7 },
            "purple-plague": { warn: 0.4, error: 0.7 },
            "whitespace-wasteland": { warn: 0.4, error: 0.7 },
            "shadow-realm": { warn: 0.4, error: 0.7 },
            "border-radius-maximum": { warn: 0.4, error: 0.7 },
            "gradient-overload": { warn: 0.4, error: 0.7 },
            "hero-syndrome": { warn: 0.4, error: 0.7 },
            "buzzword-bingo": { warn: 0.4, error: 0.7 },
            "cookie-cutter-layout": { warn: 0.4, error: 0.7 },
            "cta-mania": { warn: 0.4, error: 0.7 },
        },
        categoryWeights: {
            "typography-color": 1.0,
            "spacing-effects": 1.0,
            "content": 0.8,
            "structure": 0.8,
        },
    },
    intent: {
        palette: {
            brandColors: [],
        },
        tokens: {
            cssVarPrefixes: [],
        },
    },
    suppressions: {
        allowInline: true,
    },
};
export const DEFAULT_EXCLUDES = [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    ".turbo/**",
    "coverage/**",
    ".git/**",
    "public/**",
    "__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/*.stories.*",
];
export const SCANNABLE_EXTENSIONS = [
    ".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".sass", ".mdx",
];
export const UI_DIRECTORIES = [
    "app", "pages", "components", "src/components",
    "src/app", "src/pages", "ui", "layouts",
];
//# sourceMappingURL=defaults.js.map