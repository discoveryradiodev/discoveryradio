import styles from "./feed.module.css";

type Props = {
  discordUrl: string;
};

export default function DiscordCard({ discordUrl }: Props) {
  return (
    <section className={`${styles.card} ${styles.discordCard}`}>
      <h3 data-style-target="discord-title">Join Discord</h3>
      <p data-style-target="discord-body">Connect with Discovery Radio listeners and artists in our Discord community.</p>
      <a
        href={discordUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.discordCta}
        data-style-target="discord-button"
      >
        Join the Discord
      </a>
    </section>
  );
}
