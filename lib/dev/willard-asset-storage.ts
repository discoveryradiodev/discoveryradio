import path from "node:path";

export const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_LIBRARY_ASSET_BYTES = 12 * 1024 * 1024;
export const MAX_ORIGINAL_DIMENSION = 4096;
export const MAX_DERIVATIVE_WIDTH = 2048;
export const THUMBNAIL_WIDTH = 480;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ALLOWED_PUBLIC_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export type WillardStorageCapabilities = {
  hasBlobToken: boolean;
  canUploadToBlob: boolean;
  canListBlobAssets: boolean;
  canRegisterPublicAssets: boolean;
};

export type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export function getBlobReadWriteToken(): string {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

export function isBlobStorageConfigured(): boolean {
  return getBlobReadWriteToken().length > 0;
}

export function getWillardStorageCapabilities(): WillardStorageCapabilities {
  const hasBlobToken = isBlobStorageConfigured();
  return {
    hasBlobToken,
    canUploadToBlob: hasBlobToken,
    canListBlobAssets: hasBlobToken,
    canRegisterPublicAssets: true,
  };
}

export function isAllowedUploadMimeType(mimeType: string): boolean {
  const normalized = (mimeType ?? "").trim().toLowerCase();
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(normalized);
}

export function isOversizedWillardAsset(input: {
  sizeBytes?: number;
  width?: number;
  height?: number;
}): boolean {
  const sizeBytes = Number.isFinite(input.sizeBytes) ? Number(input.sizeBytes) : undefined;
  const width = Number.isFinite(input.width) ? Number(input.width) : undefined;
  const height = Number.isFinite(input.height) ? Number(input.height) : undefined;

  if (typeof sizeBytes === "number" && sizeBytes > MAX_LIBRARY_ASSET_BYTES) {
    return true;
  }

  if (typeof width === "number" && width > MAX_ORIGINAL_DIMENSION) {
    return true;
  }

  if (typeof height === "number" && height > MAX_ORIGINAL_DIMENSION) {
    return true;
  }

  // Missing dimensions should not automatically pass for large unknown files.
  if ((typeof width !== "number" || typeof height !== "number") && typeof sizeBytes === "number") {
    return sizeBytes > MAX_LIBRARY_ASSET_BYTES / 2;
  }

  return false;
}

export function sanitizeFilename(filename: string): string {
  const raw = path.basename(filename ?? "").trim().toLowerCase();
  const parts = raw.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".") || "asset";

  const safeBase = base
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBase || "asset"}${extension}`;
}

export function buildBlobUploadPath(filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `willard-assets/${Date.now()}-${safeName}`;
}

export function validateUploadFile(file: File | null): ValidationResult<File> {
  if (!(file instanceof File)) {
    return {
      ok: false,
      error: "No file was provided in the upload request.",
    };
  }

  if (!isAllowedUploadMimeType(file.type)) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed: JPG, JPEG, PNG, WEBP, GIF.",
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      error: "Uploaded file is empty.",
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = Math.round((MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)) * 10) / 10;
    return {
      ok: false,
      error: `File is too large. Maximum size is ${maxMb} MB.`,
    };
  }

  return {
    ok: true,
    data: file,
  };
}

export type ValidatedPublicAssetPath = {
  publicPath: string;
  extension: string;
  filename: string;
  mimeType: string;
};

export function validatePublicAssetPath(inputPath: string): ValidationResult<ValidatedPublicAssetPath> {
  const value = (inputPath ?? "").trim();

  if (!value) {
    return {
      ok: false,
      error: "A public asset path is required.",
    };
  }

  if (!value.startsWith("/")) {
    return {
      ok: false,
      error: "Public asset path must start with '/'.",
    };
  }

  if (value.includes("..")) {
    return {
      ok: false,
      error: "Unsafe path. Parent directory segments are not allowed.",
    };
  }

  if (/\\/.test(value)) {
    return {
      ok: false,
      error: "Unsafe path. Use forward slashes only.",
    };
  }

  if (!/^\/[a-zA-Z0-9/_\-.]+$/.test(value)) {
    return {
      ok: false,
      error: "Unsafe path. Only letters, numbers, '-', '_', '.', and '/' are allowed.",
    };
  }

  const extension = path.extname(value).toLowerCase();
  if (!(ALLOWED_PUBLIC_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      ok: false,
      error: "Unsupported public asset extension. Allowed: .jpg, .jpeg, .png, .webp, .gif.",
    };
  }

  const filename = path.basename(value);
  return {
    ok: true,
    data: {
      publicPath: value,
      extension,
      filename,
      mimeType: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
    },
  };
}
