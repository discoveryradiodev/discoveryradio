import type { MonthlyPlaylist } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  playlist: MonthlyPlaylist;
};

export default function MonthlyPlaylistCard({ playlist }: Props) {
  return (
    <article className={styles.centered}>
      <h3>{playlist.title}</h3>
      <p>{playlist.monthLabel}</p>
      {playlist.description ? <p>{playlist.description}</p> : null}
      <p>
        <em>Spotify playlist embed placeholder — will render here when connected.</em>
      </p>
    </article>
  );
}
