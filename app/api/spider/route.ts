import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { spiderSite } from '@/lib/spider';

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

    // Phase 1: Spider the entire site
    const spiderResult = await spiderSite(url);

    // Return sitemap (without full HTML to keep response size small)
    const sitemap = spiderResult.pages.map(p => ({
      url: p.url,
      statusCode: p.statusCode,
      contentType: p.contentType,
      forms: p.forms,
      parameters: p.parameters,
      responseHeaders: p.responseHeaders,
      internalLinks: p.internalLinks.length,
      externalLinks: p.externalLinks.length,
      scripts: p.scripts.length,
      depth: p.depth,
    }));

    return NextResponse.json({
      sitemap,
      totalPages: spiderResult.totalPages,
      totalForms: spiderResult.totalForms,
      totalParameters: spiderResult.totalParameters,
      totalInternalLinks: spiderResult.totalInternalLinks,
      totalExternalLinks: spiderResult.totalExternalLinks,
      crawlDepth: spiderResult.crawlDepth,
      crawlTimeMs: spiderResult.crawlTimeMs,
      domain: spiderResult.domain,
    });

  } catch (error: any) {
    console.error('Spider Error:', error);
    return NextResponse.json({ error: error.message || 'Crawl failed' }, { status: 500 });
  }
}
