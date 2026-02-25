import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();

    // Validate required fields
    const { artistName, email, primaryLink, spotifyLink, soundcloudLink, location, genre, numberOfYears, instagram, tiktok, bio, whyDiscoveryRadio } = body;

    if (!artistName || typeof artistName !== "string" || !artistName.trim()) {
      return NextResponse.json(
        { error: "artistName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "email is required and must be a string" },
        { status: 400 }
      );
    }

    if (!primaryLink || typeof primaryLink !== "string" || !primaryLink.trim()) {
      return NextResponse.json(
        { error: "primaryLink is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate location
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json(
        { error: "Please include your location.\nContext and scene help me understand where your work is coming from." },
        { status: 400 }
      );
    }

    // Validate genre
    if (!genre || typeof genre !== "string" || !genre.trim()) {
      return NextResponse.json(
        { error: "Please include a genre.\nThis helps me understand how you frame your own work." },
        { status: 400 }
      );
    }

    // Validate numberOfYears
    if (!numberOfYears || (typeof numberOfYears !== "string" && typeof numberOfYears !== "number") || (typeof numberOfYears === "string" && !numberOfYears.trim())) {
      return NextResponse.json(
        { error: "Let me know how long you've been at this.\nExperience gives important context to your work." },
        { status: 400 }
      );
    }

    // At least one of Spotify or SoundCloud required
    const hasSpotify = spotifyLink && typeof spotifyLink === "string" && spotifyLink.trim().length > 0;
    const hasSoundcloud = soundcloudLink && typeof soundcloudLink === "string" && soundcloudLink.trim().length > 0;
    if (!hasSpotify && !hasSoundcloud) {
      return NextResponse.json(
        { error: "Please include a Spotify or SoundCloud link.\nThis helps me understand your commitment to putting music out into the world." },
        { status: 400 }
      );
    }

    // At least one of instagram or tiktok required
    const hasInstagram = instagram && typeof instagram === "string" && instagram.trim().length > 0;
    const hasTiktok = tiktok && typeof tiktok === "string" && tiktok.trim().length > 0;
    if (!hasInstagram && !hasTiktok) {
      return NextResponse.json(
        { error: "I need at least one social handle (Instagram or TikTok).\nThis helps me understand how you present yourself as an artist." },
        { status: 400 }
      );
    }

    // At least one of bio or whyDiscoveryRadio required
    const hasBio = bio && typeof bio === "string" && bio.trim().length > 0;
    const hasWhy = whyDiscoveryRadio && typeof whyDiscoveryRadio === "string" && whyDiscoveryRadio.trim().length > 0;
    if (!hasBio && !hasWhy) {
      return NextResponse.json(
        { error: "Tell me who you are or why Discovery Radio matters to you.\nOne of these helps me understand the intent behind the submission." },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check for Apps Script URL
    const appsScriptUrl = process.env.APPS_SCRIPT_SUBMIT_URL;
    if (!appsScriptUrl) {
      return NextResponse.json(
        { error: "Apps Script URL is not configured" },
        { status: 500 }
      );
    }

    // Prepare payload with snake_case keys for Apps Script template
    const payload: Record<string, any> = {
      name: body.name?.trim() || "",
      artist_name: artistName.trim(),
      email: normalizedEmail,
      phone: body.phone?.trim() || "",
      location: body.location?.trim() || "",
      genre: body.genre?.trim() || "",
      bio: body.bio?.trim() || "",
      number_of_years: body.numberOfYears?.trim() || "",
      best_song_link: primaryLink.trim(),
      spotify_link: body.spotifyLink?.trim() || "",
      soundcloud_link: body.soundcloudLink?.trim() || "",
      youtube_link: body.youtubeLink?.trim() || "",
      instagram_link: body.instagram?.trim() || "",
      tiktok_link: body.tiktok?.trim() || "",
      why_discovery_radio: body.whyDiscoveryRadio?.trim() || "",
      notes: body.notes?.trim() || "",
      submitted_at: new Date().toISOString(),
    };

    // Forward to Apps Script
    let appsScriptResponse: Response;
    try {
      appsScriptResponse = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr: any) {
      return NextResponse.json(
        { error: "Failed to reach apps script service" },
        { status: 502 }
      );
    }

    // Check response status
    if (appsScriptResponse.status < 200 || appsScriptResponse.status > 299) {
      return NextResponse.json(
        { error: "apps script error" },
        { status: 502 }
      );
    }

    // Read response text
    let responseText = "";
    try {
      responseText = await appsScriptResponse.text();
    } catch {
      responseText = "";
    }

    // Check if response contains "ok"
    if (responseText.toLowerCase().includes("ok")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Otherwise return error with response text
    return NextResponse.json(
      { error: responseText || "apps script error" },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
