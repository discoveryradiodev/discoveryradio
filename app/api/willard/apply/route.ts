import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { canApplyLocalSourceStyles } from "@/lib/dev/style-lab-apply";
import {
  buildGeneratedWillardCss,
  summarizeWillardSourceApply,
  WILLARD_GENERATED_FILE_RELATIVE_PATH,
} from "@/lib/dev/style-lab-css";
import {
  buildGeneratedWillardImageOverridesModule,
  summarizeSourceAppliedImageOverrides,
  WILLARD_GENERATED_IMAGE_FILE_RELATIVE_PATH,
} from "@/lib/dev/style-lab-images";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { isStyleTargetId } from "@/lib/dev/style-lab-inspect";
import type {
  WillardBackgroundBlendMode,
  WillardBackgroundOverride,
  WillardBackgroundPosition,
  WillardBackgroundRepeat,
  WillardBackgroundSize,
  WillardImageOverride,
} from "@/lib/dev/willard-assets";

export const runtime = "nodejs";

type ApplyRequestBody = {
  variables?: Record<string, string>;
  backgroundOverrides?: unknown;
  imageOverrides?: unknown;
  overlayDrafts?: unknown;
};

export async function POST(request: Request) {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!canApplyLocalSourceStyles(host)) {
    return NextResponse.json(
      { error: "Local source apply is disabled on live production." },
      { status: 403 }
    );
  }

  let body: ApplyRequestBody;
  try {
    body = (await request.json()) as ApplyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const variables = Object.fromEntries(
    Object.entries(body.variables ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
    )
  );

  const backgroundOverrides = normalizeBackgroundOverrides(body.backgroundOverrides);
  const imageOverrides = normalizeImageOverrides(body.imageOverrides);

  const nextCss = buildGeneratedWillardCss(variables, backgroundOverrides);
  const nextImageModule = buildGeneratedWillardImageOverridesModule(imageOverrides);
  const cssPath = path.join(/*turbopackIgnore: true*/ process.cwd(), WILLARD_GENERATED_FILE_RELATIVE_PATH);
  const imageModulePath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    WILLARD_GENERATED_IMAGE_FILE_RELATIVE_PATH
  );
  const previousCss = await readFile(cssPath, "utf8").catch(() => "");
  const previousImageModule = await readFile(imageModulePath, "utf8").catch(() => "");

  await writeFile(cssPath, nextCss, "utf8");
  await writeFile(imageModulePath, nextImageModule, "utf8");

  const summary = summarizeWillardSourceApply(variables, backgroundOverrides);
  const imageSummary = summarizeSourceAppliedImageOverrides(imageOverrides);
  const updatedFiles = [
    previousCss !== nextCss ? WILLARD_GENERATED_FILE_RELATIVE_PATH : null,
    previousImageModule !== nextImageModule ? WILLARD_GENERATED_IMAGE_FILE_RELATIVE_PATH : null,
  ].filter((value): value is string => Boolean(value));

  return NextResponse.json({
    ok: true,
    updated: updatedFiles.length > 0,
    filePath: updatedFiles.join(", "),
    filesWritten: updatedFiles,
    styleTargetsWritten: summary.styleTargetCount,
    backgroundOverridesWritten: summary.backgroundOverrideCount,
    imageSourceOverridesWritten: imageSummary.imageSourceOverrideCount,
    message: `${
      updatedFiles.length > 0
        ? "Willard source apply completed."
        : "No source changes were needed."
    } Wrote ${summary.styleTargetCount} style target${summary.styleTargetCount !== 1 ? "s" : ""}, ${summary.backgroundOverrideCount} background override${summary.backgroundOverrideCount !== 1 ? "s" : ""}, and ${imageSummary.imageSourceOverrideCount} image source override${imageSummary.imageSourceOverrideCount !== 1 ? "s" : ""}. Files written: ${updatedFiles.length > 0 ? updatedFiles.join(", ") : "none"}.`,
  });
}

function normalizeBackgroundOverrides(input: unknown): WillardBackgroundOverride[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const result: WillardBackgroundOverride[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<WillardBackgroundOverride>;
    const targetId = typeof candidate.targetId === "string" ? candidate.targetId : "";
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    const assetId = typeof candidate.assetId === "string" ? candidate.assetId : "";
    if (!isStyleTargetId(targetId) || !url || !assetId) {
      continue;
    }

    result.push({
      targetId,
      assetId,
      url,
      size: normalizeBackgroundSize(candidate.size),
      position: normalizeBackgroundPosition(candidate.position),
      repeat: normalizeBackgroundRepeat(candidate.repeat),
      blendMode: normalizeBackgroundBlendMode(candidate.blendMode),
    });
  }

  return result;
}

function normalizeImageOverrides(input: unknown): WillardImageOverride[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const result: WillardImageOverride[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<WillardImageOverride>;
    if (
      typeof candidate.targetId !== "string" ||
      !isStyleTargetId(candidate.targetId) ||
      typeof candidate.assetId !== "string" ||
      typeof candidate.url !== "string"
    ) {
      continue;
    }

    result.push(candidate as WillardImageOverride);
  }

  return result;
}

function normalizeBackgroundSize(value: unknown): WillardBackgroundSize {
  if (value === "cover" || value === "contain" || value === "auto") {
    return value;
  }
  return "cover";
}

function normalizeBackgroundPosition(value: unknown): WillardBackgroundPosition {
  if (value === "center" || value === "top" || value === "bottom" || value === "left" || value === "right") {
    return value;
  }
  return "center";
}

function normalizeBackgroundRepeat(value: unknown): WillardBackgroundRepeat {
  if (value === "no-repeat" || value === "repeat") {
    return value;
  }
  return "no-repeat";
}

function normalizeBackgroundBlendMode(value: unknown): WillardBackgroundBlendMode | undefined {
  if (
    value === "normal" ||
    value === "multiply" ||
    value === "screen" ||
    value === "overlay" ||
    value === "darken" ||
    value === "lighten" ||
    value === "soft-light" ||
    value === "hard-light"
  ) {
    return value;
  }
  return undefined;
}
