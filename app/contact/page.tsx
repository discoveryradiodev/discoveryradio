export default function ContactPage() {
  return (
    <div className="container">
      <div className="contact-overlay-container">
        <div className="contact-section">
          <h1 className="contact-heading">Contact</h1>
          <p className="contact-intro">Wanna work with us? Reach out here</p>

          <div className="contact-grid">
            <div className="contact-row">
              <div className="contact-label">Email</div>
              <a href="mailto:xaynehackley@gmail.com" className="contact-value">
                xaynehackley@gmail.com
              </a>
            </div>

            <div className="contact-row">
              <div className="contact-label">Phone</div>
              <a href="tel:+16814651809" className="contact-value">
                (681) 465 1809
              </a>
            </div>

            <div className="contact-row">
              <div className="contact-label">TikTok</div>
              <a 
                href="https://www.tiktok.com/@discoveryradioinc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-value"
              >
                @discoveryradioinc
              </a>
            </div>

            <div className="contact-row">
              <div className="contact-label">TikTok (Live happens here)</div>
              <a 
                href="https://www.tiktok.com/@double_odanger2.0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-value"
              >
                @double_odanger2.0
              </a>
            </div>

            <div className="contact-row">
              <div className="contact-label">Join our community!</div>
              <a 
                href="https://discord.gg/bDqYZDwh7K" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-value"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
