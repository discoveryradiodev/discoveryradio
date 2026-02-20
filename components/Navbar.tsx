import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <header className="nav-wrap">
      <div className="nav-inner">
        <Link href="/" className="brand">
          Discovery Radio
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/" className="btn">Home</Link>
          <Link href="/contact" className="btn">Contact</Link>
        </nav>
      </div>
    </header>
  );
}
