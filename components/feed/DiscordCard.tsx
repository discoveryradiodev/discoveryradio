type Props = {
  discordUrl: string;
};

export default function DiscordCard({ discordUrl }: Props) {
  return (
    <section>
      <h3>Join Discord</h3>
      <p>Connect with Discovery Radio listeners and artists in our Discord community.</p>
      <a href={discordUrl} target="_blank" rel="noreferrer">
        Join the Discord
      </a>
    </section>
  );
}
