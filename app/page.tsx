'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Shield, Cpu, FileText, Globe, Server, Eye, Zap, ChevronDown } from 'lucide-react';

function LandingContent() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setShowCancelled(true);
      setTimeout(() => setShowCancelled(false), 5000);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });
      const data = await r.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const checks = [
    { icon: Globe, title: 'Full-Site Spider', desc: 'Crawls up to 50 pages deep, discovers every link & asset' },
    { icon: Shield, title: 'Security Headers', desc: '15 headers checked on every crawled page' },
    { icon: FileText, title: '67+ Sensitive Files', desc: '.env, .git, backup.sql, config files' },
    { icon: Lock, title: 'SQL Injection', desc: 'Error-based SQLi probes on every form' },
    { icon: Zap, title: 'XSS Detection', desc: 'Reflected XSS payloads on every input' },
    { icon: Server, title: 'SSL/TLS Audit', desc: 'HTTPS, HSTS, certificate & redirect analysis' },
    { icon: Cpu, title: 'DNS Security', desc: 'SPF, DKIM, DMARC, CAA records' },
    { icon: Eye, title: 'Subdomain Discovery', desc: '90+ common subdomains probed' },
    { icon: Shield, title: 'Port Scanning', desc: '19 dangerous ports (RDP, MySQL, Redis, etc.)' },
    { icon: Lock, title: 'Cookie Security', desc: 'Secure, HttpOnly, SameSite per page' },
    { icon: Cpu, title: 'Tech Fingerprint', desc: '30+ CMS, frameworks, CDNs detected' },
    { icon: Zap, title: 'GPC + Open Redirects', desc: 'Privacy compliance + redirect exploits' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-red-600/5 blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-red-900/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            <span className="text-xl font-bold tracking-tight">ABC<span className="text-red-500">Secure</span></span>
          </div>
          <a href="https://abcsecure.com" target="_blank" className="text-sm text-slate-400 hover:text-white transition-colors">Enterprise Security Audits</a>
        </div>
      </nav>

      {/* Cancelled Banner */}
      {showCancelled && (
        <div className="relative z-10 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-300">Payment cancelled. No charge was made. Feel free to try again.</p>
          </div>
        </div>
      )}

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="py-20 sm:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-xs text-red-400 font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Full-Site Deep Penetration Assessment — Spider + Attack Engine
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span className="text-white">Know Your</span><br />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-500 bg-clip-text text-transparent">Vulnerabilities</span>
              <br />
              <span className="text-white">Before Hackers Do</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              500–2,000+ automated checks. Full-site spider crawls every page. Attack engine tests every form.
              SSL, DNS, subdomains, ports. 20+ page PDF report. <strong className="text-white">One scan. $199.</strong>
            </p>

            {/* ═══ Payment Form ═══ */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block text-left">Website URL</label>
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="example.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block text-left">Business Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                  />
                </div>

                {error && <p className="text-sm text-red-400 text-left">{error}</p>}

                <button type="submit" disabled={loading || !url || !email}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to checkout...</>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Run Deep Scan — $199
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Encrypted</span>
                  <span>•</span>
                  <span>Powered by Stripe</span>
                  <span>•</span>
                  <span>Instant Results</span>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* What You Get */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black mb-3">500–2,000+ Deep Security Checks</h2>
              <p className="text-slate-400">Full-site crawl + attack engine. Every page. Every form. Every parameter. Every port.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {checks.map((c, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                  <c.icon className="w-7 h-7 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-sm mb-1">{c.title}</h3>
                  <p className="text-xs text-slate-500">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Enter Your URL', desc: 'Provide the website you want audited and your email address.' },
                { step: '02', title: 'Secure Payment', desc: 'One-time $199 payment via Stripe. No subscriptions.' },
                { step: '03', title: 'Watch the Deep Scan', desc: 'Spider crawls your site live. Attack engine tests everything. Full PDF in 2-5 minutes.' },
              ].map((s, i) => (
                <div key={i} className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-black text-red-500/20 mb-3">{s.step}</div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Findings */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">What We Find</h2>
            <div className="space-y-3 max-w-2xl mx-auto">
              {[
                { status: 'fail', name: '.env file exposed', detail: 'ACCESSIBLE — Database passwords, API keys, secrets', risk: 'Critical' },
                { status: 'fail', name: 'Missing Content-Security-Policy', detail: 'No CSP header — XSS and injection risk', risk: 'Medium' },
                { status: 'warn', name: 'No GPC Signal Support', detail: 'Required in 10+ US states — CCPA/CPRA violation risk', risk: 'Compliance' },
                { status: 'pass', name: 'HSTS Header Present', detail: 'max-age=31536000; includeSubDomains', risk: 'None' },
                { status: 'fail', name: 'phpMyAdmin Accessible', detail: 'Admin panel exposed at /phpmyadmin — brute force risk', risk: 'High' },
              ].map((c, i) => (
                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${c.status === 'fail' ? 'bg-red-500/5 border-red-500/10' : c.status === 'warn' ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-green-500/5 border-green-500/10'}`}>
                  {c.status === 'fail' ? <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> : c.status === 'warn' ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.detail}</div>
                  </div>
                  {c.risk !== 'None' && <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : c.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : c.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.risk}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">FAQ</h2>
            <div className="space-y-3">
              {[
                { q: 'What exactly do you scan?', a: 'Our spider crawls up to 50 pages deep, discovering every link, form, and parameter. Then we test every page for SQL injection, reflected XSS, open redirects, path traversal, and IDOR. We also audit SSL/TLS, DNS (SPF/DKIM/DMARC), discover subdomains, and scan 19 common ports. Plus: security headers, exposed files, admin panels, cookies, CORS, tech fingerprinting, and GPC compliance — on EVERY page.' },
                { q: 'How long does it take?', a: 'The deep scan takes 2-5 minutes depending on site size. You watch the progress live: spider crawling, pages being attacked, infrastructure being probed. Results appear in real-time.' },
                { q: 'Is my data safe?', a: 'Payment is processed by Stripe. We never store card details. Reports are encrypted and expire after 7 days.' },
                { q: 'Do you actually test for SQLi and XSS?', a: 'Yes. We send safe probe payloads to every form and parameter found on the site. We detect error-based SQL injection and reflected XSS by analyzing the response — we never inject destructive payloads or modify data.' },
                { q: 'Why $199?', a: 'A professional pentest costs $3,000–$15,000 and takes weeks. Our automated deep scan delivers 80% of the findings in 5 minutes for a fraction of the cost. Ideal for SMBs and quarterly audits.' },
                { q: 'Can I re-run the scan?', a: 'Each payment covers one deep scan. You can purchase additional scans at any time for updated results.' },
              ].map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Don&apos;t Wait for a Breach</h2>
            <p className="text-slate-400 mb-8">One deep scan. $199. Every page. Every form. Every vulnerability.</p>
            <a href="#top" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:from-red-500 hover:to-red-400 transition-all">
              <ShieldAlert className="w-5 h-5" /> Scan Now <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} ABCSecure — Enterprise Cybersecurity</p>
        <p className="mt-1">Professional Deep Security Assessment Services</p>
      </footer>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{a}</div>}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    }>
      <div id="top"><LandingContent /></div>
    </Suspense>
  );
}
