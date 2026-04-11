import type { ArticleBlock } from "@/types/article";

type Props = {
  blocks: ArticleBlock[];
};

type LinkBlock = {
  type: "link";
  href: string;
  label?: string;
  content?: string;
};

function isLinkBlock(block: ArticleBlock): block is ArticleBlock & LinkBlock {
  const maybe = block as Partial<LinkBlock>;
  return maybe.type === "link" && typeof maybe.href === "string";
}

export function ArticleBlocks({ blocks }: Props) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{block.content}</p>;

          case "heading": {
            const HeadingTag = block.level === 2 ? "h2" : "h3";
            return <HeadingTag key={index}>{block.content}</HeadingTag>;
          }

          case "quote":
            return (
              <blockquote key={index}>
                <p>{block.content}</p>
                {block.attribution ? <cite>{block.attribution}</cite> : null}
              </blockquote>
            );

          case "list": {
            const ListTag = block.style === "ordered" ? "ol" : "ul";
            return (
              <ListTag key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ListTag>
            );
          }

          default:
            if (isLinkBlock(block)) {
              return (
                <a key={index} href={block.href} target="_blank" rel="noopener noreferrer">
                  {block.label ?? block.content ?? block.href}
                </a>
              );
            }

            return null;
        }
      })}
    </>
  );
}
