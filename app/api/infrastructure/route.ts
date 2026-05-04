import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { scanInfrastructure } from '@/lib/infrastructure';
import { verifyAdminToken } from '@/app/api/admin-auth/route';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { url, sessionId, subdomains } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Verify payment (skip in test/admin mode)
    const isTestMode = sessionId === 'TEST_MODE' && process.env.ALLOW_TEST_MODE === 'true';
    const isAdmin = typeof sessionId === 'string' && verifyAdminToken(sessionId);
    if (!isTestMode && !isAdmin) {
      if (!sessionId) return NextResponse.json({ error: 'Payment required' }, { status: 403 });
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
          return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid payment session' }, { status: 403 });
      }
    }

    // Run infrastructure scan (SSL, DNS, subdomains, ports)
    const userSubdomains = subdomains ? subdomains.split(/[,\s\n]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];
    const results = await scanInfrastructure(url, userSubdomains);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Infrastructure Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Infrastructure scan failed' }, { status: 500 });
  }
}
