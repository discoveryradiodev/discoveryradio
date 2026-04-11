export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const feedConfig = {
  sheetId: requireEnv('SHEET_ID'),
  spotlightDocId: requireEnv('SPOTLIGHT_DOC_ID'),
  blogDocId: requireEnv('BLOG_DOC_ID'),
};
