export type ArticleBlock =
  | {
      type: "paragraph";
      content: string;
    }
  | {
      type: "heading";
      level: 2 | 3;
      content: string;
    }
  | {
      type: "quote";
      content: string;
      attribution?: string;
    }
  | {
      type: "list";
      style: "unordered" | "ordered";
      items: string[];
    }
  | {
      type: "link";
      label: string;
      href: string;
    };
