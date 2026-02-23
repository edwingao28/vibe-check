import type { CategoryDefinition } from "./types.js";

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: "typography-color",
    name: "Typography & Color",
    signalIds: ["font-crime", "purple-plague"],
    weight: 1.0,
  },
  {
    id: "spacing-effects",
    name: "Spacing & Effects",
    signalIds: [
      "whitespace-wasteland",
      "shadow-realm",
      "border-radius-maximum",
      "gradient-overload",
    ],
    weight: 1.0,
  },
  {
    id: "content",
    name: "Content",
    signalIds: ["buzzword-bingo", "hero-syndrome", "placeholder-content"],
    weight: 0.8,
  },
  {
    id: "structure",
    name: "Structure",
    signalIds: [
      "cookie-cutter-layout",
      "cta-mania",
      "scaffold-bloat",
      "ai-scaffold-signature",
      "dead-dependency",
    ],
    weight: 0.8,
  },
];
