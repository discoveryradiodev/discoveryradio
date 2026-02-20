"use client";

import { useState, useEffect, useRef } from "react";

function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -15% 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const placeholderReveal = useScrollReveal();
  const mailingListReveal = useScrollReveal();
  const whatHappensReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailRegex.test(trimmedEmail)) {
      setError("Enter a valid email.");
      return;
    }

    // Success state
    setSubmitted(true);
    setEmail("");
    
    // Clear success message after 5 seconds (user can see it, then transitions)
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="container">
      <div className="homepage-overlay"></div>
      
      <section
        ref={placeholderReveal.ref}
        className={`interview-placeholder scroll-reveal ${placeholderReveal.isVisible ? "is-visible" : ""}`}
      >
        <p>Coming soon — live interviews & clips.</p>
      </section>

      <section className="quote-section">
        <p>"I made Discovery Radio because I was tired of hearing the same shit on TikTok. Everything feels so fucking copy and paste nowadays, and it's hard to filter out the noise from the actual talent."</p>
        <p className="quote-attribution">Xayne, Founder and Host</p>
      </section>

      <section
        ref={mailingListReveal.ref}
        className={`mailing-list-section scroll-reveal ${mailingListReveal.isVisible ? "is-visible" : ""}`}
      >
        <h3>Mailing List</h3>
        <p className="mailing-list-copy">Get the next interview drop. No spam.</p>
        
        {submitted ? (
          <div className="mailing-list-success">You're on the list.</div>
        ) : (
          <form onSubmit={handleSubmit} className="mailing-list-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="mailing-list-input"
            />
            <button type="submit" className="mailing-list-button">Join</button>
            {error && <p className="mailing-list-error">{error}</p>}
          </form>
        )}
        
        <p className="mailing-list-note">Unsubscribe anytime.</p>
      </section>

      <section
        ref={whatHappensReveal.ref}
        className={`what-happens-section scroll-reveal ${whatHappensReveal.isVisible ? "is-visible" : ""}`}
      >
        <h3>What Happens on Discovery Radio</h3>
        <ul className="what-happens-list">
          <li>Artists become part of a growing network of hungry fans and industry heads</li>
          <li>Deep dives into artists' personal lives</li>
          <li>Producer "Live Takeover" nights — beats built live in front of viewers using sampling machines</li>
          <li>Digest & dissect sessions — breaking down lyrics line by line, live</li>
        </ul>
      </section>

      <section
        ref={ctaReveal.ref}
        className={`cta-statement scroll-reveal ${ctaReveal.isVisible ? "is-visible" : ""}`}
      >
        <p>A free, open platform for artists and industry alike — where artists are defined by people, not systems.</p>
      </section>
    </div>
  );
}
