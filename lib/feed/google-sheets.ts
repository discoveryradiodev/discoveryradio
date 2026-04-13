import { feedConfig } from '@/lib/feed/config';

export type SheetRow = Record<string, string>;

export async function fetchSheetRows(sheetName: string): Promise<SheetRow[]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${feedConfig.sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&headers=1&tqx=out:json`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(
      `fetchSheetRows: request failed for sheet "${sheetName}" \u2014 ${res.status} ${res.statusText}`
    );
  }

  const raw = await res.text();

  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(
      `fetchSheetRows: could not locate JSON in Google response for sheet "${sheetName}"`
    );
  }

  let parsed: {
    table?: {
      cols?: { label?: string }[];
      rows?: { c?: ({ v?: string | number | boolean | null } | null)[] }[];
    };
  };

  try {
    parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as typeof parsed;
  } catch {
    throw new Error(`fetchSheetRows: JSON parse failed for sheet "${sheetName}"`);
  }

  const table = parsed?.table;
  if (!table) {
    throw new Error(`fetchSheetRows: missing table payload for sheet "${sheetName}"`);
  }

  const cols: string[] = (table.cols ?? []).map((c) => (c.label ?? '').trim().toLowerCase());
  if (cols.length === 0) {
    throw new Error(`fetchSheetRows: no column labels found in sheet "${sheetName}"`);
  }

  return (table.rows ?? []).map((r) => {
    const cells = r.c ?? [];
    const row: SheetRow = {};
    cols.forEach((col, i) => {
      const cell = cells[i];
      row[col] = cell?.v != null ? String(cell.v).trim() : '';
    });
    return row;
  });
}