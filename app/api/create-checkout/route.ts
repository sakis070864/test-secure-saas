import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const TIER_CONFIG = {
  standard: {
    name: 'Standard Security Audit',
    description: (url: string) => `Business security audit — 150+ checks for ${url}`,
    amount: 2000, // $20.00
  },
  deep: {
    name: 'Deep Penetration Security Audit — Full Site',
    description: (url: string) => `Full-site spider + attack engine scan (500-2,000+ checks) for ${url}`,
    amount: 9900, // $99.00
  },
};

export async function POST(request: Request) {
  try {
    const { url, email, tier = 'deep', subdomains = '' } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
    if (!config) return NextResponse.json({ error: 'Invalid tier. Use "standard" or "deep"' }, { status: 400 });

    const origin = request.headers.get('origin') || 'https://abcsecure.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: config.name,
            description: config.description(url),
          },
          unit_amount: config.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&url=${encodeURIComponent(url)}&email=${encodeURIComponent(email)}&tier=${tier}${subdomains ? `&subdomains=${encodeURIComponent(subdomains)}` : ''}`,
      cancel_url: `${origin}/?cancelled=true`,
      metadata: {
        scan_url: url,
        client_email: email,
        tier: tier,
        subdomains: subdomains || '',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
