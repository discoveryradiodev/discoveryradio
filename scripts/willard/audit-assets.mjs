#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const WILLARD_ROOT = path.join(ROOT, "public", "willard-assets");
const MANIFEST_PATH = path.join(WILLARD_ROOT, "willard-asset-manifest.json");
const WILLARD_INBOX_ROOT = path.join(ROOT, "public", "willard-assets-inbox");
const MAX_LIBRARY_ASSET_BYTES = 12 * 1024 * 1024;
const MAX_ORIGINAL_DIMENSION = 4096;
const STRICT_LOCAL = process.argv.includes("--strict-local");
const GENERATED_SOURCE_FILES = [
  path.join(ROOT, "app", "the-feed", "willard.generated.css"),
  path.join(ROOT, "app", "the-feed", "willard.generated.images.ts"),
];

const FOLDERS = [
  "backgrounds",
  "overlays",
  "textures",
  "tape",
  "stickers",
  "frames",
  "paper",
  "shapes",
  "masks",
  "edges",
  "callouts",
  "module-frames",
  "staging",
];
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const STATUS_VALUES = ["approved", "staging", "denied", "rejected", "demo"];
const DOMINANT_VALUES = [
  "texture",
  "paper-texture",
  "transparent-overlay",
  "torn-edge",
  "frame",
  "tape",
  "sticker",
  "pattern",
  "vector-shape",
  "callout",
  "mask",
  "module-frame",
  "unknown",
];

async function main() {
  const manifest = await readManifest();
  const filesOnDisk = await scanPublicAssetFiles();
  const trackedFiles = getTrackedFilesSet();
  const ignoredFiles = getIgnoredFilesSet(["public/willard-assets/staging", "public/willard-assets/textures"]);

  const duplicatesBySource = findDuplicates(manifest.assets, (row) => normalizeUrl(row.sourceUrl));
  const duplicatesByLocalPath = findDuplicates(manifest.assets, (row) => normalizePublicPath(row.localPath));

  const missingFiles = manifest.assets
    .map((row) => ({ row, normalizedPath: normalizePublicPath(row.localPath) }))
    .filter((item) => item.normalizedPath)
    .filter((item) => !filesOnDisk.has(item.normalizedPath))
    .map((item) => item.row);

  const unmanifestedFiles = [...filesOnDisk].filter((diskPath) => {
    return !manifest.assets.some((row) => normalizePublicPath(row.localPath) === diskPath);
  });

  const publicImageMetrics = await collectPublicImageMetrics(filesOnDisk, trackedFiles, ignoredFiles);
  const oversizedTrackedFiles = findOversizedTrackedPublicFiles(publicImageMetrics);
  const trackedOversizedDimensionFiles = findTrackedOversizedDimensionFiles(publicImageMetrics);
  const localOversizedStagingTextureFiles = findLocalOversizedStagingTextureFiles(publicImageMetrics);
  const oversizedMap = new Map(publicImageMetrics.map((row) => [row.path, row]));
  const approvedInStaging = manifest.assets.filter(
    (row) => normalizeStatus(row.status) === "approved" && /\/staging\//i.test(String(row.localPath || ""))
  );
  const approvedInOriginals = manifest.assets.filter(
    (row) => normalizeStatus(row.status) === "approved" && /\/originals\//i.test(String(row.localPath || ""))
  );
  const generatedSourceScan = await scanGeneratedSourceGuardrails();
  const generatedSourceGuardrailHits = generatedSourceScan.hits;
  const generatedSourceText = generatedSourceScan.sourceText;

  const approvedOversizedWithoutOptimized = manifest.assets.filter((row) => {
    if (normalizeStatus(row.status) !== "approved") {
      return false;
    }
    if (!row.oversizedOriginal) {
      return false;
    }
    return !hasOptimizedDerivative(row);
  });

  const approvedDisplayRawOversized = manifest.assets.filter((row) => {
    if (normalizeStatus(row.status) !== "approved") {
      return false;
    }

    const localPath = normalizePublicPath(row.localPath);
    if (!localPath) {
      return false;
    }

    const displayPath = resolveDisplayPath(row);
    if (!displayPath) {
      return false;
    }

    const displayMetric = oversizedMap.get(displayPath);
    if (!displayMetric || !displayMetric.isOversizedDimension) {
      return false;
    }

    return displayPath === localPath;
  });

  const localQuarantineNotices = localOversizedStagingTextureFiles.filter((row) => {
    if (!row.isIgnored) {
      return false;
    }
    const referencedByApproved = manifest.assets.some(
      (entry) => normalizeStatus(entry.status) === "approved" && normalizePublicPath(entry.localPath) === row.path
    );
    const referencedByGeneratedSource = generatedSourceText.includes(row.path);
    return !referencedByApproved && !referencedByGeneratedSource;
  });

  const warningLocalOversized = localOversizedStagingTextureFiles.filter((row) => {
    return !localQuarantineNotices.some((notice) => notice.path === row.path);
  });

  const oversizedInboxFiles = await findOversizedInboxFiles();

  const optionalOptimizationWarnings = manifest.assets.filter((row) => {
    if (normalizeStatus(row.status) === "approved") {
      return false;
    }
    const localPath = normalizePublicPath(row.localPath);
    if (!localPath) {
      return false;
    }
    if (generatedSourceText.includes(localPath)) {
      return false;
    }
    if (!row.oversizedOriginal) {
      return false;
    }
    return !hasAnyOptimizationMetadata(row);
  });

  const invalidMetadata = manifest.assets.filter((row) => {
    return !row.localPath || !row.filename;
  });

  const filesMissingDimensions = manifest.assets.filter(
    (row) => !Number.isFinite(row.width) || !Number.isFinite(row.height)
  );

  const filesWithoutLicenseMetadata = manifest.assets.filter(
    (row) => !String(row.license || "").trim() || !String(row.licenseUrl || "").trim()
  );

  const approvedMissingSourceMetadata = manifest.assets.filter((row) => {
    return (
      normalizeStatus(row.status) === "approved" &&
      (!String(row.sourceUrl || "").trim() || !String(row.provider || "").trim() || !String(row.license || "").trim())
    );
  });

  const reviewRequired = manifest.assets.filter((row) => Boolean(row.reviewRequired));
  const newestStaging = manifest.assets
    .filter((row) => normalizeStatus(row.status) === "staging" || row.reviewRequired)
    .sort((a, b) => timestampValue(b.createdAt || b.importedAt) - timestampValue(a.createdAt || a.importedAt));

  const visibleInDefault = manifest.assets.filter((row) => isVisibleInDefaultLibrary(row));
  const hiddenFromDefault = manifest.assets.filter((row) => !isVisibleInDefaultLibrary(row));

  const countsByStatus = tally(manifest.assets, (row) => normalizeStatus(row.status));
  const countsByCategory = tally(manifest.assets, (row) => String(row.category || "image"));
  const countsByProvider = tally(manifest.assets, (row) => String(row.provider || "unknown"));
  const countsByDominantKind = tally(manifest.assets, (row) => normalizeDominantKind(row.dominantKind));

  printSummary({
    manifest,
    filesOnDisk,
    duplicatesBySource,
    duplicatesByLocalPath,
    missingFiles,
    unmanifestedFiles,
    invalidMetadata,
    reviewRequired,
    countsByStatus,
    countsByCategory,
    countsByProvider,
    countsByDominantKind,
    filesMissingDimensions,
    filesWithoutLicenseMetadata,
    approvedMissingSourceMetadata,
    visibleInDefault,
    hiddenFromDefault,
    newestStaging,
    oversizedTrackedFiles,
    trackedOversizedDimensionFiles,
    warningLocalOversized,
    localQuarantineNotices,
    oversizedInboxFiles,
    optionalOptimizationWarnings,
    approvedInStaging,
    approvedInOriginals,
    generatedSourceGuardrailHits,
    approvedOversizedWithoutOptimized,
    approvedDisplayRawOversized,
    strictLocal: STRICT_LOCAL,
  });

  const approvedCount = countsByStatus.get("approved") || 0;
  const approvedOverlaySetCount =
    countIf(manifest.assets, (row) => normalizeStatus(row.status) === "approved" && ["overlay", "tape", "sticker", "frame"].includes(String(row.category || "")));

  const shapeCategories = new Set(["shape", "callout", "edge", "module-frame"]);
  const approvedShapeCount = countIf(
    manifest.assets,
    (row) => normalizeStatus(row.status) === "approved" && shapeCategories.has(String(row.category || ""))
  );

  if (approvedCount < 50) {
    console.warn(`WARNING: approved assets < 50 (current: ${approvedCount}).`);
  }
  if (approvedOverlaySetCount < 20) {
    console.warn(`WARNING: approved overlays/tape/stickers/frames < 20 (current: ${approvedOverlaySetCount}).`);
  }

  const shapePackExists = approvedShapeCount > 0 || (await pathExists(path.join(WILLARD_ROOT, "shapes")));
  if (shapePackExists && approvedShapeCount < 50) {
    console.warn(`WARNING: approved shapes/callouts/edges/module-frames < 50 (current: ${approvedShapeCount}).`);
  }

  const blockingErrors =
    oversizedTrackedFiles.length > 0 ||
    trackedOversizedDimensionFiles.length > 0 ||
    approvedInStaging.length > 0 ||
    approvedInOriginals.length > 0 ||
    generatedSourceGuardrailHits.length > 0 ||
    approvedOversizedWithoutOptimized.length > 0 ||
    approvedDisplayRawOversized.length > 0;

  const warningsCount = warningLocalOversized.length + oversizedInboxFiles.length + optionalOptimizationWarnings.length;
  const quarantineCount = localQuarantineNotices.length;
  const strictLocalBlocking = STRICT_LOCAL ? warningsCount + quarantineCount : 0;

  const blockingCount =
    oversizedTrackedFiles.length +
    trackedOversizedDimensionFiles.length +
    approvedInStaging.length +
    approvedInOriginals.length +
    generatedSourceGuardrailHits.length +
    approvedOversizedWithoutOptimized.length +
    approvedDisplayRawOversized.length +
    strictLocalBlocking;

  console.log(`\nBlocking errors: ${blockingCount}`);
  console.log(`Warnings: ${warningsCount}`);
  console.log(`Local quarantine notices: ${quarantineCount}`);

  if (STRICT_LOCAL && strictLocalBlocking > 0) {
    console.log(`STRICT LOCAL MODE: promoting local warnings/quarantine notices to blocking errors.`);
  }

  process.exitCode = blockingCount > 0 ? 1 : 0;
}

async function readManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const assets = Array.isArray(parsed?.assets) ? parsed.assets.map(migrateEntry) : [];
    return { version: Number(parsed?.version || 3), assets };
  } catch {
    return { version: 3, assets: [] };
  }
}

function migrateEntry(entry) {
  const status = normalizeStatus(entry?.status, "staging");
  return {
    ...entry,
    status,
    reviewRequired: typeof entry?.reviewRequired === "boolean" ? entry.reviewRequired : status !== "approved",
    dominantKind: normalizeDominantKind(entry?.dominantKind),
  };
}

async function scanPublicAssetFiles() {
  const files = new Set();

  for (const folder of FOLDERS) {
    const abs = path.join(WILLARD_ROOT, folder);
    const nested = await listImageFilesRecursive(abs);
    for (const filePath of nested) {
      const rel = path.relative(WILLARD_ROOT, filePath).replace(/\\/g, "/");
      files.add(`/${path.posix.join("willard-assets", rel)}`.toLowerCase());
    }
  }

  return files;
}

async function listImageFilesRecursive(startPath) {
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
      output.push(...(await listImageFilesRecursive(abs)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }
    output.push(abs);
  }

  return output;
}

function tally(rows, keySelector) {
  const map = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function findDuplicates(rows, keySelector) {
  const seen = new Map();
  const duplicates = [];

  for (const row of rows) {
    const key = keySelector(row);
    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      duplicates.push({ key, first: seen.get(key), duplicate: row });
    } else {
      seen.set(key, row);
    }
  }

  return duplicates;
}

function normalizeUrl(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  try {
    const parsed = new URL(input);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizePublicPath(value) {
  const input = String(value || "").trim().replace(/\\/g, "/");
  if (!input) {
    return "";
  }

  const normalized = input.startsWith("/") ? input : `/${input}`;
  if (!normalized.startsWith("/willard-assets/")) {
    return "";
  }

  return normalized.toLowerCase();
}

function normalizeStatus(value, fallback = "staging") {
  const normalized = String(value || "").trim().toLowerCase();
  if (STATUS_VALUES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeDominantKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (DOMINANT_VALUES.includes(normalized)) {
    return normalized;
  }
  return "unknown";
}

function countIf(rows, predicate) {
  let count = 0;
  for (const row of rows) {
    if (predicate(row)) {
      count += 1;
    }
  }
  return count;
}

function isVisibleInDefaultLibrary(row) {
  return normalizeStatus(row.status) === "approved";
}

function timestampValue(value) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function printMap(title, map) {
  console.log(`\n${title}:`);
  if (map.size === 0) {
    console.log("- none");
    return;
  }
  for (const [key, count] of map.entries()) {
    console.log(`- ${key}: ${count}`);
  }
}

function printSummary({
  manifest,
  filesOnDisk,
  duplicatesBySource,
  duplicatesByLocalPath,
  missingFiles,
  unmanifestedFiles,
  invalidMetadata,
  reviewRequired,
  countsByStatus,
  countsByCategory,
  countsByProvider,
  countsByDominantKind,
  filesMissingDimensions,
  filesWithoutLicenseMetadata,
  approvedMissingSourceMetadata,
  visibleInDefault,
  hiddenFromDefault,
  newestStaging,
  oversizedTrackedFiles,
  trackedOversizedDimensionFiles,
  warningLocalOversized,
  localQuarantineNotices,
  oversizedInboxFiles,
  optionalOptimizationWarnings,
  approvedInStaging,
  approvedInOriginals,
  generatedSourceGuardrailHits,
  approvedOversizedWithoutOptimized,
  approvedDisplayRawOversized,
  strictLocal,
}) {
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Manifest version: ${manifest.version}`);
  console.log(`Manifest assets: ${manifest.assets.length}`);
  console.log(`Image files on disk: ${filesOnDisk.size}`);

  console.log(`\napproved count: ${countsByStatus.get("approved") || 0}`);
  console.log(`staging count: ${countsByStatus.get("staging") || 0}`);
  console.log(`denied count: ${countsByStatus.get("denied") || 0}`);
  console.log(`rejected count: ${countsByStatus.get("rejected") || 0}`);
  console.log(`demo count: ${countsByStatus.get("demo") || 0}`);
  console.log(`reviewRequired count: ${reviewRequired.length}`);
  console.log(`approved visible asset count: ${visibleInDefault.length}`);
  console.log(`staging/review queue count: ${newestStaging.length}`);

  printMap("count by category", countsByCategory);
  printMap("count by provider", countsByProvider);
  printMap("count by dominantKind", countsByDominantKind);

  console.log(`\nnewest staging items:`);
  if (newestStaging.length === 0) {
    console.log("- none");
  } else {
    for (const row of newestStaging.slice(0, 20)) {
      const when = row.createdAt || row.importedAt || "unknown-time";
      console.log(`- ${row.localPath || "(missing localPath)"} @ ${when}`);
    }
  }

  console.log(`\nfiles missing dimensions: ${filesMissingDimensions.length}`);
  for (const row of filesMissingDimensions.slice(0, 20)) {
    console.log(`- ${row.localPath || "(missing localPath)"}`);
  }

  console.log(`\nfiles without license metadata: ${filesWithoutLicenseMetadata.length}`);
  for (const row of filesWithoutLicenseMetadata.slice(0, 20)) {
    console.log(`- ${row.localPath || "(missing localPath)"}`);
  }

  console.log(`\napproved assets with missing source/license metadata: ${approvedMissingSourceMetadata.length}`);
  for (const row of approvedMissingSourceMetadata.slice(0, 20)) {
    console.log(`- ${row.localPath || "(missing localPath)"}`);
  }

  console.log(`\nfiles visible in Asset Library: ${visibleInDefault.length}`);
  console.log(`files hidden from default view: ${hiddenFromDefault.length}`);
  console.log(`staging assets ready for review: ${newestStaging.length}`);

  console.log(`\nDuplicate source URLs: ${duplicatesBySource.length}`);
  console.log(`Duplicate local paths: ${duplicatesByLocalPath.length}`);
  console.log(`Missing files referenced by manifest: ${missingFiles.length}`);
  console.log(`Files present but not in manifest: ${unmanifestedFiles.length}`);
  console.log(`Manifest entries whose files are missing: ${missingFiles.length}`);
  console.log(`Manifest entries with incomplete metadata: ${invalidMetadata.length}`);

  console.log(`\nGuardrail oversized tracked public files (> 12 MB): ${oversizedTrackedFiles.length}`);
  for (const row of oversizedTrackedFiles.slice(0, 40)) {
    console.log(`- ${row.path} (${row.sizeBytes} bytes)`);
  }

  console.log(`\nGuardrail tracked oversized dimensions (> 4096): ${trackedOversizedDimensionFiles.length}`);
  for (const row of trackedOversizedDimensionFiles.slice(0, 40)) {
    console.log(`- ${row.path} (${row.width}x${row.height})`);
  }

  console.log(`\nWarning local oversized files in staging/textures (untracked or ignored): ${warningLocalOversized.length}`);
  for (const row of warningLocalOversized.slice(0, 40)) {
    const reason = row.isIgnored ? "ignored" : "untracked";
    console.log(`- ${row.path} (${row.width}x${row.height}, ${row.sizeBytes} bytes, ${reason})`);
  }

  console.log(`\nLocal quarantine notices (ignored + unreferenced oversized): ${localQuarantineNotices.length}`);
  for (const row of localQuarantineNotices.slice(0, 40)) {
    console.log(`- ${row.path} (${row.width}x${row.height}, ${row.sizeBytes} bytes)`);
  }

  console.log(`\nWarning oversized inbox files (not ingested): ${oversizedInboxFiles.length}`);
  for (const row of oversizedInboxFiles.slice(0, 40)) {
    console.log(`- ${row.path} (${row.width}x${row.height}, ${row.sizeBytes} bytes)`);
  }

  console.log(`\nWarning staging/review entries missing optional optimization metadata: ${optionalOptimizationWarnings.length}`);
  for (const row of optionalOptimizationWarnings.slice(0, 40)) {
    console.log(`- ${row.localPath || "(missing localPath)"}`);
  }

  console.log(`\nApproved manifest entries pointing to /staging/: ${approvedInStaging.length}`);
  for (const row of approvedInStaging.slice(0, 40)) {
    console.log(`- ${row.localPath}`);
  }

  console.log(`\nApproved manifest entries pointing to /originals/: ${approvedInOriginals.length}`);
  for (const row of approvedInOriginals.slice(0, 40)) {
    console.log(`- ${row.localPath}`);
  }

  console.log(`\nApproved oversizedOriginal entries without optimized derivative: ${approvedOversizedWithoutOptimized.length}`);
  for (const row of approvedOversizedWithoutOptimized.slice(0, 40)) {
    console.log(`- ${row.localPath}`);
  }

  console.log(`\nApproved/public-used assets resolving display URL to raw oversized original: ${approvedDisplayRawOversized.length}`);
  for (const row of approvedDisplayRawOversized.slice(0, 40)) {
    console.log(`- ${row.localPath}`);
  }

  console.log(`\nGenerated source guardrail hits (/staging/, /originals/, _8k, _16k): ${generatedSourceGuardrailHits.length}`);
  for (const row of generatedSourceGuardrailHits.slice(0, 40)) {
    console.log(`- ${row.file}: ${row.match}`);
  }

  if (strictLocal) {
    console.log("\nSTRICT LOCAL MODE enabled: local oversized warnings and quarantine notices are promoted to blocking errors.");
  }
}

function findOversizedTrackedPublicFiles(publicImageMetrics) {
  return publicImageMetrics.filter((row) => row.isTracked && row.isStagingOrTextures && row.isOversizedSize);
}

function findTrackedOversizedDimensionFiles(publicImageMetrics) {
  return publicImageMetrics.filter((row) => row.isTracked && row.isOversizedDimension);
}

function findLocalOversizedStagingTextureFiles(publicImageMetrics) {
  return publicImageMetrics.filter((row) => {
    return !row.isTracked && row.isStagingOrTextures && (row.isOversizedSize || row.isOversizedDimension);
  });
}

async function collectPublicImageMetrics(filesOnDisk, trackedFiles, ignoredFiles) {
  const output = [];
  for (const publicPath of filesOnDisk) {
    const abs = path.join(ROOT, "public", publicPath.slice(1).replace(/\//g, path.sep));
    const relGitPath = `public/${publicPath.slice(1)}`;
    const dimensions = await inspectImageDimensions(abs);
    let sizeBytes = 0;
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) {
        sizeBytes = stat.size;
      }
    } catch {
      continue;
    }

    output.push({
      path: publicPath,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
      sizeBytes,
      isTracked: trackedFiles.has(relGitPath),
      isIgnored: ignoredFiles.has(relGitPath),
      isOversizedSize: sizeBytes > MAX_LIBRARY_ASSET_BYTES,
      isOversizedDimension:
        (Number.isFinite(dimensions?.width) && dimensions.width > MAX_ORIGINAL_DIMENSION) ||
        (Number.isFinite(dimensions?.height) && dimensions.height > MAX_ORIGINAL_DIMENSION),
      isStagingOrTextures: /\/willard-assets\/(staging|textures)\//i.test(publicPath),
    });
  }
  return output;
}

async function findOversizedInboxFiles() {
  const hits = [];
  const files = await listImageFilesRecursive(WILLARD_INBOX_ROOT);
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    const relDisplay = `/${rel}`;
    const dimensions = await inspectImageDimensions(abs);
    let sizeBytes = 0;
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) {
        sizeBytes = stat.size;
      }
    } catch {
      continue;
    }

    const oversizedBySize = sizeBytes > MAX_LIBRARY_ASSET_BYTES;
    const oversizedByDimensions =
      (Number.isFinite(dimensions?.width) && dimensions.width > MAX_ORIGINAL_DIMENSION) ||
      (Number.isFinite(dimensions?.height) && dimensions.height > MAX_ORIGINAL_DIMENSION);

    if (!oversizedBySize && !oversizedByDimensions) {
      continue;
    }

    hits.push({
      path: relDisplay,
      width: dimensions?.width ?? 0,
      height: dimensions?.height ?? 0,
      sizeBytes,
    });
  }
  return hits;
}

async function inspectImageDimensions(absPath) {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(absPath, { limitInputPixels: false }).metadata();
    if (!Number.isFinite(metadata.width) || !Number.isFinite(metadata.height)) {
      return null;
    }
    return { width: metadata.width, height: metadata.height };
  } catch {
    return null;
  }
}

function getTrackedFilesSet() {
  try {
    const output = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
    return new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\\/g, "/"))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function getIgnoredFilesSet(prefixes) {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--others", "--ignored", "--exclude-standard", "--", ...prefixes],
      { cwd: ROOT, encoding: "utf8" }
    );
    return new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\\/g, "/"))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

async function scanGeneratedSourceGuardrails() {
  const hits = [];
  const chunks = [];
  const patterns = [/\/staging\//i, /\/originals\//i, /_8k/i, /_16k/i];
  for (const file of GENERATED_SOURCE_FILES) {
    let text = "";
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    chunks.push(text.toLowerCase());
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        hits.push({ file: rel, match: String(pattern) });
      }
    }
  }
  return {
    hits,
    sourceText: chunks.join("\n"),
  };
}

function hasOptimizedDerivative(row) {
  return Boolean(String(row.optimizedPath || "").trim() || String(row.optimizedUrl || "").trim());
}

function hasAnyOptimizationMetadata(row) {
  return Boolean(
    String(row.optimizedPath || "").trim() ||
      String(row.optimizedUrl || "").trim() ||
      String(row.thumbnailPath || "").trim() ||
      String(row.thumbnailUrl || "").trim()
  );
}

function resolveDisplayPath(row) {
  const preferred = normalizePublicReference(row.optimizedPath || row.optimizedUrl || row.localPath);
  if (!preferred) {
    return "";
  }
  return preferred;
}

function normalizePublicReference(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const normalizedLocal = normalizePublicPath(raw);
  if (normalizedLocal) {
    return normalizedLocal;
  }

  try {
    const parsed = new URL(raw);
    return normalizePublicPath(parsed.pathname);
  } catch {
    return "";
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Audit failed: ${message}`);
  process.exitCode = 1;
});
