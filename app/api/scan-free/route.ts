import { NextResponse } from 'next/server';
import { performFreeScan } from '@/lib/scannerFree';

// Simple in-memory rate limit (per deployment instance)
const recentScans = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Basic rate limiting — 1 scan per IP per 60 seconds
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const lastScan = recentScans.get(ip);
    if (lastScan && Date.now() - lastScan < 60000) {
      return NextResponse.json({ error: 'Please wait 60 seconds between free scans' }, { status: 429 });
    }
    recentScans.set(ip, Date.now());

    // Clean old entries every 100 requests
    if (recentScans.size > 500) {
      const cutoff = Date.now() - 120000;
      for (const [k, v] of recentScans) { if (v < cutoff) recentScans.delete(k); }
    }

    const result = await performFreeScan(url);
    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Free scan error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
