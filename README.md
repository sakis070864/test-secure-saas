<p align="center">
  <img src="public/icon.png" alt="AthanDeepScan" width="80" />
</p>

<h1 align="center">AthanDeepScan</h1>

<p align="center">
  <strong>Enterprise-Grade Website Security Audit — $50 Per Scan</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#security-checks">Security Checks</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#environment-variables">Environment Variables</a>
</p>

---

## Overview

AthanDeepScan is a **B2B SaaS security scanner** that performs a comprehensive **150+ point vulnerability assessment** on any website. Clients pay a one-time **$50 fee via Stripe Checkout**, and receive:

- **Instant on-screen results** with a full interactive dashboard
- **Download-ready PDF report** — professional, print-friendly, multi-page
- **Email delivery** — report link sent directly to the client's inbox (valid for 7 days)

No subscriptions. No recurring charges. One scan, one price, full transparency.

---

## Features

| Feature | Description |
|---------|-------------|
| 🛡️ **150+ Security Checks** | Headers, exposed files, admin panels, cookies, CORS, HTTP methods, HTML analysis |
| 💳 **Stripe Payment Gate** | Scan results are only delivered after successful $50 payment verification |
| 📄 **PDF Report Generation** | Multi-page, print-friendly PDF with color-coded risk levels and branded footer |
| 📧 **Email Delivery** | Automated report link sent to the client via SMTP (Nodemailer) |
| 🔍 **Technology Fingerprinting** | Detects 30+ CMS platforms, frameworks, CDNs, and libraries |
| 👁️ **Tracker Detection** | Identifies pre-consent trackers (Google Analytics, Meta Pixel, TikTok, etc.) |
| 🌐 **GPC Compliance Check** | Validates Global Privacy Control signal support (CCPA/CPRA requirement) |
| 📊 **Google Sheets Integration** | Every scan is logged as a lead in a Google Sheet for CRM purposes |
| 🔒 **A-Grade Security Headers** | The scanner itself ships with 13 hardened security headers |
| ⚡ **Edge-Optimized** | Deployed on Vercel's serverless infrastructure for sub-30s scan times |

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        PAYMENT FLOW                              │
│                                                                  │
│  1. Client enters URL + Email                                    │
│  2. Frontend calls /api/create-checkout                          │
│  3. Stripe Checkout Session created ($50)                        │
│  4. Client pays on Stripe                                        │
│  5. Redirected to /success?session_id=...                        │
│  6. Success page calls /api/scan with session ID                 │
│  7. API verifies payment via stripe.checkout.sessions.retrieve() │
│  8. Only if payment_status === 'paid' → scan runs                │
│  9. 150+ checks execute in parallel                              │
│ 10. Results displayed + PDF available + email sent                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Checks

### 🛡️ Security Headers (15 checks)
`Strict-Transport-Security` · `X-Frame-Options` · `X-Content-Type-Options` · `Content-Security-Policy` · `Referrer-Policy` · `Permissions-Policy` · `X-XSS-Protection` · `Cross-Origin-Opener-Policy` · `Cross-Origin-Resource-Policy` · `Cross-Origin-Embedder-Policy` · `Cache-Control` · `Pragma` · `X-Permitted-Cross-Domain-Policies` · `X-DNS-Prefetch-Control` · `Expect-CT`

### 📁 Exposed Files & Paths (67 checks)
`.env` · `.env.backup` · `.env.local` · `.env.production` · `.git/config` · `.git/HEAD` · `wp-config.php` · `.htpasswd` · `backup.sql` · `database.sql` · `dump.sql` · `debug.log` · `phpinfo.php` · `id_rsa` · `sftp-config.json` · `docker-compose.yml` · `composer.json` · `package.json` · and 49 more...

### 🔓 Admin Panels (20 checks)
`/wp-admin` · `/wp-login.php` · `/admin` · `/administrator` · `/phpmyadmin` · `/cpanel` · `/webmail` · `/login` · `/dashboard` · `/panel` · `/manage` · `/adminer.php` · and more...

### 🍪 Cookie Security
Validates `Secure`, `HttpOnly`, and `SameSite` flags on every cookie set during the initial page load.

### 🌐 CORS Policy Analysis
Detects dangerous wildcard origins (`*`), credential exposure, and overly permissive cross-origin configurations.

### 💬 Information Disclosure (6 checks)
`Server` · `X-Powered-By` · `X-ASPNet-Version` · `X-Generator` · `X-Debug` · `X-Runtime`

### 📡 HTTP Methods (5 checks)
Tests for dangerous methods: `PUT` · `DELETE` · `TRACE` · `CONNECT` · `PATCH`

### 📄 HTML Content Analysis (10 checks)
Mixed content · Inline scripts · Insecure forms · Password fields · External iframes · Base tag hijacking · Generator meta tags · Exposed email addresses · Source maps · Suspicious HTML comments

### 🔍 Technology Fingerprinting (30+ technologies)
WordPress · Joomla · Drupal · Shopify · WooCommerce · Wix · Squarespace · Webflow · React · Next.js · Vue.js · Angular · Svelte · jQuery · Bootstrap · Tailwind CSS · Cloudflare · AWS CloudFront · Nginx · Apache · PHP · ASP.NET · Laravel · Express.js · and more...

### 👁️ Tracker Detection (20+ trackers)
Google Analytics · Google Tag Manager · Meta/Facebook Pixel · TikTok Pixel · LinkedIn Insight Tag · Microsoft Clarity · Hotjar · Bing UET · Google Ads/DoubleClick · Pinterest Tag · Twitter/X Pixel · Snapchat Pixel · HubSpot · Intercom · Drift · Segment · Mixpanel · Heap · Amplitude · Crazy Egg

### 🌐 GPC Compliance
Checks for `/.well-known/gpc.json` — required for CCPA/CPRA compliance in 10+ US states.

---

## Scoring & Grading

| Grade | Score Range | Description |
|-------|-----------|-------------|
| **A** | 91–100 | Excellent security posture |
| **B** | 71–90 | Good, minor improvements needed |
| **C** | 51–70 | Fair, significant gaps detected |
| **D** | 31–50 | Poor, critical issues present |
| **F** | 0–30 | Failing, immediate action required |

**Scoring formula:**
- Start at 100 points
- Critical findings: −8 points each
- High findings: −5 points each
- Medium findings: −3 points each
- Low findings: −1 point each
- Warnings: −0.5 points each
- No GPC support: −3 points
- Each pre-consent tracker: −2 points

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Payment** | Stripe Checkout (one-time $50) |
| **PDF Generation** | jsPDF (client-side) |
| **Email** | Nodemailer (SMTP) |
| **Lead Tracking** | Google Sheets API |
| **Icons** | Lucide React |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel (Serverless) |
| **Auth Model** | Stateless base64url tokens (7-day expiry) |

---

## Project Structure

```
security-scanner-saas/
├── app/
│   ├── page.tsx                      # Landing page with Stripe form
│   ├── layout.tsx                    # Root layout + metadata
│   ├── globals.css                   # Global styles
│   ├── success/
│   │   └── page.tsx                  # Post-payment results + PDF download
│   ├── report/
│   │   └── [token]/
│   │       └── page.tsx              # Email-linked report page
│   └── api/
│       ├── create-checkout/
│       │   └── route.ts              # Stripe Checkout session creation
│       ├── scan/
│       │   └── route.ts              # Payment-verified scan execution
│       └── report/
│           └── [token]/
│               └── route.ts          # Token-based report API
├── lib/
│   ├── scanner.ts                    # 150+ point scan engine
│   ├── scanChecks.ts                 # Check databases (headers, paths, trackers)
│   ├── emailValidator.ts             # Token creation & decoding
│   ├── mailer.ts                     # SMTP email delivery
│   └── googleSheets.ts              # Google Sheets lead logging
├── public/
│   ├── icon.png                      # Favicon
│   ├── apple-icon.png                # Apple touch icon
│   └── .well-known/
│       └── gpc.json                  # GPC compliance signal
├── next.config.ts                    # Security headers + config
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

---

## Deployment

### Prerequisites
- Node.js 18+
- Stripe account (test or live keys)
- SMTP server (for email delivery)
- Google Service Account (for Sheets integration, optional)

### Quick Deploy to Vercel

1. **Import the repository** on [vercel.com/new](https://vercel.com/new)
2. **Add environment variables** (see below)
3. **Deploy** — Vercel auto-detects Next.js and configures everything
4. **Add custom domain** in Vercel → Settings → Domains

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev

# Build for production
npm run build
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (starts with `sk_test_` or `sk_live_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (starts with `pk_test_` or `pk_live_`) |
| `SMTP_HOST` | ⬜ | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | ⬜ | SMTP port (default: `587`) |
| `SMTP_USER` | ⬜ | SMTP username/email |
| `SMTP_PASS` | ⬜ | SMTP password or app-specific password |
| `EMAIL_FROM` | ⬜ | Sender address (default: `"Athan Security" <noreply@sakis-athan.com>`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ⬜ | Google service account credentials JSON (for Sheets) |

> **Note:** Email and Google Sheets are optional — the scanner works without them. Payment + scan + PDF are fully functional with only the Stripe keys.

---

## Security

This application practices what it preaches:

- ✅ **13 hardened security headers** (HSTS, CSP, COOP, CORP, COEP, etc.)
- ✅ **GPC compliance** signal at `/.well-known/gpc.json`
- ✅ **No info disclosure** — no server/technology headers exposed
- ✅ **Stripe-handled payments** — no card data touches our servers
- ✅ **Stateless tokens** — no database, no session storage
- ✅ **HTTPS enforced** — via HSTS preload directive
- ✅ **CSP configured** — whitelists only Stripe + Vercel Analytics

---

## License

Proprietary — © 2026 Athanasios (Sakis) Athanasopoulos. All rights reserved.

---

<p align="center">
  <strong>Built by <a href="https://sakis-athan.com">Sakis Athanasopoulos</a></strong><br/>
  Professional Cybersecurity Assessment Services
</p>
