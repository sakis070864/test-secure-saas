'use client';
import { useState } from 'react';
import { Skull, ShieldCheck, Search, Loader2, AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';

type Breach = {
  name: string; title: string; domain: string; breachDate: string; addedDate: string;
  pwnCount: number; description: string; dataClasses: string[];
  isVerified: boolean; isSensitive: boolean; isSpamList: boolean; isMalware: boolean;
  logoPath: string;
};

type BreachResult = {
  domain: string; breached: boolean; totalBreaches: number;
  totalPwnedAccounts: number; breaches: Breach[];
};

export default function BreachCheckPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BreachResult | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  async function handleCheck() {
    if (!domain.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setHasSearched(true);

    try {
      const res = await fetch('/api/breach-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setResult(data); }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skull className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">ABC<span className="text-red-500">Secure</span> — Site Breached?</span>
          </div>
          <a href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Scanner
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-6">
            <Skull className="w-3.5 h-3.5" />
            Powered by Have I Been Pwned
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            Has this site been <span className="text-red-500">hacked</span>?
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Enter any website domain to check if it has been involved in a known data breach.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative max-w-2xl mx-auto mb-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
                placeholder="Enter domain (e.g. adobe.com, linkedin.com)"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/25 text-lg transition-all"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={loading || !domain.trim()}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Check
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Checking breach database...</p>
          </div>
        )}

        {/* Results: NO breach */}
        {result && !result.breached && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-8 text-center">
              <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-green-400 mb-2">No Breaches Found</h2>
              <p className="text-slate-400">
                <span className="text-white font-semibold">{result.domain}</span> has no recorded data breaches in the Have I Been Pwned database.
              </p>
              <p className="text-xs text-slate-600 mt-4">This does not guarantee the site has never been compromised — only that no breach has been publicly reported and loaded into HIBP.</p>
            </div>
          </div>
        )}

        {/* Results: BREACHED */}
        {result && result.breached && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Summary Card */}
            <div className="rounded-2xl bg-red-500/5 border border-red-500/30 p-8 text-center">
              <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-red-400 mb-2">
                {result.totalBreaches} Data Breach{result.totalBreaches > 1 ? 'es' : ''} Found
              </h2>
              <p className="text-slate-400">
                <span className="text-white font-semibold">{result.domain}</span> has been involved in known data breaches.
              </p>
              <div className="flex justify-center gap-8 mt-6">
                <div>
                  <div className="text-3xl font-black text-red-400">{result.totalBreaches}</div>
                  <div className="text-xs text-slate-500">Breaches</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-3xl font-black text-red-400">{formatNumber(result.totalPwnedAccounts)}</div>
                  <div className="text-xs text-slate-500">Accounts Compromised</div>
                </div>
              </div>
            </div>

            {/* Individual Breaches */}
            {result.breaches.map((breach, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-red-500/20 transition-colors">
                {/* Breach Header */}
                <div className="p-5 flex items-start gap-4">
                  {breach.logoPath ? (
                    <img src={breach.logoPath} alt={breach.title} className="w-12 h-12 rounded-xl bg-white/10 p-1 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <Skull className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold">{breach.title}</h3>
                      {breach.isVerified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">Verified</span>
                      )}
                      {breach.isMalware && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Malware</span>
                      )}
                      {breach.isSpamList && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-medium">Spam List</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📅 Breach Date: <span className="text-slate-300">{breach.breachDate}</span></span>
                      <span>👤 {breach.pwnCount.toLocaleString()} accounts</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-400 leading-relaxed">{stripHtml(breach.description)}</p>
                </div>

                {/* Data Classes */}
                <div className="px-5 pb-5">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-medium">Compromised Data</div>
                  <div className="flex flex-wrap gap-1.5">
                    {breach.dataClasses.map((dc, j) => (
                      <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/15">
                        {dc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Attribution */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 text-center text-xs text-slate-600">
              Data sourced from{' '}
              <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1">
                haveibeenpwned.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}— Licensed under Creative Commons Attribution 4.0
            </div>
          </div>
        )}

        {/* Examples (show before search) */}
        {!hasSearched && (
          <div className="max-w-2xl mx-auto mt-8">
            <p className="text-xs text-slate-600 text-center mb-4">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['adobe.com', 'linkedin.com', 'dropbox.com', 'canva.com', 'twitter.com'].map(d => (
                <button
                  key={d}
                  onClick={() => { setDomain(d); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-600 border-t border-white/5">
        ABCSECURE — Breach Check Tool — Powered by <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 underline">Have I Been Pwned</a>
      </footer>
    </div>
  );
}
