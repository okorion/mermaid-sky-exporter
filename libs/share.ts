import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export function encodeShareState(state: unknown) {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeShareState<T = any>(s: string): T | null {
  try {
    const raw = decompressFromEncodedURIComponent(s);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
