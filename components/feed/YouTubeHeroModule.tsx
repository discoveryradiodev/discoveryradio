import styles from "@/app/the-feed/page.module.css";
import type { YouTubeInterviewModule } from "@/types/feed-modules";

// Fallback embed used when no live YouTube data is configured in the CMS.
const FALLBACK_EMBED_URL =
  "https://www.youtube.com/embed/FQFGy_KpvaY?autoplay=1&mute=1&controls=1&loop=1&playlist=FQFGy_KpvaY&playsinline=1&rel=0&modestbranding=1";

type Props = {
  module: YouTubeInterviewModule | null;
};

export default function YouTubeHeroModule({ module }: Props) {
  const embedUrl = module?.data.youtubeEmbedUrl ?? FALLBACK_EMBED_URL;
  const label = module?.data.title ?? "Latest Interview";

  return (
    <section className={styles.youtubeHero}>
      <p className={styles.youtubeHeroLabel}>{label}</p>
      <div className={styles.youtubeHeroMediaShell}>
        <div className={styles.youtubeHeroFrame}>
          <iframe
            src={embedUrl}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
