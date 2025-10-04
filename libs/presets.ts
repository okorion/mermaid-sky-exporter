export const SAMPLE = `graph TD
  A[Input] --> B[Process]
  B --> C{OK?}
  C -- Yes --> D[Done]
  C -- No  --> B
`;

export type Theme = "default" | "dark" | "forest" | "neutral" | "custom";

export const THEMES: Theme[] = [
  "default",
  "dark",
  "forest",
  "neutral",
  "custom",
];

export const DEFAULTS = {
  theme: "default" as Theme,
  bg: "#ffffff",
  scale: 1,
  exportScale: 2,
};
