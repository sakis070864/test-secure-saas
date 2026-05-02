'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Shield, Cpu, FileText, Globe, Server, Eye, Zap, ChevronDown, Sparkles } from 'lucide-react';

function LandingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [freeUrl, setFreeUrl] = useState('');
  const [stdUrl, setStdUrl] = useState('');
  const [stdEmail, setStdEmail] = useState('');
  const [deepUrl, setDeepUrl] = useState('');
  const [deepEmail, setDeepEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setShowCancelled(true);
      setTimeout(() => setShowCancelled(false), 5000);
    }
    const upgradeUrl = searchParams.get('url');
    if (upgradeUrl) {
      setStdUrl(upgradeUrl);
      setDeepUrl(upgradeUrl);
    }
  }, [searchParams]);

  const handleFree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeUrl) return;
    router.push(`/scan/free?url=${encodeURIComponent(freeUrl)}`);
  };

  const handlePaid = async (e: React.FormEvent, tier: 'standard' | 'deep') => {
    e.preventDefault();
    const url = tier === 'standard' ? stdUrl : deepUrl;
    const email = tier === 'standard' ? stdEmail : deepEmail;
    if (!url || !email) return;
    setLoading(tier);
    setError('');
    try {
      const r = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email, tier }),
      });
      const data = await r.json();
      if (data.error) { setError(data.error); setLoading(null); return; }
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(220,38,38,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.03) 1px, transparent 1px)`,
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
          <a href="https://sakis-athan.com" target="_blank" className="text-sm text-slate-400 hover:text-white transition-colors">Get Support</a>
        </div>
      </nav>

      {showCancelled && (
        <div className="relative z-10 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-300">Payment cancelled. No charge was made.</p>
          </div>
        </div>
      )}

      <main className="relative z-10">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-xs text-red-400 font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Professional Security Assessments — 3 Tiers
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span className="text-white">Know Your</span><br />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-500 bg-clip-text text-transparent">Vulnerabilities</span>
              <br />
              <span className="text-white">Before Hackers Do</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              Our engine <span className="text-cyan-400 font-semibold">crawls every page</span> of your site,{' '}
              <span className="text-yellow-400 font-semibold">maps every link, form & parameter</span>,{' '}
              then launches <span className="text-red-400 font-semibold">real attack payloads</span> —{' '}
              <span className="text-orange-400 font-semibold">SQL injection</span>,{' '}
              <span className="text-pink-400 font-semibold">XSS</span>,{' '}
              <span className="text-purple-400 font-semibold">open redirects</span>,{' '}
              <span className="text-emerald-400 font-semibold">path traversal</span> — against every endpoint.{' '}
              It scans your <span className="text-blue-400 font-semibold">SSL, DNS, ports & subdomains</span>,{' '}
              fingerprints your <span className="text-teal-400 font-semibold">server stack</span>,{' '}
              and delivers a{' '}
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent font-bold">
                professional audit report
              </span>{' '}
              — all in minutes.
            </p>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — 4 PHASES ═══ */}
        <section className="pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3">How The Scanner Works</h2>
            <p className="text-sm text-slate-500 text-center mb-12 max-w-xl mx-auto">Our automated 4-phase pipeline scans, crawls, attacks, and audits your entire infrastructure — so you don&apos;t have to.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

              {/* PHASE 1 */}
              <div className="relative bg-gradient-to-br from-red-500/10 to-red-900/5 border border-red-500/20 rounded-2xl p-6 hover:border-red-500/40 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-black text-sm group-hover:bg-red-500/30 transition-colors">1</div>
                  <div>
                    <div className="text-xs text-red-400 font-bold uppercase tracking-wider">Phase 1</div>
                    <h3 className="text-lg font-bold text-white">Security Scan Engine</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Checks <span className="text-white font-medium">15 security headers</span> (HSTS, CSP, X-Frame, CORS...)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Probes <span className="text-white font-medium">69 sensitive files</span> (.env, .git, backup.sql, SSH keys...)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Hunts <span className="text-white font-medium">20 admin panels</span> (wp-admin, phpMyAdmin, cPanel...)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Tests <span className="text-white font-medium">5 dangerous HTTP methods</span> (PUT, DELETE, TRACE...)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Audits <span className="text-white font-medium">cookies, CORS, info disclosure, HTML security</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span> Fingerprints <span className="text-white font-medium">31 technologies</span> &amp; detects <span className="text-white font-medium">29 trackers</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Available in: Free, Standard, Deep</span>
                  <span className="text-xs font-bold text-red-400">~50–150 checks</span>
                </div>
              </div>

              {/* PHASE 2 */}
              <div className="relative bg-gradient-to-br from-cyan-500/10 to-cyan-900/5 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/40 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-sm group-hover:bg-cyan-500/30 transition-colors">2</div>
                  <div>
                    <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Phase 2</div>
                    <h3 className="text-lg font-bold text-white">Spider Crawler</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Crawls up to <span className="text-white font-medium">50 pages</span>, <span className="text-white font-medium">5 levels deep</span></li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Discovers every <span className="text-white font-medium">link, form &amp; input field</span></li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Maps all <span className="text-white font-medium">URL parameters</span> (query strings)</li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Catalogs all <span className="text-white font-medium">JavaScript files</span> loaded</li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Separates <span className="text-white font-medium">internal vs external links</span></li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">▸</span> Builds a <span className="text-white font-medium">complete attack surface map</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Deep Scan only ($99)</span>
                  <span className="text-xs font-bold text-cyan-400">50 pages mapped</span>
                </div>
              </div>

              {/* PHASE 3 */}
              <div className="relative bg-gradient-to-br from-orange-500/10 to-orange-900/5 border border-orange-500/20 rounded-2xl p-6 hover:border-orange-500/40 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm group-hover:bg-orange-500/30 transition-colors">3</div>
                  <div>
                    <div className="text-xs text-orange-400 font-bold uppercase tracking-wider">Phase 3</div>
                    <h3 className="text-lg font-bold text-white">Attack Engine</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> <span className="text-white font-medium">SQL Injection</span> — 5 payloads, 19 error signatures</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> <span className="text-white font-medium">Cross-Site Scripting (XSS)</span> — 3 reflected payloads per form</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> <span className="text-white font-medium">Open Redirects</span> — tests 11+ redirect parameters</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> <span className="text-white font-medium">Path Traversal / LFI</span> — probes for /etc/passwd, win.ini</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> <span className="text-white font-medium">IDOR</span> — tests if changing IDs exposes other users&apos; data</li>
                  <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">▸</span> Runs <span className="text-white font-medium">header checks on every crawled page</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Deep Scan only ($99)</span>
                  <span className="text-xs font-bold text-orange-400">Real attack simulation</span>
                </div>
              </div>

              {/* PHASE 4 */}
              <div className="relative bg-gradient-to-br from-purple-500/10 to-purple-900/5 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm group-hover:bg-purple-500/30 transition-colors">4</div>
                  <div>
                    <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Phase 4</div>
                    <h3 className="text-lg font-bold text-white">Infrastructure Audit</h3>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> <span className="text-white font-medium">SSL/TLS</span> — HTTPS, HSTS, preload, redirect chain</li>
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> <span className="text-white font-medium">DNS Security</span> — SPF, DKIM, DMARC, MX, CAA records</li>
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> <span className="text-white font-medium">90+ subdomains</span> scanned (dev, staging, admin, db...)</li>
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> <span className="text-white font-medium">19 ports</span> scanned (SSH, MySQL, RDP, MongoDB, Redis...)</li>
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> Flags <span className="text-white font-medium">dangerous exposed services</span></li>
                  <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span> Delivers a <span className="text-white font-medium">20+ page professional PDF report</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Deep Scan only ($99)</span>
                  <span className="text-xs font-bold text-purple-400">Full infrastructure map</span>
                </div>
              </div>

            </div>

            {/* Connection Flow */}
            <div className="flex items-center justify-center gap-2 mt-8 text-xs text-slate-500">
              <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 font-bold border border-red-500/20">Phase 1</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">Phase 2</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">Phase 3</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">Phase 4</span>
            </div>
            <p className="text-center text-xs text-slate-600 mt-3">Each phase feeds into the next — more pages = more forms = more attack vectors = more checks</p>

          </div>
        </section>

        {/* ═══ 3 PRICING CARDS ═══ */}
        <section id="pricing" className="pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

              {/* ── FREE ── */}
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-white/20 transition-all">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Free</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">$0</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Quick security check</p>
                <ul className="space-y-2 text-sm text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> ~50 security checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 8 security headers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> SSL & cookie audit</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 5 critical file checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Tech fingerprinting</li>
                  <li className="flex items-center gap-2 text-slate-600"><Lock className="w-4 h-4 shrink-0" /> No PDF report</li>
                  <li className="flex items-center gap-2 text-slate-600"><Lock className="w-4 h-4 shrink-0" /> No spider / attacks</li>
                </ul>
                <form onSubmit={handleFree} className="space-y-3">
                  <input type="text" value={freeUrl} onChange={e => setFreeUrl(e.target.value)} placeholder="example.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-slate-500/50 transition-all" />
                  <button type="submit" className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                    <Zap className="w-4 h-4" /> Run Free Scan
                  </button>
                </form>
              </div>

              {/* ── STANDARD $20 ── */}
              <div className="bg-white/[0.02] border border-blue-500/30 rounded-3xl p-6 sm:p-8 hover:border-blue-500/50 transition-all relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Popular</div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Standard</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">$20</span>
                  <span className="text-sm text-slate-500">/scan</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Business security audit</p>
                <ul className="space-y-2 text-sm text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 150+ security checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 15 headers + 67 files</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 20 admin panel probes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Cookie + CORS + HTML</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> PDF report download</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Any email accepted</li>
                  <li className="flex items-center gap-2 text-slate-600"><Lock className="w-4 h-4 shrink-0" /> No spider / attacks</li>
                </ul>
                <form onSubmit={e => handlePaid(e, 'standard')} className="space-y-3">
                  <input type="text" value={stdUrl} onChange={e => setStdUrl(e.target.value)} placeholder="example.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                  <input type="email" value={stdEmail} onChange={e => setStdEmail(e.target.value)} placeholder="you@email.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                  <button type="submit" disabled={loading === 'standard'}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {loading === 'standard' ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</> : <><Lock className="w-4 h-4" /> Scan — $20</>}
                  </button>
                </form>
              </div>

              {/* ── DEEP $99 ── */}
              <div className="bg-gradient-to-b from-red-500/5 to-transparent border border-red-500/30 rounded-3xl p-6 sm:p-8 hover:border-red-500/50 transition-all relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Full Pentest</div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Deep Scan</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">$99</span>
                  <span className="text-sm text-slate-500">/scan</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Full penetration assessment</p>
                <ul className="space-y-2 text-sm text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> 500–2,000+ checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Spider crawls 50 pages</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> SQLi + XSS attacks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> SSL, DNS, ports, subs</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" /> 20+ page PDF report</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" /> Open redirect + IDOR</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" /> Full infrastructure scan</li>
                </ul>
                <form onSubmit={e => handlePaid(e, 'deep')} className="space-y-3">
                  <input type="text" value={deepUrl} onChange={e => setDeepUrl(e.target.value)} placeholder="example.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500/50 transition-all" />
                  <input type="email" value={deepEmail} onChange={e => setDeepEmail(e.target.value)} placeholder="you@company.com" required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500/50 transition-all" />
                  <button type="submit" disabled={loading === 'deep'}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {loading === 'deep' ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</> : <><ShieldAlert className="w-4 h-4" /> Deep Scan — $99</>}
                  </button>
                </form>
              </div>

            </div>

            {error && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 mt-6">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Encrypted</span>
              <span>•</span><span>Powered by Stripe</span><span>•</span><span>Instant Results</span>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-8">Compare Plans</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 text-slate-400 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Free</th>
                    <th className="text-center py-3 px-4 text-blue-400 font-medium">Standard</th>
                    <th className="text-center py-3 px-4 text-red-400 font-medium">Deep</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {[
                    ['Security checks', '~50', '150+', '500–2,000+'],
                    ['Security headers', '8', '15', '15/page'],
                    ['Sensitive files', '5', '67+', '67+/page'],
                    ['Admin panel probes', '—', '20', '20'],
                    ['Spider crawl', '—', '—', '✓ 50 pages'],
                    ['SQLi / XSS attacks', '—', '—', '✓'],
                    ['SSL / DNS / Ports', '—', '—', '✓'],
                    ['Subdomain discovery', '—', '—', '✓ 90+'],
                    ['PDF report', '—', '✓', '✓ 20+ pages'],
                    ['Email required', '—', 'Any email', 'Any email'],
                    ['Price', 'Free', '$20', '$99'],
                  ].map(([f, free, std, deep], i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2.5 pr-4 text-white font-medium">{f}</td>
                      <td className="py-2.5 px-4 text-center">{free}</td>
                      <td className="py-2.5 px-4 text-center">{std}</td>
                      <td className="py-2.5 px-4 text-center">{deep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">FAQ</h2>
            <div className="space-y-3">
              {[
                { q: 'What does the Free scan check?', a: 'The free scan runs ~50 quick checks: 8 core security headers, SSL/HTTPS, cookie security, CORS policy, 5 critical exposed files (.env, .git, etc.), GPC compliance, and tech fingerprinting. Results are shown online only — no PDF.' },
                { q: 'What extra does Standard ($20) include?', a: 'Standard runs 150+ checks on the homepage: all 15 security headers, 67+ sensitive files, 20 admin panel probes, HTTP methods, HTML analysis, tracker detection, and more. You get a downloadable PDF report. Any email is accepted — no business email requirement.' },
                { q: 'Why choose Deep ($99)?', a: 'Deep scan crawls your entire site (up to 50 pages), then runs attack payloads on every form/parameter. It tests for SQL injection, XSS, open redirects, path traversal, and IDOR. Plus full infrastructure scanning: SSL/TLS, DNS (SPF/DKIM/DMARC), subdomain discovery, and port scanning. You get a 20+ page professional PDF report.' },
                { q: 'How long does each scan take?', a: 'Free: 10-20 seconds. Standard: 30-60 seconds. Deep: 2-5 minutes depending on site size.' },
                { q: 'Is my data safe?', a: 'Payment is processed by Stripe. We never store card details. Reports expire after 7 days.' },
              ].map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Don&apos;t Wait for a Breach</h2>
            <p className="text-slate-400 mb-8">Start with a free scan. Upgrade when you need more depth.</p>
            <a href="#pricing" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:from-red-500 hover:to-red-400 transition-all">
              <ShieldAlert className="w-5 h-5" /> Choose Your Plan <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} ABCSecure — Enterprise Cybersecurity</p>
        <p className="mt-1">Professional Security Assessment Services — abcsecure.com</p>
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
