"use client";

import { useRef, useState } from "react";
import styles from "./feed.module.css";

type Props = {
  discordUrl: string;
};

type FormState = "idle" | "loading" | "success" | "duplicate" | "error";

export default function DiscordCard({ discordUrl }: Props) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const flightRef = useRef({ inFlight: false, lastSubmittedEmail: "", lastSubmittedAt: 0 });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = emailInputRef.current?.value.trim().toLowerCase() || "";

    if (!email) return;

    const flight = flightRef.current;

    // Prevent double submit
    if (flight.inFlight) return;

    // Prevent duplicate within 60s
    const now = Date.now();
    if (email === flight.lastSubmittedEmail && now - flight.lastSubmittedAt < 60000) {
      setFormState("duplicate");
      setErrorMessage("You're already on the list.");
      return;
    }

    flight.inFlight = true;
    setFormState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      const isDuplicate = data.message === "duplicate";

      if (data.success) {
        flight.lastSubmittedEmail = email;
        flight.lastSubmittedAt = now;

        if (isDuplicate) {
          setFormState("duplicate");
          setErrorMessage("You're already on the list.");
        } else {
          setFormState("success");
          if (emailInputRef.current) emailInputRef.current.value = "";
          // Auto-reset after 3s
          setTimeout(() => {
            setFormState("idle");
          }, 3000);
        }
      } else {
        setFormState("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setFormState("error");
      setErrorMessage("Network error. Please try again.");
    } finally {
      flight.inFlight = false;
    }
  };

  return (
    <section className={`${styles.card} ${styles.communityCard}`}>
      <div className={styles.communityBody}>
        <h3 className={styles.communityTitle} data-style-target="community-title">
          Stay In Touch
        </h3>

        <div className={styles.communityControls}>
          <div className={styles.communityLeft}>
            <div className={styles.communitySignupRow}>
              <p className={styles.communitySubtitle} data-style-target="community-subtitle">
                Sign up to be notified about new spotlights, playlists and more!
              </p>

              <form onSubmit={handleSubmit} className={styles.communityForm}>
                <input
                  ref={emailInputRef}
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className={styles.communityInput}
                  disabled={formState === "loading"}
                  data-style-target="community-input"
                />
                <button
                  type="submit"
                  className={`${styles.discordCta} ${styles.communitySubmit}`}
                  disabled={formState === "loading"}
                  data-style-target="community-submit"
                >
                  {formState === "loading" ? "Sending..." : "Join List"}
                </button>
              </form>
            </div>

            {formState === "success" && (
              <p className={styles.communityFeedback} data-style-target="community-feedback-success" aria-live="polite">
                You are in. Check your inbox.
              </p>
            )}

            {(formState === "duplicate" || formState === "error") && errorMessage && (
              <p
                className={`${styles.communityFeedback} ${styles.communityError}`}
                data-style-target="community-feedback-error"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            )}
          </div>

          <div className={styles.communityRight}>
            <p className={styles.communityDiscordNote}>GET INVOLVED</p>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              className={`${styles.discordCta} ${styles.communityDiscord}`}
              data-style-target="community-discord-button"
            >
              Join the Discord
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
