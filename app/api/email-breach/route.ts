import { NextResponse } from 'next/server';

// Simple rate limit
const recentChecks = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const apiKey = process.env.HIBP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'HIBP API key not configured. Get one at haveibeenpwned.com/API/Key ($3.50/mo)',
        needsKey: true,
      }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Rate limit: 1 check per IP per 10 seconds
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const last = recentChecks.get(ip);
    if (last && Date.now() - last < 10000) {
      return NextResponse.json({ error: 'Please wait 10 seconds between checks' }, { status: 429 });
    }
    recentChecks.set(ip, Date.now());

    // Clean old entries
    if (recentChecks.size > 500) {
      const cutoff = Date.now() - 30000;
      for (const [k, v] of recentChecks) { if (v < cutoff) recentChecks.delete(k); }
    }

    const cleanEmail = email.trim().toLowerCase();

    // Call HIBP API (authenticated endpoint)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const hibpResponse = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(cleanEmail)}?truncateResponse=false`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ABCSecure-BreachCheck/1.0',
          'Accept': 'application/json',
          'hibp-api-key': apiKey,
        },
      }
    );
    clearTimeout(timeout);

    if (hibpResponse.status === 401) {
      return NextResponse.json({ error: 'Invalid HIBP API key', needsKey: true }, { status: 403 });
    }

    if (hibpResponse.status === 429) {
      return NextResponse.json({ error: 'Too many requests. Try again in a few seconds.' }, { status: 429 });
    }

    if (hibpResponse.status === 404) {
      // No breaches found
      return NextResponse.json({
        email: cleanEmail,
        breached: false,
        totalBreaches: 0,
        totalPwnedAccounts: 0,
        breaches: [],
      });
    }

    if (!hibpResponse.ok) {
      return NextResponse.json({
        email: cleanEmail,
        breached: false,
        totalBreaches: 0,
        totalPwnedAccounts: 0,
        breaches: [],
      });
    }

    const data = await hibpResponse.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        email: cleanEmail,
        breached: false,
        totalBreaches: 0,
        totalPwnedAccounts: 0,
        breaches: [],
      });
    }

    // Map breach data
    const breaches = data.map((b: any) => ({
      name: b.Name || '',
      title: b.Title || '',
      domain: b.Domain || '',
      breachDate: b.BreachDate || '',
      addedDate: b.AddedDate || '',
      pwnCount: b.PwnCount || 0,
      description: b.Description || '',
      dataClasses: b.DataClasses || [],
      isVerified: b.IsVerified || false,
      isSensitive: b.IsSensitive || false,
      isSpamList: b.IsSpamList || false,
      isMalware: b.IsMalware || false,
      logoPath: b.LogoPath ? `https://logos.haveibeenpwned.com/${b.LogoPath}` : '',
    }));

    // Sort newest first
    breaches.sort((a: any, b: any) => new Date(b.breachDate).getTime() - new Date(a.breachDate).getTime());

    const totalPwnedAccounts = breaches.reduce((sum: number, b: any) => sum + b.pwnCount, 0);

    return NextResponse.json({
      email: cleanEmail,
      breached: true,
      totalBreaches: breaches.length,
      totalPwnedAccounts,
      breaches,
    });

  } catch (error: any) {
    console.error('Email breach check error:', error);
    return NextResponse.json({ error: error.message || 'Check failed' }, { status: 500 });
  }
}
