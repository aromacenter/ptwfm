export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ImageValidation =
  | { ok: true }
  | { ok: false; error: "type" | "size" | "empty" };

/** Validates an uploaded image's mime type and byte size. Pure. */
export function validateImageUpload(
  type: string,
  size: number,
): ImageValidation {
  if (size <= 0) return { ok: false, error: "empty" };
  if (!ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "type" };
  }
  if (size > MAX_IMAGE_BYTES) return { ok: false, error: "size" };
  return { ok: true };
}

/**
 * Detects the real image type from the file's magic bytes (so a spoofed
 * Content-Type can't get a non-image stored). Returns null if unrecognised.
 */
export function sniffImageType(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
