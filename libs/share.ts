import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export function encodeShareState(state: unknown): string | null {
  try {
    return compressToEncodedURIComponent(JSON.stringify(state));
  } catch {
    return null;
  }
}

export function buildShareUrl(
  state: unknown,
  origin: string = typeof window !== "undefined" ? window.location.origin : ""
): string | null {
  const encoded = encodeShareState(state);
  if (!encoded || !origin) return null;
  return `${origin}?s=${encodeURIComponent(encoded)}`;
}

export function decodeShareState<T = unknown>(s: string): T | null {
  try {
    const raw = decompressFromEncodedURIComponent(s);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
