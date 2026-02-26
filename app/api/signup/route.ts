import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.DR_SIGNUP_SCRIPT_URL!;
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const appsScriptUrl = process.env.GOOGLE_SCRIPT_EXEC_URL;
    if (!appsScriptUrl) {
      return NextResponse.json({ success: false, error: "missing GOOGLE_SCRIPT_EXEC_URL" }, { status: 500 });
    }
    
    // Call Apps Script server-side (no CORS issues)
    const url = `${appsScriptUrl}?email=${encodeURIComponent(normalizedEmail)}&t=${Date.now()}`;

    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const text = await response.text();

    // Parse response from Apps Script
    if (text.startsWith('ok|')) {
      return NextResponse.json({ success: true, reqId: text.split('|')[1] });
    } else if (text === 'duplicate') {
      return NextResponse.json({ success: false, message: 'duplicate' }, { status: 200 });
    } else if (text.startsWith('error|')) {
      return NextResponse.json({ success: false, error: text }, { status: 500 });
    } else {
      return NextResponse.json({ success: false, error: text }, { status: 500 });
    }
  } catch (error) {
    console.error('API signup error:', error);
    return NextResponse.json({ success: false, error: 'server error' }, { status: 500 });
  }
}
