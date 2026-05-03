'use client';
import { useState, useEffect } from 'react';
import { Skull, ShieldCheck, Search, Loader2, AlertTriangle, ArrowLeft, ExternalLink, Sun, Moon, Lock, Eye, EyeOff, Globe, KeyRound, Mail } from 'lucide-react';

type Breach = {
  name: string; title: string; domain: string; breachDate: string; addedDate: string;
  pwnCount: number; description: string; dataClasses: string[];
  isVerified: boolean; isSensitive: boolean; isSpamList: boolean; isMalware: boolean;
  logoPath: string;
};

type BreachResult = {
  domain?: string; email?: string; breached: boolean; totalBreaches: number;
  totalPwnedAccounts: number; breaches: Breach[];
};

export default function BreachCheckPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BreachResult | null>(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [dark, setDark] = useState(true);
  const [activeTab, setActiveTab] = useState<'domain' | 'password' | 'email'>('domain');
  const [password, setPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult, setPwResult] = useState<{ found: boolean; count: number } | null>(null);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<BreachResult | null>(null);
  const [emailError, setEmailError] = useState('');
  const [emailNeedsKey, setEmailNeedsKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('breach-theme');
    if (saved === 'light') setDark(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('breach-theme', dark ? 'dark' : 'light');
  }, [dark]);

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

  async function handlePasswordCheck() {
    if (!password) return;
    setPwLoading(true);
    setPwError('');
    setPwResult(null);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) throw new Error('API error');
      const text = await res.text();
      const lines = text.split('\n');
      let found = false;
      let count = 0;
      for (const line of lines) {
        const [hashSuffix, c] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          found = true;
          count = parseInt(c.trim(), 10);
          break;
        }
      }
      setPwResult({ found, count });
    } catch {
      setPwError('Could not check password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleEmailCheck() {
    if (!emailInput.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    setEmailResult(null);
    setEmailNeedsKey(false);
    try {
      const res = await fetch('/api/email-breach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (data.needsKey) {
        setEmailNeedsKey(true);
        setEmailError(data.error);
      } else if (data.error) {
        setEmailError(data.error);
      } else {
        setEmailResult(data);
      }
    } catch {
      setEmailError('Connection failed. Please try again.');
    } finally {
      setEmailLoading(false);
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

  // Theme classes
  const bg = dark ? 'bg-[#030712]' : 'bg-[#f8f9fa]';
  const text = dark ? 'text-white' : 'text-gray-900';
  const textMuted = dark ? 'text-slate-400' : 'text-gray-500';
  const textDim = dark ? 'text-slate-500' : 'text-gray-400';
  const textDimmer = dark ? 'text-slate-600' : 'text-gray-300';
  const headerBg = dark ? 'bg-[#030712]/80' : 'bg-white/80';
  const headerBorder = dark ? 'border-white/5' : 'border-gray-200';
  const inputBg = dark ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const inputFocus = dark ? 'focus:border-red-500/50 focus:ring-red-500/25' : 'focus:border-red-500/50 focus:ring-red-500/25';
  const cardBg = dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-gray-200 shadow-sm';
  const exampleBtn = dark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-500 hover:text-gray-900';
  const footerBorder = dark ? 'border-white/5' : 'border-gray-200';
  const breachTagBg = dark ? 'bg-red-500/10 text-red-300 border-red-500/15' : 'bg-red-50 text-red-600 border-red-200';
  const dividerBg = dark ? 'bg-white/10' : 'bg-gray-200';
  const greenCard = dark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200';
  const greenText = dark ? 'text-green-400' : 'text-green-600';
  const redCard = dark ? 'bg-red-500/5 border-red-500/30' : 'bg-red-50 border-red-200';
  const redText = dark ? 'text-red-400' : 'text-red-600';
  const attrCard = dark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200';
  const tabActive = dark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200';
  const tabInactive = dark ? 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/5' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${headerBg} border-b ${headerBorder} transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skull className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">ABC<span className="text-red-500">Secure</span> — Security Check</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark/Light Toggle */}
            <button
              onClick={() => setDark(!dark)}
              className={`p-2 rounded-xl border transition-all ${
                dark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-yellow-400'
                  : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600'
              }`}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a href="/" className={`flex items-center gap-1.5 text-xs ${textMuted} hover:${text} transition-colors`}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Scanner
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${dark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-500'} border text-xs font-medium mb-6`}>
            <Skull className="w-3.5 h-3.5" />
            Powered by Have I Been Pwned
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            {activeTab === 'domain' && <>Has this site been <span className="text-red-500">hacked</span>?</>}
            {activeTab === 'password' && <>Is your password <span className="text-red-500">compromised</span>?</>}
            {activeTab === 'email' && <>Has your email been <span className="text-red-500">exposed</span>?</>}
          </h1>
          <p className={`${textMuted} text-lg max-w-xl mx-auto`}>
            {activeTab === 'domain' && 'Enter any website domain to check if it has been involved in a known data breach.'}
            {activeTab === 'password' && 'Check if your password has appeared in any known data breaches. Your password is never sent over the internet.'}
            {activeTab === 'email' && 'Check if your email address has been compromised in any known data breaches.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-10">
          <button onClick={() => setActiveTab('domain')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${activeTab === 'domain' ? tabActive : tabInactive}`}>
            <Globe className="w-4 h-4" /> Site Breach
          </button>
          <button onClick={() => setActiveTab('email')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${activeTab === 'email' ? tabActive : tabInactive}`}>
            <Mail className="w-4 h-4" /> Email Breach
          </button>
          <button onClick={() => setActiveTab('password')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${activeTab === 'password' ? tabActive : tabInactive}`}>
            <KeyRound className="w-4 h-4" /> Password Check
          </button>
        </div>

        {/* Domain Search Box */}
        {activeTab === 'domain' && (
        <div className="relative max-w-2xl mx-auto mb-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textDim}`} />
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
                placeholder="Enter domain (e.g. adobe.com, linkedin.com)"
                className={`w-full pl-12 pr-4 py-4 ${inputBg} border rounded-2xl focus:outline-none ${inputFocus} focus:ring-1 text-lg transition-all`}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={loading || !domain.trim()}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg text-white transition-all flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Check
            </button>
          </div>
        </div>
        )}

        {/* Password Search Box */}
        {activeTab === 'password' && (
        <div className="relative max-w-2xl mx-auto mb-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textDim}`} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePasswordCheck(); }}
                placeholder="Enter a password to check"
                className={`w-full pl-12 pr-12 py-4 ${inputBg} border rounded-2xl focus:outline-none ${inputFocus} focus:ring-1 text-lg transition-all`}
                disabled={pwLoading}
              />
              <button onClick={() => setShowPw(!showPw)} className={`absolute right-4 top-1/2 -translate-y-1/2 ${textDim} hover:opacity-70`}>
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={handlePasswordCheck}
              disabled={pwLoading || !password}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg text-white transition-all flex items-center gap-2 shrink-0"
            >
              {pwLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Check
            </button>
          </div>
          <p className={`text-xs ${textDimmer} text-center mt-3`}>
            🔒 Your password is hashed locally using SHA-1. Only the first 5 characters of the hash are sent to the API (k-anonymity). Your actual password never leaves your browser.
          </p>
        </div>
        )}

        {/* Password Error */}
        {activeTab === 'password' && pwError && (
          <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-2xl ${dark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} border flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className={`text-sm ${redText}`}>{pwError}</p>
          </div>
        )}

        {/* Password Loading */}
        {activeTab === 'password' && pwLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <p className={textMuted}>Checking password database...</p>
          </div>
        )}

        {/* Password Result: SAFE */}
        {activeTab === 'password' && pwResult && !pwResult.found && (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-2xl ${greenCard} border p-8 text-center`}>
              <ShieldCheck className={`w-16 h-16 ${greenText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${greenText} mb-2`}>Good news — no pwnage found!</h2>
              <p className={textMuted}>
                This password was not found in any known data breaches loaded into Have I Been Pwned.
              </p>
              <p className={`text-xs ${textDimmer} mt-4`}>This doesn&apos;t guarantee it&apos;s a strong password — only that it hasn&apos;t appeared in publicly disclosed breaches.</p>
            </div>
          </div>
        )}

        {/* Password Result: PWNED */}
        {activeTab === 'password' && pwResult && pwResult.found && (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-2xl ${redCard} border p-8 text-center`}>
              <Skull className={`w-16 h-16 ${redText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${redText} mb-2`}>Oh no — this password has been pwned!</h2>
              <p className={textMuted}>
                This password has been seen <span className={`font-black text-2xl ${redText}`}>{pwResult.count.toLocaleString()}</span> times in data breaches.
              </p>
              <p className={`text-sm font-semibold ${redText} mt-4`}>You should change this password immediately if you use it anywhere!</p>
              <div className={`mt-6 p-4 rounded-xl ${attrCard} border text-left`}>
                <p className={`text-xs font-bold ${textDim} uppercase tracking-wider mb-2`}>Recommendations</p>
                <ul className={`text-sm ${textMuted} space-y-1.5`}>
                  <li>• Use a unique password for every account</li>
                  <li>• Use a password manager (Bitwarden, 1Password, etc.)</li>
                  <li>• Enable two-factor authentication (2FA) wherever possible</li>
                  <li>• Consider using passphrases (4+ random words)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EMAIL TAB ═══ */}

        {/* Email Search Box */}
        {activeTab === 'email' && (
        <div className="relative max-w-2xl mx-auto mb-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textDim}`} />
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEmailCheck(); }}
                placeholder="Enter email address (e.g. you@example.com)"
                className={`w-full pl-12 pr-4 py-4 ${inputBg} border rounded-2xl focus:outline-none ${inputFocus} focus:ring-1 text-lg transition-all`}
                disabled={emailLoading}
              />
            </div>
            <button
              onClick={handleEmailCheck}
              disabled={emailLoading || !emailInput.trim()}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg text-white transition-all flex items-center gap-2 shrink-0"
            >
              {emailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Check
            </button>
          </div>
        </div>
        )}

        {/* Email Needs API Key */}
        {activeTab === 'email' && emailNeedsKey && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className={`rounded-2xl ${dark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} border p-8 text-center`}>
              <Lock className={`w-12 h-12 ${dark ? 'text-amber-400' : 'text-amber-500'} mx-auto mb-4`} />
              <h2 className={`text-xl font-bold ${dark ? 'text-amber-400' : 'text-amber-600'} mb-2`}>API Key Required</h2>
              <p className={`${textMuted} mb-4`}>
                Email breach lookups require a paid HIBP API key ($3.50/month).
              </p>
              <a
                href="https://haveibeenpwned.com/API/Key"
                target="_blank"
                rel="noopener"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${dark ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'} font-medium text-sm transition-all`}
              >
                Get API Key <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className={`text-xs ${textDimmer} mt-4`}>
                Once obtained, add <code className={`${dark ? 'bg-white/10' : 'bg-gray-200'} px-1.5 py-0.5 rounded`}>HIBP_API_KEY=your_key</code> to your environment variables.
              </p>
            </div>
          </div>
        )}

        {/* Email Error */}
        {activeTab === 'email' && emailError && !emailNeedsKey && (
          <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-2xl ${dark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} border flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className={`text-sm ${redText}`}>{emailError}</p>
          </div>
        )}

        {/* Email Loading */}
        {activeTab === 'email' && emailLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <p className={textMuted}>Checking email breach database...</p>
          </div>
        )}

        {/* Email Result: SAFE */}
        {activeTab === 'email' && emailResult && !emailResult.breached && (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-2xl ${greenCard} border p-8 text-center`}>
              <ShieldCheck className={`w-16 h-16 ${greenText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${greenText} mb-2`}>No Breaches Found</h2>
              <p className={textMuted}>
                <span className={`${text} font-semibold`}>{emailResult.email}</span> has no recorded data breaches in the Have I Been Pwned database.
              </p>
              <p className={`text-xs ${textDimmer} mt-4`}>This does not guarantee your email has never been compromised — only that no breach has been publicly reported and loaded into HIBP.</p>
            </div>
          </div>
        )}

        {/* Email Result: BREACHED */}
        {activeTab === 'email' && emailResult && emailResult.breached && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Summary Card */}
            <div className={`rounded-2xl ${redCard} border p-8 text-center`}>
              <Skull className={`w-16 h-16 ${redText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${redText} mb-2`}>
                {emailResult.totalBreaches} Data Breach{emailResult.totalBreaches > 1 ? 'es' : ''} Found
              </h2>
              <p className={textMuted}>
                <span className={`${text} font-semibold`}>{emailResult.email}</span> has been involved in known data breaches.
              </p>
              <div className="flex justify-center gap-8 mt-6">
                <div>
                  <div className={`text-3xl font-black ${redText}`}>{emailResult.totalBreaches}</div>
                  <div className={`text-xs ${textDim}`}>Breaches</div>
                </div>
                <div className={`w-px ${dividerBg}`} />
                <div>
                  <div className={`text-3xl font-black ${redText}`}>{formatNumber(emailResult.totalPwnedAccounts)}</div>
                  <div className={`text-xs ${textDim}`}>Accounts Compromised</div>
                </div>
              </div>
            </div>

            {/* Individual Breaches */}
            {emailResult.breaches.map((breach, i) => (
              <div key={i} className={`rounded-2xl ${cardBg} border overflow-hidden hover:border-red-500/20 transition-colors`}>
                <div className="p-5 flex items-start gap-4">
                  {breach.logoPath ? (
                    <img src={breach.logoPath} alt={breach.title} className={`w-12 h-12 rounded-xl ${dark ? 'bg-white/10' : 'bg-gray-100'} p-1 shrink-0`} />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-red-500/10' : 'bg-red-50'} flex items-center justify-center shrink-0`}>
                      <Skull className={`w-6 h-6 ${redText}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold">{breach.title}</h3>
                      {breach.isVerified && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>Verified</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-4 text-xs ${textDim}`}>
                      <span>📅 Breach Date: <span className={dark ? 'text-slate-300' : 'text-gray-700'}>{breach.breachDate}</span></span>
                      <span>👤 {breach.pwnCount.toLocaleString()} accounts</span>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className={`text-sm ${textMuted} leading-relaxed`}>{stripHtml(breach.description)}</p>
                </div>
                <div className="px-5 pb-5">
                  <div className={`text-[10px] ${textDimmer} uppercase tracking-wider mb-2 font-medium`}>Compromised Data</div>
                  <div className="flex flex-wrap gap-1.5">
                    {breach.dataClasses.map((dc, j) => (
                      <span key={j} className={`text-xs px-2.5 py-1 rounded-full border ${breachTagBg}`}>
                        {dc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Attribution */}
            <div className={`rounded-2xl ${attrCard} border p-4 text-center text-xs ${textDimmer}`}>
              Data sourced from{' '}
              <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1">
                haveibeenpwned.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}— Licensed under Creative Commons Attribution 4.0
            </div>
          </div>
        )}

        {/* Domain Error */}
        {activeTab === 'domain' && error && (
          <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-2xl ${dark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} border flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className={`text-sm ${redText}`}>{error}</p>
          </div>
        )}

        {/* Domain Loading */}
        {activeTab === 'domain' && loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <p className={textMuted}>Checking breach database...</p>
          </div>
        )}

        {/* Results: NO breach */}
        {activeTab === 'domain' && result && !result.breached && (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-2xl ${greenCard} border p-8 text-center`}>
              <ShieldCheck className={`w-16 h-16 ${greenText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${greenText} mb-2`}>No Breaches Found</h2>
              <p className={textMuted}>
                <span className={`${text} font-semibold`}>{result.domain}</span> has no recorded data breaches in the Have I Been Pwned database.
              </p>
              <p className={`text-xs ${textDimmer} mt-4`}>This does not guarantee the site has never been compromised — only that no breach has been publicly reported and loaded into HIBP.</p>
            </div>
          </div>
        )}

        {/* Results: BREACHED */}
        {activeTab === 'domain' && result && result.breached && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Summary Card */}
            <div className={`rounded-2xl ${redCard} border p-8 text-center`}>
              <Skull className={`w-16 h-16 ${redText} mx-auto mb-4`} />
              <h2 className={`text-2xl font-black ${redText} mb-2`}>
                {result.totalBreaches} Data Breach{result.totalBreaches > 1 ? 'es' : ''} Found
              </h2>
              <p className={textMuted}>
                <span className={`${text} font-semibold`}>{result.domain}</span> has been involved in known data breaches.
              </p>
              <div className="flex justify-center gap-8 mt-6">
                <div>
                  <div className={`text-3xl font-black ${redText}`}>{result.totalBreaches}</div>
                  <div className={`text-xs ${textDim}`}>Breaches</div>
                </div>
                <div className={`w-px ${dividerBg}`} />
                <div>
                  <div className={`text-3xl font-black ${redText}`}>{formatNumber(result.totalPwnedAccounts)}</div>
                  <div className={`text-xs ${textDim}`}>Accounts Compromised</div>
                </div>
              </div>
            </div>

            {/* Individual Breaches */}
            {result.breaches.map((breach, i) => (
              <div key={i} className={`rounded-2xl ${cardBg} border overflow-hidden hover:border-red-500/20 transition-colors`}>
                {/* Breach Header */}
                <div className="p-5 flex items-start gap-4">
                  {breach.logoPath ? (
                    <img src={breach.logoPath} alt={breach.title} className={`w-12 h-12 rounded-xl ${dark ? 'bg-white/10' : 'bg-gray-100'} p-1 shrink-0`} />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-red-500/10' : 'bg-red-50'} flex items-center justify-center shrink-0`}>
                      <Skull className={`w-6 h-6 ${redText}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold">{breach.title}</h3>
                      {breach.isVerified && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>Verified</span>
                      )}
                      {breach.isMalware && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Malware</span>
                      )}
                      {breach.isSpamList && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-slate-500/20 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>Spam List</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-4 text-xs ${textDim}`}>
                      <span>📅 Breach Date: <span className={dark ? 'text-slate-300' : 'text-gray-700'}>{breach.breachDate}</span></span>
                      <span>👤 {breach.pwnCount.toLocaleString()} accounts</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="px-5 pb-4">
                  <p className={`text-sm ${textMuted} leading-relaxed`}>{stripHtml(breach.description)}</p>
                </div>

                {/* Data Classes */}
                <div className="px-5 pb-5">
                  <div className={`text-[10px] ${textDimmer} uppercase tracking-wider mb-2 font-medium`}>Compromised Data</div>
                  <div className="flex flex-wrap gap-1.5">
                    {breach.dataClasses.map((dc, j) => (
                      <span key={j} className={`text-xs px-2.5 py-1 rounded-full border ${breachTagBg}`}>
                        {dc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Attribution */}
            <div className={`rounded-2xl ${attrCard} border p-4 text-center text-xs ${textDimmer}`}>
              Data sourced from{' '}
              <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1">
                haveibeenpwned.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}— Licensed under Creative Commons Attribution 4.0
            </div>
          </div>
        )}

        {/* Examples (show before domain search) */}
        {activeTab === 'domain' && !hasSearched && (
          <div className="max-w-2xl mx-auto mt-8">
            <p className={`text-xs ${textDimmer} text-center mb-4`}>Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['adobe.com', 'linkedin.com', 'dropbox.com', 'canva.com', 'twitter.com'].map(d => (
                <button
                  key={d}
                  onClick={() => { setDomain(d); }}
                  className={`px-4 py-2 ${exampleBtn} border rounded-xl text-sm transition-all`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Password examples */}
        {activeTab === 'password' && !pwResult && !pwLoading && (
          <div className="max-w-2xl mx-auto mt-8">
            <p className={`text-xs ${textDimmer} text-center mb-4`}>Try these commonly breached passwords:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['password', '123456', 'admin', 'qwerty', 'letmein'].map(p => (
                <button
                  key={p}
                  onClick={() => { setPassword(p); }}
                  className={`px-4 py-2 ${exampleBtn} border rounded-xl text-sm transition-all font-mono`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className={`text-center py-6 text-xs ${textDimmer} border-t ${footerBorder}`}>
        ABCSECURE — Breach Check Tool — Powered by <a href="https://haveibeenpwned.com" target="_blank" rel="noopener" className="text-red-400 underline">Have I Been Pwned</a>
      </footer>
    </div>
  );
}
