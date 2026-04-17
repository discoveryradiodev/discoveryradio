import type { ArticleBlock } from '@/types/article';

export async function fetchGoogleDocText(docId: string): Promise<string> {
  const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const res = await fetch(url, { next: { revalidate: 50 } });
  if (!res.ok) {
    throw new Error(
      `fetchGoogleDocText: request failed for doc "${docId}" \u2014 ${res.status} ${res.statusText}`
    );
  }

  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`fetchGoogleDocText: doc "${docId}" returned empty content`);
  }

  return text;
}

export function normalizeDocTextToArticleBlocks(text: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  const chunks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/);

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;

    if (lines.length === 1) {
      const line = lines[0].trim();

      if (line.startsWith('## ')) {
        blocks.push({ type: 'heading', level: 2, content: line.slice(3).trim() });
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push({ type: 'heading', level: 3, content: line.slice(4).trim() });
        continue;
      }
      if (line.startsWith('> ')) {
        blocks.push({ type: 'quote', content: line.slice(2).trim() });
        continue;
      }
      if (/^https?:\/\/\S+$/.test(line)) {
        blocks.push({ type: 'link', label: line, href: line });
        continue;
      }
    }

    if (lines.every((l) => l.trimStart().startsWith('- '))) {
      blocks.push({
        type: 'list',
        style: 'unordered',
        items: lines.map((l) => l.trimStart().slice(2).trim()),
      });
      continue;
    }

    if (lines.every((l) => /^\d+\.\s/.test(l.trimStart()))) {
      blocks.push({
        type: 'list',
        style: 'ordered',
        items: lines.map((l) => l.trimStart().replace(/^\d+\.\s+/, '').trim()),
      });
      continue;
    }

    blocks.push({
      type: 'paragraph',
      content: lines.map((l) => l.trim()).join(' '),
    });
  }

  return blocks;
}