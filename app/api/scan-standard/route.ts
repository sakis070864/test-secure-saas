import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { performStandardScan } from '@/lib/scannerStandard';
import { createToken } from '@/lib/emailValidator';
import { saveLeadToSheet } from '@/lib/googleSheets';
import { verifyAdminToken } from '@/app/api/admin-auth/route';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { url, email, sessionId } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Verify $20 payment (skip in test/admin mode)
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

    // No email domain validation for Standard tier — accept any email
    const result = await performStandardScan(url);

    // Save lead
    try { await saveLeadToSheet({ email, url, grade: result.grade, score: result.score }); } catch {}

    // Generate token for report access
    const token = createToken(email, url, sessionId || 'standard');

    return NextResponse.json({ result, token });

  } catch (error: any) {
    console.error('Standard scan error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
