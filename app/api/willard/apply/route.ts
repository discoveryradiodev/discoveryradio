import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { canApplyLocalSourceStyles } from "@/lib/dev/style-lab-apply";
import {
  buildGeneratedWillardCss,
  WILLARD_GENERATED_FILE_RELATIVE_PATH,
} from "@/lib/dev/style-lab-css";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";

export const runtime = "nodejs";

type ApplyRequestBody = {
  variables?: Record<string, string>;
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

  const nextCss = buildGeneratedWillardCss(variables);
  const absolutePath = path.join(process.cwd(), WILLARD_GENERATED_FILE_RELATIVE_PATH);
  const previousCss = await readFile(absolutePath, "utf8").catch(() => "");

  await writeFile(absolutePath, nextCss, "utf8");

  return NextResponse.json({
    ok: true,
    updated: previousCss !== nextCss,
    filePath: WILLARD_GENERATED_FILE_RELATIVE_PATH,
    message:
      previousCss !== nextCss
        ? "Willard styles were applied to the local source file."
        : "No source changes were needed.",
  });
}
