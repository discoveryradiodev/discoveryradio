export function canApplyLocalSourceStyles(host: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const hostname = normalizeHost(host);
  if (!hostname) {
    return false;
  }

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function normalizeHost(host: string | null | undefined): string {
  return (host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0] ?? "";
}
