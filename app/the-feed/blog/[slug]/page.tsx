import Link from "next/link";
import { notFound } from "next/navigation";
import { mockFeedData } from "@/lib/feed/mock-data";

type BlogPageProps = {
  params: {
    slug: string;
  };
};

export default function BlogPage({ params }: BlogPageProps) {
  const blog = mockFeedData.weeklyBlog;

  if (params.slug !== blog.slug) {
    notFound();
  }

  const publishedDate = new Date(blog.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1rem 3rem" }}>
      <article>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, lineHeight: 1.2 }}>{blog.title}</h1>
          <p style={{ margin: "0.5rem 0 0", opacity: 0.8 }}>Published: {publishedDate}</p>
        </header>

        <div style={{ marginBottom: "1.5rem" }}>
          <img
            src={blog.coverImageUrl ?? "/placeholder-blog-cover.jpg"}
            alt={blog.coverImageAlt ?? "Weekly blog cover placeholder"}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 640,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
        </div>

        <section style={{ lineHeight: 1.7 }}>
          <p>{blog.excerpt}</p>
        </section>

        <nav style={{ marginTop: "2rem" }}>
          <Link href="/the-feed">Back to The Feed</Link>
        </nav>
      </article>
    </main>
  );
}
