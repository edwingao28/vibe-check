export type SourceType = "css" | "tailwind" | "inline" | "css-module";
export type ConfidenceLevel = "high" | "medium" | "low";
export interface StyleFact {
    property: string;
    value: string;
    rawValue: string;
    source: SourceType;
    file: string;
    line: number;
    component?: string;
    confidence: ConfidenceLevel;
}
export interface ColorFact {
    hex?: string;
    hsl?: [number, number, number];
    token?: string;
    source: SourceType;
    file: string;
    line: number;
    confidence: ConfidenceLevel;
}
export interface TextFact {
    text: string;
    context: "heading" | "paragraph" | "button" | "link" | "other";
    file: string;
    line: number;
    component?: string;
}
export interface StructuralFact {
    sectionType: "hero" | "feature-grid" | "testimonial-section" | "pricing" | "cta-block" | "footer" | "stats" | "faq" | "contact" | "about" | "unknown";
    file: string;
    line: number;
    component?: string;
    children?: StructuralFact[];
}
export interface SuppressionFact {
    signals: string[];
    file: string;
    line: number;
}
