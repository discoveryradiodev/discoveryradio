import type { ArtistProfile } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  profile: ArtistProfile;
};

export default function ArtistProfileCard({ profile }: Props) {
  return (
    <article>
      <h3>Artist Profile</h3>
      <p>
        <strong>{profile.artistName}</strong>
      </p>
      <p>{profile.monthLabel}</p>
      <div className={styles.spotifyEmbedWrapper}>
        <iframe
          src={profile.spotifyEmbedUrl}
          width="100%"
          height="352"
          frameBorder="0"
          allowFullScreen
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          title={`${profile.artistName} on Spotify`}
        />
      </div>
    </article>
  );
}
