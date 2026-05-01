import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { url, email } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    const origin = request.headers.get('origin') || 'https://abcsecure.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Deep Penetration Security Audit — Full Site',
            description: `Full-site spider + attack engine scan (500-2,000+ checks) for ${url}`,
          },
          unit_amount: 19900, // $199.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&url=${encodeURIComponent(url)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${origin}/?cancelled=true`,
      metadata: {
        scan_url: url,
        client_email: email,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
