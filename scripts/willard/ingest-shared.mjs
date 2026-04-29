import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_ROOT = path.join(ROOT, "public");
const INBOX_ROOT = path.join(PUBLIC_ROOT, "willard-assets-inbox");
const ASSET_ROOT = path.join(PUBLIC_ROOT, "willard-assets");
const STAGING_ROOT = path.join(ASSET_ROOT, "staging");
const MANIFEST_PATH = path.join(ASSET_ROOT, "willard-asset-manifest.json");
const MANIFEST_VERSION = 3;

const IMAGE_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif"]);
const SUPPORTED_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif"]);
const DESIGN_CATEGORIES = new Set(["overlay", "tape", "sticker", "frame", "edge", "callout", "shape", "mask", "module-frame"]);
const TRUSTED_TEXTURE_PROVIDERS = new Set(["ambientcg", "polyhaven"]);

const INBOX_CATEGORY_MAP = {
  textures: { category: "texture", dominantKind: "texture" },
  backgrounds: { category: "background", dominantKind: "texture" },
  overlays: { category: "overlay", dominantKind: "transparent-overlay" },
  tape: { category: "tape", dominantKind: "tape" },
  stickers: { category: "sticker", dominantKind: "sticker" },
  frames: { category: "frame", dominantKind: "frame" },
  edges: { category: "edge", dominantKind: "torn-edge" },
  callouts: { category: "callout", dominantKind: "callout" },
  shapes: { category: "shape", dominantKind: "vector-shape" },
  masks: { category: "mask", dominantKind: "mask" },
  "module-frames": { category: "module-frame", dominantKind: "module-frame" },
  paper: { category: "paper", dominantKind: "paper-texture" },
  mixed: { category: "image", dominantKind: "unknown" },
};

export async function ingestInbox(options = {}) {
  const normalizedOptions = {
    dryRun: Boolean(options.dryRun),
    move: Boolean(options.move),
    limit: Math.max(0, Number(options.limit || 0) || 0),
    category: options.category ? normalizeCategory(String(options.category)) : "",
  };

  await ensurePaths();
  const manifest = await readManifest();
  const existing = await buildExistingState(manifest.assets);
  const files = await scanInboxFiles();

  const now = new Date().toISOString();
  const summary = createSummary({ dryRun: normalizedOptions.dryRun, manifestPath: MANIFEST_PATH });
  summary.filesScanned = files.filesScanned;
  summary.unsupportedSkipped = files.unsupportedFilesSkipped;
  summary.warnings.push(...files.warnings);

  for (const fileInfo of files.validFiles) {
    if (normalizedOptions.limit > 0 && summary.filesStaged >= normalizedOptions.limit) {
      break;
    }

    summary.validFilesFound += 1;

    const mergedMetadata = await buildMetadataForFile(fileInfo);
    const category = normalizeCategory(
      normalizedOptions.category ||
        mergedMetadata.category ||
        defaultCategoryForFolder(fileInfo.inboxTopFolder)
    );
    const dominantKind = normalizeDominantKind(
      mergedMetadata.dominantKind || defaultDominantKindForCategory(category)
    );

    const bytes = await fs.readFile(fileInfo.absolutePath);
    const stageResult = await stageCandidate({
      existing,
      bytes,
      extension: path.extname(fileInfo.absolutePath).toLowerCase(),
      originalFilename: path.basename(fileInfo.absolutePath),
      baseNameHint: path.basename(fileInfo.relativePath, path.extname(fileInfo.absolutePath)),
      metadata: {
        sourceUrl: String(mergedMetadata.sourceUrl || inferSourceUrl(fileInfo)).trim(),
        provider: String(mergedMetadata.provider || "manual-inbox").trim() || "manual-inbox",
        license:
          String(mergedMetadata.license || "Unknown (manual ingestion)").trim() ||
          "Unknown (manual ingestion)",
        licenseUrl:
          String(mergedMetadata.licenseUrl || "https://example.invalid/manual-ingestion").trim() ||
          "https://example.invalid/manual-ingestion",
        author: String(mergedMetadata.author || "Unknown").trim() || "Unknown",
        packName: String(mergedMetadata.packName || "Manual Inbox Pack").trim() || "Manual Inbox Pack",
      },
      category,
      dominantKind,
      importedAt: now,
      noteSeed: String(mergedMetadata.notes || "").trim(),
      dryRun: normalizedOptions.dryRun,
      moveSourcePath: normalizedOptions.move ? fileInfo.absolutePath : "",
    });

    applyStageResultToSummary(summary, stageResult);
    if (stageResult.kind === "staged") {
      manifest.assets.push(stageResult.record);
    }
  }

  if (!normalizedOptions.dryRun && summary.filesStaged > 0) {
    manifest.version = MANIFEST_VERSION;
    await fs.writeFile(
      MANIFEST_PATH,
      JSON.stringify({ version: MANIFEST_VERSION, assets: dedupeManifestAssets(manifest.assets) }, null, 2) + "\n",
      "utf8"
    );
  }

  return summary;
}

export async function pullTrustedTextures(options = {}) {
  const providerInput = String(options.provider || "all-trusted").trim().toLowerCase();
  const providerList =
    providerInput === "all-trusted"
      ? ["ambientcg", "polyhaven"]
      : TRUSTED_TEXTURE_PROVIDERS.has(providerInput)
        ? [providerInput]
        : ["ambientcg", "polyhaven"];

  const categoryInput = String(options.category || "texture").trim().toLowerCase();
  const desiredCount = clampNumber(Number(options.count || 10) || 10, 1, 50);
  const query = textureQueryForCategory(categoryInput);

  await ensurePaths();
  const manifest = await readManifest();
  const existing = await buildExistingState(manifest.assets);

  const now = new Date().toISOString();
  const summary = createSummary({ dryRun: false, manifestPath: MANIFEST_PATH });

  const candidates = [];
  for (const provider of providerList) {
    if (provider === "ambientcg") {
      candidates.push(...(await fetchAmbientCgTextureCandidates(query, desiredCount)));
    }
    if (provider === "polyhaven") {
      candidates.push(...(await fetchPolyHavenTextureCandidates(query, desiredCount)));
    }
  }

  for (const candidate of candidates) {
    if (summary.filesStaged >= desiredCount) {
      break;
    }

    summary.filesScanned += 1;

    const payload = await downloadBytes(candidate.downloadUrl);
    if (!payload) {
      summary.unsupportedSkipped += 1;
      continue;
    }

    const extension = inferImageExtension(candidate.downloadUrl, payload.contentType);
    if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
      summary.unsupportedSkipped += 1;
      continue;
    }

    const mappedCategory = categoryFromTexturePullCategory(categoryInput);
    const dominantKind = mappedCategory === "paper" ? "paper-texture" : "texture";

    const stageResult = await stageCandidate({
      existing,
      bytes: payload.bytes,
      extension,
      originalFilename: candidate.originalFilename,
      baseNameHint: candidate.originalFilename,
      metadata: {
        sourceUrl: candidate.sourceUrl,
        provider: candidate.provider,
        license: candidate.license,
        licenseUrl: candidate.licenseUrl,
        author: candidate.author,
        packName: `Trusted ${candidate.provider} pull`,
      },
      category: mappedCategory,
      dominantKind,
      importedAt: now,
      noteSeed: "Pulled from trusted texture provider.",
      dryRun: false,
      moveSourcePath: "",
    });

    applyStageResultToSummary(summary, stageResult);
    if (stageResult.kind === "staged") {
      manifest.assets.push(stageResult.record);
    }
  }

  if (summary.filesStaged > 0) {
    manifest.version = MANIFEST_VERSION;
    await fs.writeFile(
      MANIFEST_PATH,
      JSON.stringify({ version: MANIFEST_VERSION, assets: dedupeManifestAssets(manifest.assets) }, null, 2) + "\n",
      "utf8"
    );
  }

  return summary;
}

function createSummary({ dryRun, manifestPath }) {
  return {
    mode: dryRun ? "dry-run" : "real-run",
    filesScanned: 0,
    validFilesFound: 0,
    filesStaged: 0,
    duplicatesSkipped: 0,
    unsupportedSkipped: 0,
    noAlphaFlagged: 0,
    countsByCategory: {},
    countsByDominantKind: {},
    countsByProvider: {},
    manifestPath,
    warnings: [],
  };
}

function applyStageResultToSummary(summary, stageResult) {
  if (stageResult.kind === "duplicate") {
    summary.duplicatesSkipped += 1;
    return;
  }
  if (stageResult.kind === "unsupported") {
    summary.unsupportedSkipped += 1;
    if (stageResult.warning) {
      summary.warnings.push(stageResult.warning);
    }
    return;
  }
  if (stageResult.kind !== "staged") {
    return;
  }

  summary.filesStaged += 1;
  summary.validFilesFound += 1;
  summary.countsByCategory[stageResult.record.category] =
    (summary.countsByCategory[stageResult.record.category] || 0) + 1;
  summary.countsByDominantKind[stageResult.record.dominantKind || "unknown"] =
    (summary.countsByDominantKind[stageResult.record.dominantKind || "unknown"] || 0) + 1;
  summary.countsByProvider[stageResult.record.provider || "unknown"] =
    (summary.countsByProvider[stageResult.record.provider || "unknown"] || 0) + 1;

  if (String(stageResult.record.curatorNotes || "").includes("No alpha detected;")) {
    summary.noAlphaFlagged += 1;
  }
}

async function stageCandidate({
  existing,
  bytes,
  extension,
  originalFilename,
  baseNameHint,
  metadata,
  category,
  dominantKind,
  importedAt,
  noteSeed,
  dryRun,
  moveSourcePath,
}) {
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return { kind: "unsupported" };
  }

  const hash = createSha256(bytes);
  const sourceUrl = normalizeUrl(metadata.sourceUrl);
  if (existing.byHash.has(hash)) {
    return { kind: "duplicate" };
  }
  if (sourceUrl && existing.bySourceUrl.has(sourceUrl)) {
    return { kind: "duplicate" };
  }

  const inspection = inspectImage(bytes, extension);
  const noAlphaDesign =
    DESIGN_CATEGORIES.has(category) && extension !== ".svg" && inspection.hasAlpha === false;

  const notes = [];
  if (noteSeed) {
    notes.push(noteSeed);
  }
  if (noAlphaDesign) {
    notes.push("No alpha detected; verify this is a usable design element and not a photo/background.");
  }

  const baseName = sanitizeFilenameBase(baseNameHint || originalFilename || `asset-${Date.now()}`);
  const target = await allocateStagingTarget(baseName, extension, hash, existing.byLocalPath);
  if (!target) {
    return { kind: "duplicate" };
  }

  if (!dryRun) {
    await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
    if (moveSourcePath) {
      await fs.rename(moveSourcePath, target.absolutePath);
    } else {
      await fs.writeFile(target.absolutePath, bytes);
    }
  }

  const hasAlpha = typeof inspection.hasAlpha === "boolean" ? inspection.hasAlpha : "unknown";
  const record = {
    sourceUrl,
    provider: String(metadata.provider || "manual").trim() || "manual",
    license: String(metadata.license || "Unknown").trim() || "Unknown",
    licenseUrl: String(metadata.licenseUrl || "").trim(),
    author: String(metadata.author || "Unknown").trim() || "Unknown",
    packName: String(metadata.packName || "Manual Inbox Pack").trim() || "Manual Inbox Pack",
    localPath: target.publicPath,
    filename: path.basename(target.publicPath),
    originalFilename: originalFilename || path.basename(target.publicPath),
    importedAt,
    createdAt: importedAt,
    category,
    suggestedCategory: category,
    status: "staging",
    reviewRequired: true,
    width: inspection.width,
    height: inspection.height,
    hasAlpha,
    dominantKind,
    hash,
    curatorNotes: notes.length > 0 ? notes.join(" ") : undefined,
  };

  existing.byHash.add(hash);
  if (sourceUrl) {
    existing.bySourceUrl.add(sourceUrl);
  }
  existing.byLocalPath.add(normalizePublicPath(target.publicPath));

  return { kind: "staged", record };
}

async function ensurePaths() {
  await fs.mkdir(INBOX_ROOT, { recursive: true });
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  await fs.mkdir(STAGING_ROOT, { recursive: true });

  try {
    await fs.access(MANIFEST_PATH);
  } catch {
    await fs.writeFile(MANIFEST_PATH, JSON.stringify({ version: MANIFEST_VERSION, assets: [] }, null, 2) + "\n", "utf8");
  }
}

async function readManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { version: Number(parsed?.version || MANIFEST_VERSION), assets: Array.isArray(parsed?.assets) ? parsed.assets : [] };
  } catch {
    return { version: MANIFEST_VERSION, assets: [] };
  }
}

async function buildExistingState(assets) {
  const byHash = new Set();
  const bySourceUrl = new Set();
  const byLocalPath = new Set();

  for (const item of assets) {
    const hash = String(item.hash || "").trim().toLowerCase();
    if (hash) {
      byHash.add(hash);
    }

    const sourceUrl = normalizeUrl(item.sourceUrl);
    if (sourceUrl) {
      bySourceUrl.add(sourceUrl);
    }

    const localPath = normalizePublicPath(item.localPath);
    if (localPath) {
      byLocalPath.add(localPath);
    }
  }

  return { byHash, bySourceUrl, byLocalPath };
}

async function scanInboxFiles() {
  const validFiles = [];
  let filesScanned = 0;
  let unsupportedFilesSkipped = 0;
  let zipFilesFound = 0;
  const warnings = [];

  const nested = await listFilesRecursive(INBOX_ROOT);
  for (const filePath of nested) {
    const basename = path.basename(filePath).toLowerCase();
    if (basename.startsWith(".")) {
      continue;
    }
    if (basename === "asset-pack.json") {
      continue;
    }

    filesScanned += 1;
    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(INBOX_ROOT, filePath);
    const relPosix = relativePath.split(path.sep).join("/");

    if (ext === ".zip") {
      zipFilesFound += 1;
      unsupportedFilesSkipped += 1;
      continue;
    }

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      unsupportedFilesSkipped += 1;
      continue;
    }

    if (ext === ".gif" && !IMAGE_EXTENSIONS.has(".gif")) {
      warnings.push(`Skipping GIF (not supported): ${relPosix}`);
      unsupportedFilesSkipped += 1;
      continue;
    }

    const topFolder = relPosix.split("/")[0] || "";
    validFiles.push({
      absolutePath: filePath,
      relativePath: relPosix,
      inboxTopFolder: topFolder,
    });
  }

  if (zipFilesFound > 0) {
    warnings.push("Unzip packs into public/willard-assets-inbox first.");
    warnings.push(`Zip files detected: ${zipFilesFound}`);
  }

  return { validFiles, filesScanned, unsupportedFilesSkipped, warnings };
}

async function listFilesRecursive(startPath) {
  const output = [];
  let entries = [];
  try {
    entries = await fs.readdir(startPath, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    const abs = path.join(startPath, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await listFilesRecursive(abs)));
      continue;
    }
    if (entry.isFile()) {
      output.push(abs);
    }
  }

  return output;
}

async function buildMetadataForFile(fileInfo) {
  const metadataChain = await readMetadataChainForFile(fileInfo.absolutePath);
  const merged = mergeMetadataChain(metadataChain);

  const filesMap = merged.files && typeof merged.files === "object" ? merged.files : null;
  if (filesMap) {
    const basename = path.basename(fileInfo.absolutePath);
    const override = filesMap[basename] || filesMap[fileInfo.relativePath];
    if (override && typeof override === "object") {
      return { ...merged, ...override };
    }
  }

  return merged;
}

async function readMetadataChainForFile(filePath) {
  const chain = [];
  let current = path.dirname(filePath);
  const inboxRoot = path.resolve(INBOX_ROOT);

  while (current.toLowerCase().startsWith(inboxRoot.toLowerCase())) {
    const sidecar = path.join(current, "asset-pack.json");
    const json = await readJsonIfExists(sidecar);
    if (json && typeof json === "object") {
      chain.push(json);
    }

    if (current.toLowerCase() === inboxRoot.toLowerCase()) {
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  chain.reverse();
  return chain;
}

function mergeMetadataChain(chain) {
  const merged = {};
  for (const item of chain) {
    if (!item || typeof item !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(item)) {
      if (key === "files") {
        merged.files = { ...(merged.files || {}), ...(typeof value === "object" && value ? value : {}) };
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function defaultCategoryForFolder(folderName) {
  const normalized = String(folderName || "").trim().toLowerCase();
  return INBOX_CATEGORY_MAP[normalized]?.category || inferCategoryByName(normalized) || "image";
}

function defaultDominantKindForCategory(category) {
  switch (category) {
    case "texture":
      return "texture";
    case "paper":
    case "background":
      return "paper-texture";
    case "overlay":
      return "transparent-overlay";
    case "tape":
      return "tape";
    case "sticker":
      return "sticker";
    case "frame":
      return "frame";
    case "edge":
      return "torn-edge";
    case "callout":
      return "callout";
    case "shape":
      return "vector-shape";
    case "mask":
      return "mask";
    case "module-frame":
      return "module-frame";
    default:
      return "unknown";
  }
}

function normalizeCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "texture":
    case "background":
    case "overlay":
    case "tape":
    case "sticker":
    case "frame":
    case "edge":
    case "callout":
    case "shape":
    case "mask":
    case "module-frame":
    case "paper":
    case "image":
      return normalized;
    default:
      return inferCategoryByName(normalized) || "image";
  }
}

function inferCategoryByName(name) {
  if (!name) return "";
  if (/(texture|paper|grain|noise|grunge)/.test(name)) return "texture";
  if (/(background|bg)/.test(name)) return "background";
  if (/(overlay|dust|scratch)/.test(name)) return "overlay";
  if (/(tape)/.test(name)) return "tape";
  if (/(sticker|label)/.test(name)) return "sticker";
  if (/(frame|border)/.test(name)) return "frame";
  if (/(edge|torn|deckle|ripped)/.test(name)) return "edge";
  if (/(callout|speech|bubble|arrow)/.test(name)) return "callout";
  if (/(shape|vector|starburst|burst)/.test(name)) return "shape";
  if (/(mask|cutout)/.test(name)) return "mask";
  if (/(module-frame|module)/.test(name)) return "module-frame";
  return "";
}

function normalizeDominantKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "texture":
    case "paper-texture":
    case "transparent-overlay":
    case "torn-edge":
    case "frame":
    case "tape":
    case "sticker":
    case "pattern":
    case "vector-shape":
    case "callout":
    case "mask":
    case "module-frame":
    case "unknown":
      return normalized;
    default:
      return "unknown";
  }
}

function inferSourceUrl(fileInfo) {
  return `inbox://local/${fileInfo.relativePath}`;
}

async function allocateStagingTarget(baseName, extension, hash, existingLocalPaths) {
  const hashSuffix = hash.slice(0, 8);
  for (let index = 0; index < 500; index += 1) {
    const filename =
      index === 0 ? `${baseName}-${hashSuffix}${extension}` : `${baseName}-${hashSuffix}-${index}${extension}`;
    const publicPath = `/willard-assets/staging/${filename}`;
    const normalized = normalizePublicPath(publicPath);
    if (existingLocalPaths.has(normalized)) {
      continue;
    }

    const absolutePath = path.join(PUBLIC_ROOT, publicPath.slice(1).replace(/\//g, path.sep));
    try {
      await fs.access(absolutePath);
      continue;
    } catch {
      return { absolutePath, publicPath };
    }
  }
  return null;
}

function dedupeManifestAssets(assets) {
  const seenLocal = new Set();
  const seenHash = new Set();
  const deduped = [];

  for (const asset of assets) {
    const localPath = normalizePublicPath(asset.localPath);
    const hash = String(asset.hash || "").trim().toLowerCase();
    if (localPath && seenLocal.has(localPath)) {
      continue;
    }
    if (hash && seenHash.has(hash)) {
      continue;
    }
    if (localPath) seenLocal.add(localPath);
    if (hash) seenHash.add(hash);
    deduped.push(asset);
  }

  return deduped;
}

function normalizeUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    if (input.startsWith("inbox://") || input.startsWith("repo://")) {
      return input;
    }
    return "";
  }
}

function normalizePublicPath(value) {
  const input = String(value || "").trim().replace(/\\/g, "/");
  if (!input) return "";
  const normalized = input.startsWith("/") ? input : `/${input}`;
  if (!normalized.startsWith("/willard-assets/")) return "";
  return normalized.toLowerCase();
}

function createSha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sanitizeFilenameBase(name) {
  const raw = String(name || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return raw || `asset-${Date.now()}`;
}

function inspectImage(buffer, extension) {
  if (extension === ".png") return inspectPng(buffer);
  if (extension === ".jpg" || extension === ".jpeg") return inspectJpeg(buffer);
  if (extension === ".gif") return inspectGif(buffer);
  if (extension === ".webp") return inspectWebp(buffer);
  if (extension === ".svg") return inspectSvg(buffer);
  return { width: undefined, height: undefined, hasAlpha: undefined };
}

function inspectPng(buffer) {
  if (buffer.length < 33 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return { width: undefined, height: undefined, hasAlpha: undefined };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  let hasAlpha = colorType === 4 || colorType === 6;
  if (!hasAlpha) {
    hasAlpha = buffer.includes(Buffer.from("tRNS", "ascii"));
  }
  return { width, height, hasAlpha };
}

function inspectJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { width: undefined, height: undefined, hasAlpha: false };
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 8 < buffer.length) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        hasAlpha: false,
      };
    }
    if (length <= 2) break;
    offset += 2 + length;
  }
  return { width: undefined, height: undefined, hasAlpha: false };
}

function inspectGif(buffer) {
  if (buffer.length < 10 || (buffer.toString("ascii", 0, 6) !== "GIF89a" && buffer.toString("ascii", 0, 6) !== "GIF87a")) {
    return { width: undefined, height: undefined, hasAlpha: undefined };
  }
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), hasAlpha: true };
}

function inspectWebp(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return { width: undefined, height: undefined, hasAlpha: undefined };
  }
  const type = buffer.toString("ascii", 12, 16);
  const hasAlpha = buffer.includes(Buffer.from("ALPH", "ascii"));
  if (type === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      hasAlpha,
    };
  }
  return { width: undefined, height: undefined, hasAlpha: hasAlpha || undefined };
}

function inspectSvg(buffer) {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 8000));
  const widthMatch = text.match(/\bwidth\s*=\s*"([0-9.]+)/i);
  const heightMatch = text.match(/\bheight\s*=\s*"([0-9.]+)/i);
  const viewBoxMatch = text.match(/\bviewBox\s*=\s*"([^"]+)"/i);

  let width = widthMatch ? Number(widthMatch[1]) : undefined;
  let height = heightMatch ? Number(heightMatch[1]) : undefined;

  if ((!width || !height) && viewBoxMatch) {
    const values = viewBoxMatch[1].trim().split(/\s+/).map((value) => Number(value));
    if (values.length === 4 && Number.isFinite(values[2]) && Number.isFinite(values[3])) {
      width = values[2];
      height = values[3];
    }
  }

  const fullRect = detectFullBackgroundRect(text, width, height);
  return {
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
    hasAlpha: fullRect ? false : true,
  };
}

function detectFullBackgroundRect(text, width, height) {
  if (!width || !height) {
    return false;
  }
  const rects = [...text.matchAll(/<rect\b[^>]*\bwidth="([^"]+)"[^>]*\bheight="([^"]+)"[^>]*>/gi)];
  for (const match of rects) {
    const rectWidth = Number(match[1]);
    const rectHeight = Number(match[2]);
    if (!Number.isFinite(rectWidth) || !Number.isFinite(rectHeight)) {
      continue;
    }
    if (Math.abs(rectWidth - width) < 0.01 && Math.abs(rectHeight - height) < 0.01) {
      return true;
    }
  }
  return false;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function textureQueryForCategory(category) {
  switch (category) {
    case "paper":
      return "paper texture";
    case "cardboard":
      return "cardboard texture";
    case "concrete":
      return "concrete texture";
    case "fabric":
      return "fabric texture";
    case "grunge":
      return "grunge texture";
    default:
      return "texture";
  }
}

function categoryFromTexturePullCategory(category) {
  if (category === "paper" || category === "cardboard") {
    return "paper";
  }
  return "texture";
}

async function fetchAmbientCgTextureCandidates(query, count) {
  const endpoint = `https://ambientcg.com/api/v2/full_json?include=downloadData,previewData&type=PhotoTexture&limit=${Math.max(10, count * 3)}&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return [];
    const payload = await response.json();
    const assets = Array.isArray(payload?.foundAssets)
      ? payload.foundAssets
      : payload?.foundAssets && typeof payload.foundAssets === "object"
        ? Object.values(payload.foundAssets)
        : [];

    const out = [];
    for (const item of assets) {
      if (out.length >= count * 2) break;
      const downloadUrl = selectBestImageUrl(collectImageUrls(item));
      if (!downloadUrl) continue;
      const providerAssetId = String(item.assetId || item.id || item.assetName || "ambientcg");
      out.push({
        provider: "ambientcg",
        sourceUrl: String(item.assetUrl || `https://ambientcg.com/view?id=${encodeURIComponent(providerAssetId)}`),
        downloadUrl,
        originalFilename: guessFilename(downloadUrl, providerAssetId),
        author: String(item.author || "ambientCG"),
        license: String(item.license || item.licenseType || "CC0"),
        licenseUrl: String(item.licenseUrl || "https://creativecommons.org/publicdomain/zero/1.0/"),
      });
    }
    return out;
  } catch {
    return [];
  }
}

let polyHavenAssetIndex = null;

async function fetchPolyHavenTextureCandidates(query, count) {
  try {
    if (!polyHavenAssetIndex) {
      const response = await fetch("https://api.polyhaven.com/assets?t=textures");
      if (!response.ok) return [];
      polyHavenAssetIndex = await response.json();
    }

    const tokens = String(query || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const matches = Object.entries(polyHavenAssetIndex)
      .map(([id, meta]) => ({ id, meta }))
      .filter(({ id, meta }) => {
        const haystack = [id, String(meta?.name || ""), ...(meta?.tags || []), ...(meta?.categories || [])]
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, count * 3);

    const out = [];
    for (const { id, meta } of matches) {
      if (out.length >= count * 2) break;
      const fileResp = await fetch(`https://api.polyhaven.com/files/${encodeURIComponent(id)}`);
      if (!fileResp.ok) continue;
      const files = await fileResp.json();
      const downloadUrl = selectBestImageUrl(collectImageUrls(files));
      if (!downloadUrl) continue;
      out.push({
        provider: "polyhaven",
        sourceUrl: `https://polyhaven.com/a/${encodeURIComponent(id)}`,
        downloadUrl,
        originalFilename: guessFilename(downloadUrl, id),
        author: meta?.authors && typeof meta.authors === "object" ? Object.keys(meta.authors).join(", ") || "Poly Haven" : "Poly Haven",
        license: "CC0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function downloadBytes(url) {
  const source = String(url || "").trim();
  if (!source) return null;
  try {
    const response = await fetch(source, { headers: { "User-Agent": "WillardTexturePull/1.0" } });
    if (!response.ok) return null;
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: String(response.headers.get("content-type") || ""),
    };
  } catch {
    return null;
  }
}

function inferImageExtension(urlValue, contentType) {
  const normalizedType = String(contentType || "").toLowerCase();
  if (normalizedType.includes("image/png")) return ".png";
  if (normalizedType.includes("image/webp")) return ".webp";
  if (normalizedType.includes("image/jpeg") || normalizedType.includes("image/jpg")) return ".jpg";
  if (normalizedType.includes("image/gif")) return ".gif";
  if (normalizedType.includes("image/svg")) return ".svg";

  const extension = path.extname(safePathname(urlValue)).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(extension) ? extension : "";
}

function collectImageUrls(value, collector = new Set()) {
  if (!value) return [...collector];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      const ext = path.extname(safePathname(trimmed)).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) collector.add(trimmed);
    }
    return [...collector];
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, collector);
    return [...collector];
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectImageUrls(item, collector);
  }
  return [...collector];
}

function selectBestImageUrl(urls) {
  const unique = urls
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  unique.sort((a, b) => extensionRank(path.extname(safePathname(a)).toLowerCase()) - extensionRank(path.extname(safePathname(b)).toLowerCase()));
  return unique[0] || "";
}

function extensionRank(extension) {
  const ordered = [".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif"];
  const index = ordered.indexOf(extension);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function safePathname(urlValue) {
  try {
    return new URL(String(urlValue || "")).pathname;
  } catch {
    return String(urlValue || "");
  }
}

function guessFilename(urlValue, fallbackBase) {
  const filename = path.basename(safePathname(urlValue || ""));
  return filename || `${fallbackBase}.png`;
}
