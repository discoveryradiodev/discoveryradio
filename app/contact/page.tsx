export default function ContactPage() {
  return (
    <div className="container">
      <div className="contact-overlay-container">
        <div className="artists-section">
          <h2 className="artists-heading">Enter for a chance to be interviewed!</h2>
          <p className="artists-intro">
            Want to be interviewed? Featured on "The Feed"? Fill out the form and we'll be in touch! 
          </p>
          <p className="artists-intro artists-intro-punchy">
            Every Artist goes through the same process, no matter how big or small.
          </p>
          <p className="artists-intro">
            This form helps us understand your music and how we can best support you. We look forward to hearing from you!
          </p>
          <p className="artists-values">Submitting does not guarantee placement.</p>
          <a href="/submit" className="artists-cta">
            Submit your work
          </a>
        </div>
      </div>
    </div>
  );
}
