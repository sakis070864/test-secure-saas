'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Unlock, Globe, Mail, Scan, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'scan'>('login');
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('admin@sakis-athan.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAdminToken(data.token);
        setStep('scan');
      }
    } catch {
      setError('Connection failed');
    }
    setLoading(false);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    router.push(`/success?session_id=${adminToken}&url=${encodeURIComponent(targetUrl)}&email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mb-4 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">Athan<span className="text-red-500">DeepScan</span></h1>
          <p className="text-slate-500 text-sm mt-1">Admin Panel</p>
        </div>

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Lock className="w-5 h-5 text-red-500" />
              <span className="font-semibold">Admin Authentication</span>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleScan} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">
                <Unlock className="w-4 h-4" /> Admin Authenticated
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3" /> Target URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                placeholder="example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3" /> Report Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Scan className="w-5 h-5" /> Launch Deep Scan (Free)
            </button>

            <p className="text-center text-xs text-slate-600">
              Admin bypass active — no payment required
            </p>
          </form>
        )}

        <p className="text-center text-xs text-slate-700 mt-6">
          AthanDeepScan Admin • Athan Security
        </p>
      </div>
    </div>
  );
}
