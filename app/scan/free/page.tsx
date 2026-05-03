'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, Lock, ArrowRight, Zap, Skull, ShieldCheck } from 'lucide-react';

type FreeCheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };
type BreachRecord = {
  name: string; title: string; domain: string; breachDate: string;
  pwnCount: number; description: string; dataClasses: string[];
  isVerified: boolean; logoPath: string;
};
type FreeScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: FreeCheckResult[]; cookies: FreeCheckResult[]; cors: FreeCheckResult[]; criticalFiles: FreeCheckResult[];
  technologies: Array<{ name: string; category: string }>;
  gpc: { supported: boolean; details: string };
  ssl: { secure: boolean; details: string };
  waf?: { detected: boolean; detail: string; whitelistGuide: string };
  breachHistory?: { breached: boolean; totalBreaches: number; totalPwnedAccounts: number; breaches: BreachRecord[]; error?: string };
  timestamp: string;
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
}

function Section({ title, checks, open: defaultOpen = false }: { title: string; checks: FreeCheckResult[]; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const fails = checks.filter(c => c.status === 'fail').length;
  const passes = checks.filter(c => c.status === 'pass').length;
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-semibold text-sm">{title} <span className="text-xs text-slate-500">({checks.length})</span></span>
        <div className="flex items-center gap-2 text-xs">
          {fails > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">{fails} FAIL</span>}
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">{passes} PASS</span>
          <span className="text-slate-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${c.status === 'fail' ? 'bg-red-500/5' : ''}`}>
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-slate-500">{c.detail}</div>
              </div>
              {c.risk !== 'None' && <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${c.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : c.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.risk}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FreeScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const [result, setResult] = useState<FreeScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanPhase, setScanPhase] = useState('Initializing scan...');

  useEffect(() => {
    if (!url) { setError('No URL provided'); setLoading(false); return; }
    const phases = ['Checking HTTPS...', 'Scanning security headers...', 'Testing critical files...', 'Analyzing cookies...', 'Checking CORS policy...', 'Fingerprinting technologies...', 'Checking GPC compliance...', 'Calculating score...'];
    let i = 0;
    const interval = setInterval(() => { setScanPhase(phases[i % phases.length]); i++; }, 1500);

    fetch('/api/scan-free', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setResult(data.result); })
      .catch(() => setError('Scan failed. Please try again.'))
      .finally(() => { setLoading(false); clearInterval(interval); });

    return () => clearInterval(interval);
  }, [url]);

  const gc = (g: string) => g === 'A' ? 'text-green-500' : g === 'B' ? 'text-blue-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500';

  if (!url) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center p-8">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p>No URL provided.</p>
        <button onClick={() => router.push('/')} className="mt-4 bg-red-600 px-6 py-2 rounded-xl">Go Back</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-red-500 mx-auto mb-4 animate-spin" />
        <p className="text-lg font-bold mb-2">Running Free Security Scan...</p>
        <p className="text-sm text-slate-400">{scanPhase}</p>
        <p className="text-xs text-slate-600 mt-3">~50 checks — takes 10-20 seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center max-w-md p-8 bg-white/5 rounded-2xl border border-white/10">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Scan Error</h2>
        <p className="text-slate-400 text-sm">{error}</p>
        <button onClick={() => router.push('/')} className="mt-4 bg-red-600 px-6 py-2 rounded-xl text-sm">Try Again</button>
      </div>
    </div>
  );

  if (!result) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">ABC<span className="text-red-500">Secure</span> — Free Scan</span>
          </div>
          <span className="text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-full">FREE TIER</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Grade */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className={`text-6xl font-black ${gc(result.grade)}`}>{result.grade}</div>
          <div className="text-slate-500 mt-2">Score: {result.score}/100 — {result.totalChecks} checks</div>
          <div className="text-sm text-slate-600 mt-1">{result.url}</div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-green-500">✓ {result.passed} Passed</span>
            <span className="text-red-500">✗ {result.failed} Failed</span>
            <span className="text-yellow-500">⚠ {result.warnings} Warnings</span>
          </div>
        </div>

        {/* SSL */}
        <div className={`rounded-2xl p-4 border ${result.ssl.secure ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} flex items-center gap-4`}>
          {result.ssl.secure ? <Lock className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <div>
            <div className="font-bold text-sm">SSL / HTTPS</div>
            <div className="text-xs text-slate-400">{result.ssl.details}</div>
          </div>
        </div>

        {/* GPC */}
        <div className={`rounded-2xl p-4 border ${result.gpc.supported ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} flex items-center gap-4`}>
          {result.gpc.supported ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
          <div>
            <div className="font-bold text-sm">GPC Compliance</div>
            <div className="text-xs text-slate-400">{result.gpc.details}</div>
          </div>
        </div>

        {/* 🔓 Data Breach History (HIBP) */}
        {result.breachHistory && (
          <div className={`rounded-2xl border overflow-hidden ${
            result.breachHistory.breached
              ? 'bg-red-500/5 border-red-500/30'
              : 'bg-green-500/5 border-green-500/20'
          }`}>
            <div className={`p-5 flex items-center gap-4 ${
              result.breachHistory.breached ? 'bg-red-500/10' : ''
            }`}>
              {result.breachHistory.breached
                ? <Skull className="w-6 h-6 text-red-500 shrink-0" />
                : <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
              }
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {result.breachHistory.breached
                    ? `⚠ ${result.breachHistory.totalBreaches} Known Data Breach${result.breachHistory.totalBreaches > 1 ? 'es' : ''} Found`
                    : '✓ No Known Data Breaches'
                  }
                </div>
                <div className="text-xs text-slate-400">
                  {result.breachHistory.breached
                    ? `${result.breachHistory.totalPwnedAccounts.toLocaleString()} accounts compromised — Source: Have I Been Pwned`
                    : 'This domain has no recorded breaches in the Have I Been Pwned database'
                  }
                </div>
              </div>
            </div>

            {result.breachHistory.breached && result.breachHistory.breaches.map((breach, i) => (
              <div key={i} className="border-t border-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  {breach.logoPath && (
                    <img src={breach.logoPath} alt={breach.title} className="w-8 h-8 rounded-lg bg-white/10 p-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-red-400">{breach.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">{breach.breachDate}</span>
                      {breach.isVerified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">Verified</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {breach.pwnCount.toLocaleString()} accounts compromised
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {breach.dataClasses.map((dc, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                          {dc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {result.breachHistory.error && (
              <div className="border-t border-yellow-500/10 p-3 text-xs text-yellow-400">
                ⚠ {result.breachHistory.error}
              </div>
            )}

            {result.breachHistory.breached && (
              <div className="border-t border-red-500/10 p-3 bg-red-500/5 text-[10px] text-slate-500 text-center">
                Data sourced from <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 underline">haveibeenpwned.com</a> — Creative Commons Attribution 4.0
              </div>
            )}
          </div>
        )}

        {/* WAF Detection Warning */}
        {result.waf?.detected && (
          <div className="rounded-2xl p-5 border bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="font-bold text-sm text-yellow-400">⚠ Web Application Firewall Detected</div>
                <p className="text-xs text-slate-400">{result.waf.detail}</p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-yellow-400/80 hover:text-yellow-400 font-medium">How to whitelist our scanner for a complete scan →</summary>
                  <pre className="mt-2 p-3 bg-black/30 rounded-lg text-slate-400 whitespace-pre-wrap text-[11px] leading-relaxed">{result.waf.whitelistGuide}</pre>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Check Sections */}
        <Section title="🛡️ Security Headers" checks={result.headers} open={true} />
        <Section title="🔒 Critical Files" checks={result.criticalFiles} open={true} />
        <Section title="🍪 Cookie Security" checks={result.cookies} open={true} />
        <Section title="🌐 CORS Policy" checks={result.cors} />

        {/* Technologies */}
        {result.technologies.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="font-bold text-sm mb-3">🔍 Detected Technologies</div>
            <div className="flex flex-wrap gap-2">
              {result.technologies.map((t, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-xs border border-purple-500/20">{t.name} <span className="opacity-60">({t.category})</span></span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ UPGRADE CTAs ═══ */}
        <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-2xl border border-red-500/20 p-6 sm:p-8">
          <h3 className="text-xl font-black text-center mb-2">Want Deeper Results?</h3>
          <p className="text-sm text-slate-400 text-center mb-6">This free scan checked ~50 points. Our paid tiers go much deeper.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href={`/?upgrade=standard&url=${encodeURIComponent(url || '')}`} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-all group">
              <Zap className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-bold text-sm">Standard — $20</div>
                <div className="text-xs text-slate-500">150+ checks, PDF report</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href={`/?upgrade=deep&url=${encodeURIComponent(url || '')}`} className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 rounded-xl p-4 transition-all group">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-bold text-sm">Deep Scan — $99</div>
                <div className="text-xs text-slate-500">500-2000+ checks, full pentest</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-white/5">
        ABCSECURE — Free Security Scan — abcsecure.com
      </footer>
    </div>
  );
}

export default function FreeScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    }>
      <FreeScanContent />
    </Suspense>
  );
}
