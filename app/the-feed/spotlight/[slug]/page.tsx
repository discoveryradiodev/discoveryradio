import Link from "next/link";
import { notFound } from "next/navigation";
import { mockFeedData } from "@/lib/feed/mock-data";

type SpotlightPageProps = {
  params: {
    slug: string;
  };
};

export default function SpotlightPage({ params }: SpotlightPageProps) {
  const spotlight = mockFeedData.artistSpotlight;

  if (params.slug !== spotlight.slug) {
    notFound();
  }

  const artistMeta = [spotlight.artistLocation, spotlight.artistGenre].filter(Boolean).join(" | ");
  const publishedDate = new Date(spotlight.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1rem 3rem" }}>
      <article>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, lineHeight: 1.2 }}>{spotlight.title}</h1>
          <p style={{ margin: "0.75rem 0 0", fontWeight: 600 }}>{spotlight.artistName}</p>
          {artistMeta ? <p style={{ margin: "0.4rem 0 0" }}>{artistMeta}</p> : null}
          <p style={{ margin: "0.4rem 0 0", opacity: 0.8 }}>Published: {publishedDate}</p>
        </header>

        <div style={{ marginBottom: "1.5rem" }}>
          <img
            src={spotlight.headshotUrl}
            alt={spotlight.headshotAlt}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 420,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
        </div>

        <section style={{ lineHeight: 1.7 }}>
          <p>{spotlight.excerpt}</p>
        </section>

        <nav style={{ marginTop: "2rem" }}>
          <Link href="/the-feed">Back to The Feed</Link>
        </nav>
      </article>
    </main>
  );
}
