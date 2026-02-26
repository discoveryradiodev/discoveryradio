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

  // Single-flight guard state (persists across re-renders for this component instance)
  const signupFlightRef = useRef({ inFlight: false, lastSubmittedEmail: "", lastSubmittedAt: 0 });

  const handleMailingListSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const submitButton = form.elements.namedItem("submit") as HTMLButtonElement;
    const email = emailInput.value.trim().toLowerCase();

    const flight = signupFlightRef.current;

    // Block if request already in flight
    if (flight.inFlight) {
      return;
    }

    // Check if same email submitted within 60 seconds
    const now = Date.now();
    if (email === flight.lastSubmittedEmail && now - flight.lastSubmittedAt < 60000) {
      return;
    }

    // Mark as in-flight and disable button
    flight.inFlight = true;
    if (submitButton) {
      submitButton.disabled = true;
    }

    emailInput.setCustomValidity("");

    try {
      // Call Next.js API route (server-side, no CORS)
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      const isDuplicate = data.message === 'duplicate';
      const isSuccess = data.success === true;

      if (isSuccess) {
        // Update flight state with this submission
        flight.lastSubmittedEmail = email;
        flight.lastSubmittedAt = now;

        if (isDuplicate) {
          emailInput.setCustomValidity("You're already on the list.");
          form.reportValidity();
        } else {
          form.reset();
          alert("thanks mate :)");
        }
      } else {
        console.error("Signup failed:", data.error || data.detail || data.message || 'unknown error');
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Network error. Please try again.");
    } finally {
      // Re-enable button and mark as not in-flight
      flight.inFlight = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

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
<section className="mailing-list-section">
  <h3>Mailing List</h3>
  <p>Get a heads-up when we go live. No algorithms. No spam.</p>

  <form
    onSubmit={handleMailingListSubmit}
  >
    <input
      type="email"
      name="email"
      placeholder="your@email.com"
      required
    />
    <button type="submit" name="submit">Join</button>
  </form>
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
