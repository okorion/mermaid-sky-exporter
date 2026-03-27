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
  baseUrl: string = typeof window !== "undefined" ? window.location.href : "",
): string | null {
  const encoded = encodeShareState(state);
  if (!encoded || !baseUrl) return null;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("s", encoded);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function decodeShareState<T = unknown>(s: string): T | null {
  try {
    const raw = decompressFromEncodedURIComponent(s);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
