import type { ArchiveItem } from "@/types/feed";

type Props = {
  items: ArchiveItem[];
};

export default function ArchiveCard({ items }: Props) {
  return (
    <section>
      <h3>Archive</h3>
      <p>Past video and interview features live here for quick replay and reference.</p>
      <ul>
        {items.map((item) => {
          const date = new Date(item.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const typeLabel =
            item.type === "youtube"
              ? "YouTube"
              : item.type === "spotlight"
                ? "Artist Spotlight"
                : "Blog";

          return (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noreferrer">
                <strong>{item.title}</strong>
              </a>
              <br />
              <small>{typeLabel} • {date}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
