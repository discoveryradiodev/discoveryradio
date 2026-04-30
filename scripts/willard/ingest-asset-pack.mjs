#!/usr/bin/env node

import { ingestInbox } from "./ingest-shared.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await ingestInbox(options);

  printSummary(summary);
  console.log(`Manifest path: ${summary.manifestPath}`);
}

function parseArgs(args) {
  const flags = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const part = args[index];
    if (!part.startsWith("--")) {
      continue;
    }

    const eq = part.indexOf("=");
    if (eq > -1) {
      flags.set(part.slice(2, eq), part.slice(eq + 1));
      continue;
    }

    const key = part.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, "true");
    }
  }

  return {
    dryRun: parseBool(flags.get("dry-run")),
    move: parseBool(flags.get("move")),
    limit: Math.max(0, Number(flags.get("limit") || 0) || 0),
    category: String(flags.get("category") || "").trim(),
  };
}

function parseBool(value) {
  return ["1", "true", "yes"].includes(String(value || "false").trim().toLowerCase());
}

function printSummary(summary) {
  console.log("=== Willard Ingest Inbox Summary ===");
  console.log(`Mode: ${summary.mode}`);
  console.log(`Files scanned: ${summary.filesScanned}`);
  console.log(`Valid files found: ${summary.validFilesFound}`);
  console.log(`Files staged: ${summary.filesStaged}`);
  console.log(`Duplicates skipped: ${summary.duplicatesSkipped}`);
  console.log(`Unsupported skipped: ${summary.unsupportedSkipped}`);
  console.log(`No-alpha design flagged: ${summary.noAlphaFlagged}`);

  printMapLike("By category", summary.countsByCategory);
  printMapLike("By dominant kind", summary.countsByDominantKind);
  printMapLike("By provider", summary.countsByProvider);

  if (Array.isArray(summary.warnings) && summary.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of summary.warnings) {
      console.log(`  - ${warning}`);
    }
  }
}

function printMapLike(title, values) {
  const entries = Object.entries(values || {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) {
    console.log(`${title}: (none)`);
    return;
  }

  console.log(`${title}:`);
  for (const [key, count] of entries) {
    console.log(`  - ${key}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
