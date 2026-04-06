import type { ArticleBlock } from "@/types/article";

export const mockSpotlightArticleBlocks: ArticleBlock[] = [
  {
    type: "heading",
    level: 2,
    content: "Who They Are",
  },
  {
    type: "paragraph",
    content:
      "Placeholder Artist is part of the kind of wave Discovery Radio was built to pay attention to—intentional, raw, and not trying to flatten itself for an algorithm.",
  },
  {
    type: "paragraph",
    content:
      "This section stands in for the full monthly spotlight article body. Later, this content will come from Google Docs after being normalized into blocks the site can render safely and consistently.",
  },
  {
    type: "quote",
    content:
      "Everything feels copy and paste until you find the artist actually saying something.",
    attribution: "Discovery Radio placeholder quote",
  },
  {
    type: "heading",
    level: 3,
    content: "What Stands Out",
  },
  {
    type: "list",
    style: "unordered",
    items: [
      "Strong sense of identity",
      "Clear regional and artistic context",
      "Music that feels deliberate instead of disposable",
    ],
  },
];

export const mockWeeklyBlogArticleBlocks: ArticleBlock[] = [
  {
    type: "heading",
    level: 2,
    content: "This Week on The Feed",
  },
  {
    type: "paragraph",
    content:
      "This is a placeholder weekly blog entry meant to prove out the full-article rendering flow before live Google Docs data gets connected.",
  },
  {
    type: "paragraph",
    content:
      "The goal is to keep structure stable while making the content itself easy to update without touching code every time a new post goes live.",
  },
  {
    type: "heading",
    level: 3,
    content: "What This System Needs To Do",
  },
  {
    type: "list",
    style: "ordered",
    items: [
      "Pull article content from a familiar writing tool",
      "Render formatting consistently on-site",
      "Support weekly and monthly updates with minimal breakage",
    ],
  },
  {
    type: "quote",
    content:
      "Writers should provide content. The system should handle layout.",
      attribution: "Discovery Radio planning principle",
  },
];
