import FeedPage from "@/app/the-feed/page";
import FeedLayout from "@/app/the-feed/layout";

export default async function HomePage() {
  return (
    <FeedLayout>
      <FeedPage />
    </FeedLayout>
  );
}
