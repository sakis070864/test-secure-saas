import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { scanInfrastructure } from '@/lib/infrastructure';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { url, sessionId } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Verify payment
    if (!sessionId) return NextResponse.json({ error: 'Payment required' }, { status: 403 });
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Payment not completed' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid payment session' }, { status: 403 });
    }

    // Run infrastructure scan (SSL, DNS, subdomains, ports)
    const results = await scanInfrastructure(url);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Infrastructure Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Infrastructure scan failed' }, { status: 500 });
  }
}
