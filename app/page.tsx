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
  const mailingListReveal = useScrollReveal();
  const whatHappensReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  const handleBrevoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    const emailInput = form.querySelector<HTMLInputElement>("#EMAIL");
    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    
    if (!emailInput) return;

    const formData = new URLSearchParams({
      EMAIL: emailInput.value,
      email_address_check: "",
      locale: "en",
      html_type: "simple",
    });

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Subscribing...";
    }

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.ok) {
        form.reset();
        if (submitButton) {
          submitButton.textContent = "Subscribed!";
          setTimeout(() => {
            submitButton.textContent = "SUBSCRIBE";
            submitButton.disabled = false;
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (submitButton) {
        submitButton.textContent = "SUBSCRIBE";
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

      <section
        ref={mailingListReveal}
        className="mailing-list-section scroll-reveal"
      >
        <h3>Mailing List</h3>
        <form
          id="sib-form"
          method="POST"
          action="https://5ada1973.sibforms.com/serve/MUIFACyOSYZnXeTuIFx9LF2GdkeZRVPurnc6joAzTh17VjnR4vRM_uwkWf6WOPqqAHnp0ra-WNORJaxOCiQzuUECL7IZdzDHFNiMerH5qKX0HGoIkuPRuLinAqu4i5Bj0LREjFX1DNpiAhkssqJ1m5GWa738o1L89q3pm01Cq8zdyRjZZdM5UZi0jZokL_fWU2JvEEF_GMBbFbU9WQ=="
          onSubmit={handleBrevoSubmit}
          className="brevo-form"
        >
          <p className="brevo-form__text">I dont store emails or sell them, just want ya to know when we go live mate :)</p>
          
          <div className="brevo-form__field-group">
            <label htmlFor="EMAIL" className="brevo-form__label">
              Subscribe to get a weekly newsletter with updates and more
            </label>
            <input
              type="text"
              id="EMAIL"
              name="EMAIL"
              autoComplete="off"
              placeholder="EMAIL"
              required
              className="brevo-form__input"
            />
            <p className="brevo-form__hint">Provide your email address to subscribe. For e.g abc@xyz.com</p>
          </div>

          <button type="submit" className="brevo-form__button">
            SUBSCRIBE
          </button>

          <input type="text" name="email_address_check" value="" style={{ display: "none" }} readOnly />
          <input type="hidden" name="locale" value="en" />
          <input type="hidden" name="html_type" value="simple" />
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
