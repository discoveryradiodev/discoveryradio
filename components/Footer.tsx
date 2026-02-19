import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="footer-wrap">
      <div className="footer-inner">
        <Link href="/" className="footer-logo" title="Discovery Radio Home">
          Discovery Radio
        </Link>

        <div className="footer-links">
          <a href="mailto:xaynehackley@gmail.com" className="footer-link">
            Email
          </a>
          <a href="https://www.instagram.com/discoveryradio.inc" className="footer-link" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="https://www.tiktok.com/@discoveryradioinc" className="footer-link" target="_blank" rel="noopener noreferrer">
            TikTok
          </a>
        </div>
      </div>
    </footer>
  );
}
