import type { ArtistProfile } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  profile: ArtistProfile;
};

export default function ArtistProfileCard({ profile }: Props) {
  return (
    <article className={`${styles.card} ${styles.profileCard}`}>
      <h3 className={styles.supportTitle} data-style-target="profile-title">Spotify Artist Profile</h3>
      <p className={styles.profileName}>{profile.artistName}</p>
      <p className={styles.supportMeta} data-style-target="profile-body">{profile.monthLabel}</p>
      <div className={styles.spotifyEmbedWrapper} data-style-target="profile-link">
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
