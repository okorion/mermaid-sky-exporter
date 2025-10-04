export type Mode = "monaco" | "codemirror";

export type AspectPreset = "3:2" | "4:3" | "16:9";
export const ASPECT_MAP: Record<AspectPreset, number> = {
  "3:2": 3 / 2,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};
