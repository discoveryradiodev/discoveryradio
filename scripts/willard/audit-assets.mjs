#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WILLARD_ROOT = path.join(ROOT, "public", "willard-assets");
const MANIFEST_PATH = path.join(WILLARD_ROOT, "willard-asset-manifest.json");

const FOLDERS = [
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
const DOMINANT_VALUES = ["texture", "transparent-overlay", "photo", "illustration", "shape", "unknown"];

async function main() {
  const manifest = await readManifest();
  const filesOnDisk = await scanPublicAssetFiles();

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

  const hasCriticalIssues =
    duplicatesBySource.length > 0 ||
    duplicatesByLocalPath.length > 0 ||
    missingFiles.length > 0 ||
    invalidMetadata.length > 0;

  process.exitCode = hasCriticalIssues ? 1 : 0;
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
    let entries = [];
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        continue;
      }

      files.add(`/willard-assets/${folder}/${entry.name}`.toLowerCase());
    }
  }

  return files;
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
