import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stores newsletter signups in Supabase (genrise-tools project,
 * public.newsletter_signups — insert-only for the anon role via RLS).
 * Degrades gracefully: when SUPABASE_URL/ANON_KEY aren't set (local dev,
 * preview deploys) the endpoint still succeeds so the UI promise holds.
 */
export async function POST(request: Request) {
  let email: string;
  let source: string;
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    source = typeof body?.source === "string" ? body.source.slice(0, 64) : "homepage";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const res = await fetch(`${url}/rest/v1/newsletter_signups`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, source }),
    cache: "no-store",
  });

  // 409 = the email is already subscribed — treat it as a success so the
  // UI doesn't punish people for signing up twice.
  if (!res.ok && res.status !== 409) {
    return NextResponse.json({ error: "Signup failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
