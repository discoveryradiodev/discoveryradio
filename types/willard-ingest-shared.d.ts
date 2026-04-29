declare module "@/scripts/willard/ingest-shared.mjs" {
  type IngestSummary = {
    mode: string;
    filesScanned: number;
    validFilesFound: number;
    filesStaged: number;
    duplicatesSkipped: number;
    unsupportedSkipped: number;
    noAlphaFlagged: number;
    countsByCategory: Record<string, number>;
    countsByDominantKind: Record<string, number>;
    countsByProvider: Record<string, number>;
    manifestPath: string;
    warnings: string[];
  };

  export function ingestInbox(options?: {
    dryRun?: boolean;
    move?: boolean;
    limit?: number;
    category?: string;
  }): Promise<IngestSummary>;

  export function pullTrustedTextures(options?: {
    provider?: string;
    category?: string;
    count?: number;
  }): Promise<IngestSummary>;
}
