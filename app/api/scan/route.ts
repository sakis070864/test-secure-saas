import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { performDeepScan } from '@/lib/scanner';
import { createToken } from '@/lib/emailValidator';
import { sendVerificationEmail } from '@/lib/mailer';
import { saveLeadToSheet } from '@/lib/googleSheets';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { url, email, sessionId } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Verify payment was made (skip in test mode)
    const isTestMode = sessionId === 'TEST_MODE' && process.env.ALLOW_TEST_MODE === 'true';
    if (!isTestMode) {
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

    // Payment verified — run the homepage deep scan (headers, files, admin panels)
    const result = await performDeepScan(url);

    // Create token for report page
    const token = createToken(email, url, sessionId);

    // Send email with report link
    try {
      const baseUrl = request.headers.get('origin') || '';
      const reportLink = `${baseUrl}/report/${token}`;
      await sendVerificationEmail(email, url, reportLink);
    } catch (mailErr) {
      console.error('Failed to send report email:', mailErr);
    }

    // Save lead to Google Sheets
    try {
      await saveLeadToSheet({ email, url, grade: result.grade, score: result.score });
    } catch (sheetErr) {
      console.error('Google Sheets save failed:', sheetErr);
    }

    return NextResponse.json({ token, result });

  } catch (error: any) {
    console.error('Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
