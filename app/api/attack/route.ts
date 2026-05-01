import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { attackPages } from '@/lib/attacker';
import type { DiscoveredForm } from '@/lib/spider';
import { verifyAdminToken } from '@/app/api/admin-auth/route';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { sessionId, pages } = await request.json();

    // Verify payment (skip in test/admin mode)
    const isTestMode = sessionId === 'TEST_MODE' && process.env.ALLOW_TEST_MODE === 'true';
    const isAdmin = typeof sessionId === 'string' && verifyAdminToken(sessionId);
    if (!isTestMode && !isAdmin) {
      if (!sessionId) return NextResponse.json({ error: 'Payment required' }, { status: 403 });
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
          return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid payment session' }, { status: 403 });
      }
    }

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Pages array is required' }, { status: 400 });
    }

    // Run attacks on this batch of pages
    const results = await attackPages(
      pages.map((p: { url: string; forms: DiscoveredForm[]; parameters: string[]; responseHeaders: Record<string, string> }) => ({
        url: p.url,
        forms: p.forms || [],
        parameters: p.parameters || [],
        responseHeaders: p.responseHeaders || {},
      }))
    );

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Attack Error:', error);
    return NextResponse.json({ error: error.message || 'Attack scan failed' }, { status: 500 });
  }
}
