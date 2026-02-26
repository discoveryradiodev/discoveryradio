"use client";

import { useState } from "react";

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function SubmitPage() {
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  // Required fields
  const [artistName, setArtistName] = useState("");
  const [email, setEmail] = useState("");
  const [primaryLink, setPrimaryLink] = useState("");

  // Submission Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  const [numberOfYears, setNumberOfYears] = useState("");

  // Music & Links
  const [spotifyLink, setSpotifyLink] = useState("");
  const [soundcloudLink, setSoundcloudLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");

  // Social
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");

  // Why Discovery Radio
  const [whyDiscoveryRadio, setWhyDiscoveryRadio] = useState("");

  // Internal Notes
  const [notes, setNotes] = useState("");

  const isSubmitting = formState.status === "submitting";
  const isSuccess = formState.status === "success";
  const isError = formState.status === "error";

  const canSubmit =
    artistName.trim().length > 0 &&
    email.trim().length > 0 &&
    primaryLink.trim().length > 0 &&
    location.trim().length > 0 &&
    numberOfYears.trim().length > 0 &&
    (spotifyLink.trim().length > 0 || soundcloudLink.trim().length > 0) &&
    (instagram.trim().length > 0 || tiktok.trim().length > 0) &&
    (bio.trim().length > 0 || whyDiscoveryRadio.trim().length > 0) &&
    !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          artistName: artistName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          genre: genre.trim(),
          bio: bio.trim(),
          numberOfYears: numberOfYears.trim(),
          primaryLink: primaryLink.trim(),
          spotifyLink: spotifyLink.trim(),
          soundcloudLink: soundcloudLink.trim(),
          youtubeLink: youtubeLink.trim(),
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          whyDiscoveryRadio: whyDiscoveryRadio.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState({
          status: "error",
          message: data.error || "Submission failed. Please try again.",
        });
        return;
      }

      setFormState({ status: "success" });
      setName("");
      setArtistName("");
      setEmail("");
      setPhone("");
      setLocation("");
      setGenre("");
      setBio("");
      setNumberOfYears("");
      setPrimaryLink("");
      setSpotifyLink("");
      setSoundcloudLink("");
      setYoutubeLink("");
      setInstagram("");
      setTiktok("");
      setWhyDiscoveryRadio("");
      setNotes("");
    } catch (err: any) {
      setFormState({
        status: "error",
        message: err?.message || "Network error. Please try again.",
      });
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginTop: "8px",
    marginBottom: "20px",
    backgroundColor: "#ffffff",
    color: "#111111",
    border: "1px solid rgba(0,0,0,0.2)",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "1rem",
    lineHeight: "1.5",
  };

  const textareaStyle: React.CSSProperties = {
    ...fieldStyle,
    minHeight: "100px",
    resize: "vertical",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "24px",
  };

  const labelTextStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 500,
    marginBottom: "6px",
    opacity: 0.9,
  };

  const requiredStyle: React.CSSProperties = {
    color: "#F2C94C",
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginTop: "32px",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
    opacity: 0.9,
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 24px",
    marginTop: "24px",
    backgroundColor: "rgba(242, 201, 76, 0.15)",
    color: "#F2C94C",
    border: "1px solid rgba(242, 201, 76, 0.4)",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: canSubmit ? "pointer" : "not-allowed",
    opacity: canSubmit ? 1 : 0.5,
    transition: "all 0.2s ease",
  };

  const successMessageStyle: React.CSSProperties = {
    padding: "16px",
    marginTop: "20px",
    backgroundColor: "rgba(66, 135, 86, 0.2)",
    border: "1px solid rgba(66, 135, 86, 0.4)",
    borderRadius: "6px",
    color: "#A8D5BA",
  };

  const errorMessageStyle: React.CSSProperties = {
    padding: "16px",
    marginTop: "20px",
    backgroundColor: "rgba(220, 85, 85, 0.2)",
    border: "1px solid rgba(220, 85, 85, 0.4)",
    borderRadius: "6px",
    color: "#F4A5A5",
    whiteSpace: "pre-line",
  };

  const helperTextStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    opacity: 0.7,
    marginTop: "4px",
  };

  return (
    <>
      {/* Fixed full-page overlay with backdrop filter blur + dark scrim */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Form content (above overlay) */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 20px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>
          Submit your work
        </h1>
        <p style={{ opacity: 0.8, marginBottom: "8px" }}>
          No paywalls. No gimmicks. No algorithm games.
        </p>
        <p style={{ opacity: 0.65, fontStyle: "italic", marginBottom: "32px" }}>
          Money doesn't buy placement. Authenticity does.
        </p>

        {isSuccess ? (
          <div style={successMessageStyle}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>
              Submitted.
            </h2>
            <p style={{ margin: 0 }}>If it resonates, we'll reach out.</p>
            <button
              onClick={() => setFormState({ status: "idle" })}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "transparent",
                color: "#A8D5BA",
                border: "1px solid rgba(66, 135, 86, 0.6)",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Submit another
            </button>
          </div>
        ) : (
          <>
            <form noValidate onSubmit={handleSubmit}>
              {isError && (
                <div style={errorMessageStyle}>
                  <strong>Error:</strong> {formState.message}
                </div>
              )}

              {/* SUBMISSION DETAILS */}
              <h2 style={sectionHeadingStyle}>Submission Details</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>
                  Artist Name <span style={requiredStyle}>*</span>
                </span>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Your artist name"
                  style={fieldStyle}
                  required
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>
                  Email <span style={requiredStyle}>*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={fieldStyle}
                  required
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>
                  Best Song Link <span style={requiredStyle}>*</span>
                </span>
                <input
                  type="url"
                  value={primaryLink}
                  onChange={(e) => setPrimaryLink(e.target.value)}
                  placeholder="Spotify / SoundCloud / YouTube link"
                  style={fieldStyle}
                  required
                />
                <div style={helperTextStyle}>One link that represents you best.</div>
              </label>

              {/* BIO */}
              <h2 style={sectionHeadingStyle}>Bio</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Your Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name (optional)"
                  style={fieldStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(optional)"
                  style={fieldStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>
                  Location <span style={requiredStyle}>*</span>
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City / Region"
                  style={fieldStyle}
                  required
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Genre</span>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Your primary genre"
                  style={fieldStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Bio (or Why Discovery Radio)</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Who are you? What are you making?"
                  style={textareaStyle}
                />
                <div style={helperTextStyle}>
                  Bio or Why Discovery Radio (at least one required)
                </div>
              </label>

              {/* HOW MANY YEARS */}
              <h2 style={sectionHeadingStyle}>Experience</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>
                  How many years you been at this? <span style={requiredStyle}>*</span>
                </span>
                <input
                  type="text"
                  value={numberOfYears}
                  onChange={(e) => setNumberOfYears(e.target.value)}
                  placeholder="e.g. 3"
                  style={fieldStyle}
                  required
                />
              </label>

              {/* MUSIC & LINKS */}
              <h2 style={sectionHeadingStyle}>Music & Links</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Spotify (or SoundCloud)</span>
                <input
                  type="url"
                  value={spotifyLink}
                  onChange={(e) => setSpotifyLink(e.target.value)}
                  placeholder="https://open.spotify.com/..."
                  style={fieldStyle}
                />
                <div style={helperTextStyle}>
                  Spotify or SoundCloud (at least one required)
                </div>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>SoundCloud (or Spotify)</span>
                <input
                  type="url"
                  value={soundcloudLink}
                  onChange={(e) => setSoundcloudLink(e.target.value)}
                  placeholder="https://soundcloud.com/..."
                  style={fieldStyle}
                />
                <div style={helperTextStyle}>
                  Spotify or SoundCloud (at least one required)
                </div>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>YouTube</span>
                <input
                  type="url"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtube.com/... (optional)"
                  style={fieldStyle}
                />
              </label>

              {/* SOCIAL */}
              <h2 style={sectionHeadingStyle}>Social</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Instagram (or TikTok)</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@yourhandle"
                  style={fieldStyle}
                />
                <div style={helperTextStyle}>
                  Instagram or TikTok (at least one required)
                </div>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>TikTok (or Instagram)</span>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@yourhandle"
                  style={fieldStyle}
                />
                <div style={helperTextStyle}>
                  Instagram or TikTok (at least one required)
                </div>
              </label>

              {/* WHY DISCOVERY RADIO */}
              <h2 style={sectionHeadingStyle}>Why Discovery Radio?</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Why Discovery Radio? (or Bio)</span>
                <textarea
                  value={whyDiscoveryRadio}
                  onChange={(e) => setWhyDiscoveryRadio(e.target.value)}
                  placeholder="What resonates with you about Discovery Radio?"
                  style={textareaStyle}
                />
                <div style={helperTextStyle}>
                  Bio or Why Discovery Radio (at least one required)
                </div>
              </label>

              {/* NOTES (INTERNAL) */}
              <h2 style={sectionHeadingStyle}>Notes (Internal)</h2>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Leave blank (this is mainly for admin/testing) (optional)"
                  style={textareaStyle}
                />
                <div style={helperTextStyle}>
                  Most artists will leave this empty. That's fine.
                </div>
              </label>

              <div style={{ marginTop: "16px", marginBottom: "8px", fontSize: "0.85rem", opacity: 0.85 }}>
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {!artistName.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>Tell me what name you go by as an artist.</span>
                    </li>
                  )}
                  {!email.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>Drop your email so I can reach you if I need anything else.</span>
                    </li>
                  )}
                  {!primaryLink.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>Link your best song — the one you’d bet on.</span>
                    </li>
                  )}
                  {!location.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>{"Please include your location.\nContext and scene help me understand where your work is coming from."}</span>
                    </li>
                  )}
                  {!numberOfYears.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>{"Let me know how long you’ve been at this.\nExperience gives important context to your work."}</span>
                    </li>
                  )}
                  {!spotifyLink.trim() && !soundcloudLink.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>{"Please include a Spotify or SoundCloud link.\nThis helps me understand your commitment to putting music out into the world."}</span>
                    </li>
                  )}
                  {!instagram.trim() && !tiktok.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>{"I need at least one social handle (Instagram or TikTok).\nThis helps me understand how you present yourself as an artist."}</span>
                    </li>
                  )}
                  {!bio.trim() && !whyDiscoveryRadio.trim() && (
                    <li>
                      ❌ <span style={{ whiteSpace: "pre-line" }}>{"Tell me who you are or why Discovery Radio matters to you.\nOne of these helps me understand the intent behind the submission."}</span>
                    </li>
                  )}
                </ul>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  if (canSubmit) {
                    (e.target as HTMLElement).style.backgroundColor =
                      "rgba(242, 201, 76, 0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor =
                    "rgba(242, 201, 76, 0.15)";
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit your work"}
              </button>
            </form>
          </>
        )}
        </div>
      </div>
    </>
  );
}
