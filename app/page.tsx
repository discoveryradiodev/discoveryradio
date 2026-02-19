export default function HomePage() {
  return (
    <div className="container">
      <div className="homepage-blur-wrapper">
        <section className="hero-section">
          <h1>Live. Human. Unranked.</h1>
          <p className="hero-subline">Discovery isn't dead. It's just been buried.</p>
        </section>

        <section className="what-happens-section">
          <h2>What happens on Discovery Radio</h2>
          <ul>
            <li>Live interviews</li>
            <li>Real-time performances</li>
            <li>Artists and listeners in the same room</li>
            <li>No feeds. No rankings. No metrics.</li>
          </ul>
        </section>

        <section className="right-now-section">
          <h2>Right now</h2>
          <p>Nothing is scheduled.</p>
          <p>Something is always happening.</p>
          <p className="subtle-supporting">Built slowly. On purpose.</p>
        </section>

        <section className="grounding-section">
          <p>Built with artists who took a risk.</p>
          <p>Supported by listeners who stayed.</p>
        </section>
      </div>
    </div>
  );
}
