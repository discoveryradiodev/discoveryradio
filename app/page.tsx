"use client";

import { useEffect, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
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

  return ref;
}

export default function HomePage() {
  const placeholderReveal = useScrollReveal();
  const whatHappensReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  return (
    <div className="container">
      <div className="homepage-overlay"></div>
      
      <section
        ref={placeholderReveal}
        className="interview-placeholder scroll-reveal"
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%",
            overflow: "hidden",
            borderRadius: "inherit",
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/FQFGy_KpvaY?autoplay=1&mute=1&controls=1&loop=1&playlist=FQFGy_KpvaY&playsinline=1&rel=0&modestbranding=1"
            title="This is Discovery Radio"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      </section>

      <section className="quote-section">
        <p>"I made Discovery Radio because I was tired of hearing the same shit on TikTok. Everything feels so fucking copy and paste nowadays, and it's hard to filter out the noise from the actual talent."</p>
        <p className="quote-attribution">Xayne, Founder and Host</p>
      </section>

      <section
        ref={whatHappensReveal}
        className="what-happens-section scroll-reveal"
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
        ref={ctaReveal}
        className="cta-statement scroll-reveal"
      >
        <p>A free, open platform for artists and industry alike — where artists are defined by people, not systems.</p>
      </section>
    </div>
  );
}
