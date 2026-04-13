import type { MonthlyPlaylist } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  playlist: MonthlyPlaylist;
};

export default function MonthlyPlaylistCard({ playlist }: Props) {
  return (
    <article className={`${styles.card} ${styles.playlistCard}`}>
      <h3 className={styles.playlistTitle} data-style-target="playlist-title">{playlist.title}</h3>
      <p className={styles.supportMeta} data-style-target="playlist-month">{playlist.monthLabel}</p>
      {playlist.description ? <p className={styles.playlistDesc} data-style-target="playlist-body">{playlist.description}</p> : null}
      {playlist.spotifyEmbedUrl ? (
        <div className={styles.spotifyEmbedWrapper}>
          <iframe
            src={playlist.spotifyEmbedUrl}
            width="100%"
            height="352"
            frameBorder="0"
            allowFullScreen
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            title={`${playlist.title} on Spotify`}
          />
        </div>
      ) : (
        <div className={styles.embedPlaceholder}>
          <p>
            <em>Spotify playlist embed placeholder — will render here when connected.</em>
          </p>
        </div>
      )}
      {playlist.spotifyUrl ? (
        <a
          href={playlist.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.playlistLink}
          data-style-target="playlist-link"
        >
          Open Playlist
        </a>
      ) : null}
    </article>
  );
}
