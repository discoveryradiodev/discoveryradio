#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WILLARD_ROOT = path.join(ROOT, "public", "willard-assets");
const MANIFEST_PATH = path.join(WILLARD_ROOT, "willard-asset-manifest.json");

const FOLDERS = {
  overlays: path.join(WILLARD_ROOT, "overlays"),
  textures: path.join(WILLARD_ROOT, "textures"),
  tape: path.join(WILLARD_ROOT, "tape"),
  stickers: path.join(WILLARD_ROOT, "stickers"),
  frames: path.join(WILLARD_ROOT, "frames"),
  paper: path.join(WILLARD_ROOT, "paper"),
  staging: path.join(WILLARD_ROOT, "staging"),
};

const PACK_QUERY_MAP = {
  paper: [
    { query: "old paper", folder: "paper", category: "texture" },
    { query: "torn paper", folder: "paper", category: "texture" },
    { query: "crumpled paper", folder: "paper", category: "texture" },
    { query: "folded paper", folder: "paper", category: "texture" },
    { query: "receipt paper", folder: "paper", category: "texture" },
  ],
  tape: [
    { query: "masking tape", folder: "tape", category: "tape" },
    { query: "clear tape", folder: "tape", category: "tape" },
    { query: "duct tape", folder: "tape", category: "tape" },
    { query: "label tape", folder: "tape", category: "tape" },
  ],
  texture: [
    { query: "paper texture", folder: "textures", category: "texture" },
    { query: "photocopy texture", folder: "textures", category: "texture" },
    { query: "concrete texture", folder: "textures", category: "texture" },
    { query: "fabric texture", folder: "textures", category: "texture" },
    { query: "noise texture", folder: "textures", category: "texture" },
  ],
  grunge: [
    { query: "dust overlay", folder: "overlays", category: "overlay" },
    { query: "scratches overlay", folder: "overlays", category: "overlay" },
    { query: "halftone texture", folder: "overlays", category: "overlay" },
    { query: "xerox texture", folder: "overlays", category: "overlay" },
    { query: "ink texture", folder: "overlays", category: "overlay" },
  ],
  frames: [
    { query: "photo frame", folder: "frames", category: "frame" },
    { query: "border frame", folder: "frames", category: "frame" },
    { query: "film frame", folder: "frames", category: "frame" },
  ],
};

const SUPPORTED_PACKS = new Set(["paper", "tape", "texture", "grunge", "frames", "collage"]);
const DEFAULT_PROVIDERS = ["ambientcg", "polyhaven"];
const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg"]);
const MANIFEST_VERSION = 2;

const APPROVAL_THRESHOLD = 65;
const MIN_TEXTURE_DIMENSION = 1024;
const MIN_OVERLAY_DIMENSION = 512;
const MIN_REJECT_DIMENSION = 160;

let polyHavenAssetIndex = null;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const autoApproveEnabled = options.autoApprove && process.env.NODE_ENV === "development";

  await ensureWillardFolders();
  const manifest = await readManifest();

  const existingSourceUrls = new Set(
    manifest.assets
      .map((item) => normalizeUrl(item.sourceUrl))
      .filter(Boolean)
  );
  const existingLocalPaths = new Set(
    manifest.assets
      .map((item) => normalizePublicPath(item.localPath))
      .filter(Boolean)
  );

  const planRows = buildImportPlan(options.pack);
  if (planRows.length === 0) {
    throw new Error(`No import plan rows found for pack '${options.pack}'.`);
  }

  const addedRecords = [];
  const addedFiles = [];
  const reviewRequired = [];
  const stagedOrRejectedReasons = [];
  let approvedAdded = 0;
  let attemptedCandidates = 0;

  for (const row of planRows) {
    if (options.targetCount > 0 && approvedAdded >= options.targetCount) {
      break;
    }

    const candidates = [];
    for (const provider of options.providers) {
      const providerCandidates = await fetchCandidates(provider, row.query, options.perQuery);
      for (const candidate of providerCandidates) {
        candidates.push(candidate);
      }
    }

    for (const candidate of candidates) {
      if (options.targetCount > 0 && approvedAdded >= options.targetCount) {
        break;
      }

      const normalizedSource = normalizeUrl(candidate.sourceUrl);
      if (normalizedSource && existingSourceUrls.has(normalizedSource)) {
        continue;
      }

      attemptedCandidates += 1;
      const result = await importCandidate(candidate, row, existingLocalPaths, autoApproveEnabled);
      if (!result) {
        continue;
      }

      const record = {
        sourceUrl: candidate.sourceUrl,
        author: candidate.author || "Unknown",
        license: candidate.license || "Unknown",
        licenseUrl: candidate.licenseUrl || "",
        provider: candidate.provider,
        filename: path.basename(result.localPath),
        originalFilename: candidate.originalFilename,
        localPath: result.localPath,
        createdAt: new Date().toISOString(),
        importedAt: new Date().toISOString(),
        query: row.query,
        category: result.category,
        suggestedCategory: result.suggestedCategory,
        status: result.status,
        qualityScore: result.qualityScore,
        reviewRequired: result.reviewRequired,
        rejectionReason: result.rejectionReason,
        width: result.width,
        height: result.height,
        hasAlpha: result.hasAlpha,
        dominantKind: result.dominantKind,
        curatorNotes: result.curatorNotes,
      };

      manifest.assets.push(record);
      addedRecords.push(record);
      addedFiles.push(result.localPath);

      if (result.reviewRequired) {
        reviewRequired.push(record);
      }

      if (result.status === "approved") {
        approvedAdded += 1;
      } else {
        stagedOrRejectedReasons.push({
          localPath: result.localPath,
          status: result.status,
          reason: result.rejectionReason || result.curatorNotes || "quality gate",
        });
      }

      const normalizedLocal = normalizePublicPath(result.localPath);
      if (normalizedLocal) {
        existingLocalPaths.add(normalizedLocal);
      }
      if (normalizedSource) {
        existingSourceUrls.add(normalizedSource);
      }
    }
  }

  manifest.assets = dedupeManifestAssets(manifest.assets);
  manifest.version = MANIFEST_VERSION;
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const targetSummary =
    options.targetCount > 0
      ? `Approved target: ${approvedAdded}/${options.targetCount}`
      : `Approved imported: ${approvedAdded}`;

  printSummary({
    options,
    attemptedCandidates,
    targetSummary,
    addedRecords,
    addedFiles,
    reviewRequired,
    stagedOrRejectedReasons,
    autoApproveEnabled,
  });

  if (options.targetCount > 0 && approvedAdded < options.targetCount) {
    console.error(
      `\nImport did not reach approved target count. Requested ${options.targetCount}, approved ${approvedAdded}.`
    );
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const flags = new Map();

  for (let i = 0; i < args.length; i += 1) {
    const part = args[i];

    if (!part.startsWith("--")) {
      if (!flags.has("pack")) {
        flags.set("pack", part);
      }
      continue;
    }

    const eqIndex = part.indexOf("=");
    if (eqIndex > -1) {
      flags.set(part.slice(2, eqIndex), part.slice(eqIndex + 1));
      continue;
    }

    const key = part.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      i += 1;
    } else {
      flags.set(key, "true");
    }
  }

  const pack = String(flags.get("pack") || "collage").toLowerCase();
  if (!SUPPORTED_PACKS.has(pack)) {
    throw new Error(`Unsupported pack '${pack}'.`);
  }

  const providerRaw = String(flags.get("providers") || DEFAULT_PROVIDERS.join(","));
  const providers = providerRaw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .filter((item) => ["ambientcg", "polyhaven", "openverse", "wikimedia"].includes(item));

  if (providers.length === 0) {
    throw new Error("No valid providers selected.");
  }

  const perQuery = Math.max(1, Math.min(25, Number(flags.get("per-query") || flags.get("limit") || 4) || 4));
  const targetCount = Math.max(0, Number(flags.get("target-count") || 0) || 0);
  const autoApprove = ["1", "true", "yes"].includes(
    String(flags.get("auto-approve") || "false").trim().toLowerCase()
  );

  return { pack, providers, perQuery, targetCount, autoApprove };
}

function buildImportPlan(pack) {
  if (pack === "collage") {
    return [
      ...PACK_QUERY_MAP.paper,
      ...PACK_QUERY_MAP.tape,
      ...PACK_QUERY_MAP.texture,
      ...PACK_QUERY_MAP.grunge,
      ...PACK_QUERY_MAP.frames,
    ];
  }

  return PACK_QUERY_MAP[pack] ?? [];
}

async function ensureWillardFolders() {
  await fs.mkdir(WILLARD_ROOT, { recursive: true });
  await Promise.all(Object.values(FOLDERS).map((folder) => fs.mkdir(folder, { recursive: true })));

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
    const assets = Array.isArray(parsed?.assets) ? parsed.assets.map(migrateManifestAsset) : [];
    return { version: MANIFEST_VERSION, assets };
  } catch {
    return { version: MANIFEST_VERSION, assets: [] };
  }
}

function migrateManifestAsset(asset) {
  const status = normalizeStatus(asset?.status, "staging");
  const reviewRequired = typeof asset?.reviewRequired === "boolean" ? asset.reviewRequired : status !== "approved";
  return {
    ...asset,
    status,
    qualityScore: finiteNumber(asset?.qualityScore, 0),
    reviewRequired,
    dominantKind: normalizeDominantKind(asset?.dominantKind),
  };
}

async function fetchCandidates(provider, query, perQuery) {
  if (provider === "ambientcg") {
    return fetchAmbientCgCandidates(query, perQuery);
  }
  if (provider === "polyhaven") {
    return fetchPolyHavenCandidates(query, perQuery);
  }
  if (provider === "openverse") {
    return fetchOpenverseCandidates(query, perQuery);
  }
  if (provider === "wikimedia") {
    return fetchWikimediaCandidates(query, perQuery);
  }
  return [];
}

async function fetchAmbientCgCandidates(query, perQuery) {
  const endpoint = `https://ambientcg.com/api/v2/full_json?include=downloadData,previewData&type=PhotoTexture&limit=${perQuery * 4}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const assets = extractAmbientAssets(payload);
    const rows = [];

    for (const asset of assets) {
      if (rows.length >= perQuery) {
        break;
      }
      const downloadUrl = selectBestImageUrl(collectImageUrls(asset));
      if (!downloadUrl) {
        continue;
      }
      const id = String(asset.assetId || asset.id || asset.assetName || "ambientcg");
      const license = firstText(asset.license, asset.licenseType, "CC0");
      rows.push({
        provider: "ambientcg",
        sourceUrl: firstText(asset.assetUrl, `https://ambientcg.com/view?id=${encodeURIComponent(id)}`),
        downloadUrl,
        author: firstText(asset.author, "ambientCG"),
        license,
        licenseUrl: firstText(asset.licenseUrl, "https://creativecommons.org/publicdomain/zero/1.0/"),
        originalFilename: guessFilename(downloadUrl, `${query}-${id}`),
      });
    }

    return rows;
  } catch {
    return [];
  }
}

function extractAmbientAssets(payload) {
  if (Array.isArray(payload?.foundAssets)) {
    return payload.foundAssets;
  }
  if (payload?.foundAssets && typeof payload.foundAssets === "object") {
    return Object.values(payload.foundAssets);
  }
  if (Array.isArray(payload?.assets)) {
    return payload.assets;
  }
  if (payload?.assets && typeof payload.assets === "object") {
    return Object.values(payload.assets);
  }
  return [];
}

async function fetchPolyHavenCandidates(query, perQuery) {
  if (!polyHavenAssetIndex) {
    try {
      const response = await fetch("https://api.polyhaven.com/assets?t=textures");
      if (!response.ok) {
        return [];
      }
      polyHavenAssetIndex = await response.json();
    } catch {
      return [];
    }
  }

  const queryTokens = tokenize(query);
  const matches = Object.entries(polyHavenAssetIndex)
    .map(([id, meta]) => ({ id, meta }))
    .filter(({ id, meta }) => {
      const haystack = [id, String(meta?.name || ""), ...(meta?.tags || []), ...(meta?.categories || [])]
        .join(" ")
        .toLowerCase();
      return queryTokens.every((token) => haystack.includes(token));
    })
    .slice(0, perQuery * 3);

  const rows = [];
  for (const { id, meta } of matches) {
    if (rows.length >= perQuery) {
      break;
    }

    try {
      const response = await fetch(`https://api.polyhaven.com/files/${encodeURIComponent(id)}`);
      if (!response.ok) {
        continue;
      }

      const files = await response.json();
      const downloadUrl = selectBestImageUrl(collectImageUrls(files));
      if (!downloadUrl) {
        continue;
      }

      rows.push({
        provider: "polyhaven",
        sourceUrl: `https://polyhaven.com/a/${encodeURIComponent(id)}`,
        downloadUrl,
        author: extractPolyHavenAuthor(meta),
        license: "CC0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        originalFilename: guessFilename(downloadUrl, `${query}-${id}`),
      });
    } catch {
      // ignore
    }
  }

  return rows;
}

function extractPolyHavenAuthor(meta) {
  if (meta?.authors && typeof meta.authors === "object") {
    const names = Object.keys(meta.authors).filter(Boolean);
    if (names.length > 0) {
      return names.join(", ");
    }
  }
  return "Poly Haven";
}

async function fetchOpenverseCandidates(query, perQuery) {
  const endpoint = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm&page_size=${perQuery}`;
  try {
    const response = await fetch(endpoint, { headers: { "User-Agent": "WillardAssetImporter/2.0" } });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return (payload?.results ?? []).map((row) => ({
      provider: "openverse",
      sourceUrl: firstText(row.foreign_landing_url, row.url),
      downloadUrl: firstText(row.url, row.thumbnail),
      author: firstText(row.creator, "Unknown"),
      license: firstText(row.license, row.license_name, "Unknown"),
      licenseUrl: firstText(row.license_url, ""),
      originalFilename: guessFilename(firstText(row.url, row.thumbnail), `${query}-openverse`),
    }));
  } catch {
    return [];
  }
}

async function fetchWikimediaCandidates(query, perQuery) {
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(query)}%20filetype:bitmap&gsrlimit=${perQuery}&prop=imageinfo&iiprop=url|extmetadata`;

  try {
    const response = await fetch(endpoint, { headers: { "User-Agent": "WillardAssetImporter/2.0" } });
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const pages = Object.values(payload?.query?.pages || {});
    const rows = [];

    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      const metadata = info?.extmetadata || {};
      rows.push({
        provider: "wikimedia",
        sourceUrl: firstText(page?.canonicalurl, page?.fullurl, info?.descriptionurl, info?.url),
        downloadUrl: firstText(info?.url, ""),
        author: stripHtml(firstText(metadata.Artist?.value, "Unknown")),
        license: stripHtml(firstText(metadata.LicenseShortName?.value, metadata.License?.value, "Unknown")),
        licenseUrl: stripHtml(firstText(metadata.LicenseUrl?.value, "")),
        originalFilename: guessFilename(info?.url, `${query}-wikimedia`),
      });
    }

    return rows;
  } catch {
    return [];
  }
}

async function importCandidate(candidate, row, existingLocalPaths, autoApproveEnabled) {
  const sourceUrl = normalizeUrl(candidate.sourceUrl);
  const downloadUrl = firstText(candidate.downloadUrl, "");
  if (!sourceUrl || !downloadUrl) {
    return null;
  }

  let response;
  try {
    response = await fetch(downloadUrl, { headers: { "User-Agent": "WillardAssetImporter/2.0" } });
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    return null;
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const extension = inferImageExtension(downloadUrl, contentType);
  if (!extension || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return null;
  }

  const inspect = inspectImage(bytes, extension);
  const hasCertainLicense = isLicenseCertain(candidate.license, candidate.licenseUrl, candidate.provider);
  const dominantKind = classifyDominantKind({ extension, hasAlpha: inspect.hasAlpha, row, candidate });

  const gate = evaluateQualityGate({
    extension,
    row,
    candidate,
    inspect,
    hasCertainLicense,
    dominantKind,
  });

  const stagingFileNameBase = sanitizeFilenameBase(candidate.originalFilename || `${candidate.provider}-${row.query}`);
  const stagedLocation = await allocateOutputPath("staging", stagingFileNameBase, extension, existingLocalPaths);
  if (!stagedLocation) {
    return null;
  }

  await fs.writeFile(stagedLocation.absolutePath, bytes);

  let finalLocation = stagedLocation;
  let finalStatus = "staging";
  let finalReviewRequired = true;

  if (autoApproveEnabled && gate.status === "approved" && gate.targetFolder !== "staging") {
    const approvedLocation = await allocateOutputPath(gate.targetFolder, stagingFileNameBase, extension, existingLocalPaths);
    if (approvedLocation) {
      await fs.rename(stagedLocation.absolutePath, approvedLocation.absolutePath);
      finalLocation = approvedLocation;
      finalStatus = "approved";
      finalReviewRequired = false;
    }
  }

  if (gate.status === "rejected") {
    finalStatus = "rejected";
  }

  return {
    localPath: finalLocation.publicPath,
    category: gate.category,
    suggestedCategory: gate.category,
    status: finalStatus,
    qualityScore: gate.qualityScore,
    reviewRequired: finalReviewRequired,
    rejectionReason: gate.rejectionReason,
    width: inspect.width,
    height: inspect.height,
    hasAlpha: inspect.hasAlpha,
    dominantKind,
    curatorNotes: gate.curatorNotes,
  };
}

function evaluateQualityGate({ extension, row, candidate, inspect, hasCertainLicense, dominantKind }) {
  const reasons = [];
  const category = row.category;
  const isOverlayLike = category === "overlay" || category === "tape" || category === "sticker" || category === "frame";
  const isTextureLike = category === "texture" || row.folder === "paper" || row.folder === "textures";

  let score = 45;

  if (!hasCertainLicense) {
    reasons.push("uncertain license metadata");
    score -= 25;
  } else {
    score += 20;
  }

  if (inspect.width && inspect.height) {
    const minDim = Math.min(inspect.width, inspect.height);
    if (minDim < MIN_REJECT_DIMENSION) {
      reasons.push("tiny dimensions");
      score -= 60;
    } else if (minDim < MIN_OVERLAY_DIMENSION) {
      reasons.push("small dimensions");
      score -= 20;
    } else {
      score += 10;
    }

    if (isTextureLike && minDim >= MIN_TEXTURE_DIMENSION) {
      score += 20;
    }
  } else {
    reasons.push("missing dimensions");
    score -= 15;
  }

  if (isOverlayLike) {
    const hasEdgeHint = /frame|border|edge|mask/i.test(row.query);
    if (extension === ".svg" || inspect.hasAlpha || hasEdgeHint) {
      score += 15;
    } else {
      reasons.push("overlay-like asset without alpha/edge traits");
      score -= 30;
    }
  }

  if (dominantKind === "photo" && isOverlayLike) {
    reasons.push("photo-like result in overlay pack");
    score -= 25;
  }

  if (dominantKind === "unknown") {
    reasons.push("unclear dominant kind");
    score -= 15;
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);

  if (normalizedScore < 25) {
    return {
      category,
      targetFolder: "staging",
      status: "rejected",
      reviewRequired: true,
      qualityScore: normalizedScore,
      rejectionReason: reasons.join("; ") || "rejected by quality gate",
      curatorNotes: "Rejected automatically by importer quality policy.",
    };
  }

  const shouldApprove =
    normalizedScore >= APPROVAL_THRESHOLD &&
    hasCertainLicense &&
    !(dominantKind === "photo" && isOverlayLike) &&
    !(isTextureLike && Math.min(inspect.width || 0, inspect.height || 0) < MIN_TEXTURE_DIMENSION);

  if (!shouldApprove) {
    return {
      category,
      targetFolder: "staging",
      status: "staging",
      reviewRequired: true,
      qualityScore: normalizedScore,
      rejectionReason: reasons.join("; ") || "needs manual review",
      curatorNotes: "Staged for curator review.",
    };
  }

  return {
    category,
    targetFolder: row.folder,
    status: "approved",
    reviewRequired: false,
    qualityScore: normalizedScore,
    rejectionReason: undefined,
    curatorNotes: "Auto-approved by importer quality gate.",
  };
}

function classifyDominantKind({ extension, hasAlpha, row, candidate }) {
  const query = `${row.query} ${row.folder}`.toLowerCase();
  if (extension === ".svg") {
    return "shape";
  }
  if (hasAlpha && /(overlay|frame|tape|sticker|edge|mask|grunge)/i.test(query)) {
    return "transparent-overlay";
  }
  if (/(texture|paper|noise|concrete|fabric|xerox|halftone)/i.test(query)) {
    return "texture";
  }
  if (/(illustration|drawing|vector)/i.test(query) || /illustration|vector/i.test(String(candidate.originalFilename || ""))) {
    return "illustration";
  }
  if (/(photo|photograph|image)/i.test(query)) {
    return "photo";
  }
  return "unknown";
}

function isLicenseCertain(license, licenseUrl, provider) {
  const text = `${license || ""} ${licenseUrl || ""}`.toLowerCase();
  if (provider === "ambientcg" || provider === "polyhaven") {
    return /cc0|public\s*domain/.test(text) || text.trim().length === 0 || provider === "polyhaven";
  }
  return /cc0|public\s*domain|pdm/.test(text);
}

async function allocateOutputPath(folderKey, baseName, extension, existingLocalPaths) {
  const folderPath = FOLDERS[folderKey];
  if (!folderPath) {
    return null;
  }

  for (let i = 0; i < 500; i += 1) {
    const filename = i === 0 ? `${baseName}${extension}` : `${baseName}-${i}${extension}`;
    const absolutePath = path.join(folderPath, filename);
    const publicPath = toPublicPath(absolutePath);
    const normalizedPublic = normalizePublicPath(publicPath);
    if (!normalizedPublic) {
      continue;
    }

    const existsInManifest = existingLocalPaths.has(normalizedPublic);
    const existsOnDisk = await fileExists(absolutePath);
    if (!existsInManifest && !existsOnDisk) {
      existingLocalPaths.add(normalizedPublic);
      return { absolutePath, publicPath };
    }
  }

  return null;
}

function inspectImage(buffer, extension) {
  if (extension === ".png") {
    return inspectPng(buffer);
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return inspectJpeg(buffer);
  }
  if (extension === ".gif") {
    return inspectGif(buffer);
  }
  if (extension === ".webp") {
    return inspectWebp(buffer);
  }
  if (extension === ".svg") {
    return inspectSvg(buffer);
  }
  return { width: undefined, height: undefined, hasAlpha: false };
}

function inspectPng(buffer) {
  if (buffer.length < 33 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return { width: undefined, height: undefined, hasAlpha: false };
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
    const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 8 < buffer.length) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height, hasAlpha: false };
    }

    if (length <= 2) {
      break;
    }
    offset += 2 + length;
  }

  return { width: undefined, height: undefined, hasAlpha: false };
}

function inspectGif(buffer) {
  if (buffer.length < 10 || (buffer.toString("ascii", 0, 6) !== "GIF89a" && buffer.toString("ascii", 0, 6) !== "GIF87a")) {
    return { width: undefined, height: undefined, hasAlpha: false };
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height, hasAlpha: true };
}

function inspectWebp(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return { width: undefined, height: undefined, hasAlpha: false };
  }

  const type = buffer.toString("ascii", 12, 16);
  const hasAlpha = buffer.includes(Buffer.from("ALPH", "ascii"));

  if (type === "VP8X" && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height, hasAlpha };
  }

  return { width: undefined, height: undefined, hasAlpha };
}

function inspectSvg(buffer) {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 5000));
  const widthMatch = text.match(/\bwidth\s*=\s*"([0-9.]+)/i);
  const heightMatch = text.match(/\bheight\s*=\s*"([0-9.]+)/i);
  const viewBoxMatch = text.match(/\bviewBox\s*=\s*"([^"]+)"/i);

  let width = widthMatch ? Number(widthMatch[1]) : undefined;
  let height = heightMatch ? Number(heightMatch[1]) : undefined;

  if ((!width || !height) && viewBoxMatch) {
    const nums = viewBoxMatch[1].trim().split(/\s+/).map((value) => Number(value));
    if (nums.length === 4 && Number.isFinite(nums[2]) && Number.isFinite(nums[3])) {
      width = nums[2];
      height = nums[3];
    }
  }

  return {
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
    hasAlpha: true,
  };
}

function dedupeManifestAssets(assets) {
  const seenSource = new Set();
  const seenPath = new Set();
  const deduped = [];

  for (const item of assets) {
    const source = normalizeUrl(item.sourceUrl);
    const localPath = normalizePublicPath(item.localPath);
    if (source && seenSource.has(source)) {
      continue;
    }
    if (localPath && seenPath.has(localPath)) {
      continue;
    }

    if (source) {
      seenSource.add(source);
    }
    if (localPath) {
      seenPath.add(localPath);
    }

    deduped.push(migrateManifestAsset(item));
  }

  return deduped;
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

function toPublicPath(absolutePath) {
  const relative = path.relative(path.join(ROOT, "public"), absolutePath);
  if (!relative || relative.startsWith("..")) {
    return "";
  }
  return `/${relative.replace(/\\/g, "/")}`;
}

function inferImageExtension(urlValue, contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("image/png")) {
    return ".png";
  }
  if (type.includes("image/webp")) {
    return ".webp";
  }
  if (type.includes("image/jpeg") || type.includes("image/jpg")) {
    return ".jpg";
  }
  if (type.includes("image/gif")) {
    return ".gif";
  }
  if (type.includes("image/svg")) {
    return ".svg";
  }

  const ext = path.extname(safePathname(urlValue)).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : "";
}

function safePathname(urlValue) {
  try {
    return new URL(String(urlValue || "")).pathname;
  } catch {
    return String(urlValue || "");
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFilenameBase(name) {
  const raw = String(name || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase();

  const safe = raw
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || `asset-${Date.now()}`;
}

function collectImageUrls(value, collector = new Set()) {
  if (!value) {
    return [...collector];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      const ext = path.extname(safePathname(trimmed)).toLowerCase();
      if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        collector.add(trimmed);
      }
    }
    return [...collector];
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageUrls(item, collector);
    }
    return [...collector];
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectImageUrls(item, collector);
    }
  }

  return [...collector];
}

function selectBestImageUrl(urls) {
  const unique = urls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url, index, arr) => arr.indexOf(url) === index);

  unique.sort((a, b) => extensionRank(path.extname(safePathname(a)).toLowerCase()) - extensionRank(path.extname(safePathname(b)).toLowerCase()));
  return unique[0] || "";
}

function extensionRank(ext) {
  const order = [".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg"];
  const index = order.indexOf(ext);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function guessFilename(urlValue, fallbackBase) {
  const candidate = path.basename(safePathname(urlValue || ""));
  return candidate || `${fallbackBase}.png`;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "approved" || normalized === "staging" || normalized === "rejected" || normalized === "demo") {
    return normalized;
  }
  return fallback;
}

function normalizeDominantKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "texture" ||
    normalized === "transparent-overlay" ||
    normalized === "photo" ||
    normalized === "illustration" ||
    normalized === "shape"
  ) {
    return normalized;
  }
  return "unknown";
}

function finiteNumber(value, fallback = undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function printSummary({ options, attemptedCandidates, targetSummary, addedRecords, addedFiles, reviewRequired, stagedOrRejectedReasons, autoApproveEnabled }) {
  const categoryCounts = new Map();
  const statusCounts = new Map();

  for (const row of addedRecords) {
    const category = String(row.category || "image");
    const status = String(row.status || "staging");
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }

  console.log(`Pack: ${options.pack}`);
  console.log(`Providers: ${options.providers.join(", ")}`);
  console.log(`Auto-approve enabled: ${autoApproveEnabled ? "yes" : "no"}`);
  console.log(`Attempted candidates: ${attemptedCandidates}`);
  console.log(targetSummary);

  console.log("\nCounts by status:");
  if (statusCounts.size === 0) {
    console.log("- none");
  } else {
    for (const [status, count] of statusCounts.entries()) {
      console.log(`- ${status}: ${count}`);
    }
  }

  console.log("\nCounts by category:");
  if (categoryCounts.size === 0) {
    console.log("- none");
  } else {
    for (const [category, count] of categoryCounts.entries()) {
      console.log(`- ${category}: ${count}`);
    }
  }

  console.log("\nFiles added:");
  if (addedFiles.length === 0) {
    console.log("- none");
  } else {
    for (const file of addedFiles) {
      console.log(`- ${file}`);
    }
  }

  console.log("\nReview-required items:");
  if (reviewRequired.length === 0) {
    console.log("- none");
  } else {
    for (const row of reviewRequired) {
      console.log(`- ${row.localPath} [${row.provider}] status=${row.status} reason=${row.rejectionReason || "review"}`);
    }
  }

  console.log("\nStaged/rejected reasons:");
  if (stagedOrRejectedReasons.length === 0) {
    console.log("- none");
  } else {
    for (const row of stagedOrRejectedReasons.slice(0, 100)) {
      console.log(`- ${row.localPath} [${row.status}] ${row.reason}`);
    }
  }

  console.log(`\nManifest: ${MANIFEST_PATH}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Import failed: ${message}`);
  process.exitCode = 1;
});
