'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, Download } from 'lucide-react';

type CheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };
type DeepScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: CheckResult[]; exposedFiles: CheckResult[]; adminPanels: CheckResult[];
  cookies: CheckResult[]; cors: CheckResult[]; infoDisclosure: CheckResult[];
  httpMethods: CheckResult[]; htmlAnalysis: CheckResult[];
  technologies: Array<{ name: string; category: string }>;
  trackers: { found: number; list: Array<{ name: string; type: string }> };
  gpc: { supported: boolean; details: string };
  timestamp: string;
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
}

function CheckSection({ title, icon, checks, defaultOpen = false }: { title: string; icon: string; checks: CheckResult[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const passes = checks.filter(c => c.status === 'pass').length;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-bold">{title}</span>
          <span className="text-xs text-slate-500">({checks.length} checks)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {fails > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">{fails} FAIL</span>}
          {warns > 0 && <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full">{warns} WARN</span>}
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">{passes} PASS</span>
          <span className="text-slate-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3 ${c.status === 'fail' ? 'bg-red-500/5' : c.status === 'warn' ? 'bg-yellow-500/5' : ''}`}>
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
              </div>
              {c.risk !== 'None' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${c.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : c.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : c.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.risk}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PDF Generator (Print-Friendly: white bg, dark text, colored status) ─────
async function generatePDF(result: DeepScanResult) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 210; const margin = 15;
  const cw = pw - margin * 2;
  let y = 20;

  // Print-friendly palette: white bg, dark text, colored accents
  const C = {
    black: [20, 20, 20] as number[], dark: [50, 50, 50] as number[], mid: [120, 120, 120] as number[],
    light: [200, 200, 200] as number[], sectionBg: [240, 242, 245] as number[],
    red: [220, 38, 38] as number[], green: [22, 163, 74] as number[],
    yellow: [180, 130, 0] as number[], blue: [37, 99, 235] as number[],
    orange: [234, 88, 12] as number[], purple: [124, 58, 237] as number[],
  };

  // ── Header ──
  doc.setDrawColor(C.light[0], C.light[1], C.light[2]);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.black[0], C.black[1], C.black[2]);
  doc.text('AthanDeepScan', margin, y);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.red[0], C.red[1], C.red[2]);
  doc.text('Deep Penetration Security Report', margin + 60, y);
  y += 6;
  doc.setFontSize(9); doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text(`${result.url}  |  ${new Date(result.timestamp).toLocaleDateString()}`, margin, y);
  y += 3;
  doc.setDrawColor(C.light[0], C.light[1], C.light[2]);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  // ── Grade Box ──
  const gc = result.grade === 'A' ? C.green : result.grade === 'B' ? C.blue : result.grade === 'C' ? C.yellow : C.red;
  doc.setFillColor(C.sectionBg[0], C.sectionBg[1], C.sectionBg[2]);
  doc.roundedRect(margin, y, cw, 22, 3, 3, 'F');
  doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.setTextColor(gc[0], gc[1], gc[2]);
  doc.text(result.grade, margin + 12, y + 16);
  doc.setFontSize(12); doc.setTextColor(C.black[0], C.black[1], C.black[2]);
  doc.text(`Score: ${result.score}/100`, margin + 35, y + 12);
  doc.setFontSize(8); doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text(`${result.totalChecks} checks  |  `, margin + 35, y + 18);
  // Colored stats
  const statsX = margin + 35;
  doc.setTextColor(C.green[0], C.green[1], C.green[2]);
  doc.text(`${result.passed} passed`, statsX + 22, y + 18);
  doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text('  |  ', statsX + 40, y + 18);
  doc.setTextColor(C.red[0], C.red[1], C.red[2]);
  doc.text(`${result.failed} failed`, statsX + 45, y + 18);
  doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
  doc.text('  |  ', statsX + 62, y + 18);
  doc.setTextColor(C.yellow[0], C.yellow[1], C.yellow[2]);
  doc.text(`${result.warnings} warnings`, statsX + 67, y + 18);
  y += 30;

  // ── Helper: new page ──
  function newPage() { doc.addPage(); y = 20; }

  // ── Helper: add section ──
  function addSection(title: string, checks: CheckResult[]) {
    const fails = checks.filter(c => c.status === 'fail').length;
    const warns = checks.filter(c => c.status === 'warn').length;

    if (y > 260) newPage();
    // Section header bar
    doc.setFillColor(C.sectionBg[0], C.sectionBg[1], C.sectionBg[2]);
    doc.roundedRect(margin, y, cw, 8, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.black[0], C.black[1], C.black[2]);
    doc.text(title, margin + 3, y + 5.5);
    // Stats in header
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    const statsStr = `${checks.length} checks`;
    doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
    doc.text(statsStr, margin + cw - 50, y + 5.5);
    if (fails > 0) { doc.setTextColor(C.red[0], C.red[1], C.red[2]); doc.text(`${fails} FAIL`, margin + cw - 30, y + 5.5); }
    if (warns > 0) { doc.setTextColor(C.yellow[0], C.yellow[1], C.yellow[2]); doc.text(`${warns} WARN`, margin + cw - 15, y + 5.5); }
    y += 11;

    for (const c of checks) {
      if (y > 280) newPage();
      // Status icon (colored)
      const sc = c.status === 'fail' ? C.red : c.status === 'warn' ? C.yellow : c.status === 'pass' ? C.green : C.blue;
      const icon = c.status === 'fail' ? 'FAIL' : c.status === 'warn' ? 'WARN' : c.status === 'pass' ? 'PASS' : 'INFO';
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.setTextColor(sc[0], sc[1], sc[2]);
      doc.text(icon, margin + 2, y);
      // Check name (dark text)
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.setTextColor(C.black[0], C.black[1], C.black[2]);
      const name = c.name.length > 45 ? c.name.substring(0, 45) + '...' : c.name;
      doc.text(name, margin + 14, y);
      // Risk badge (colored)
      if (c.risk !== 'None') {
        const rc = c.risk === 'Critical' ? C.red : c.risk === 'High' ? C.orange : c.risk === 'Medium' ? C.yellow : C.blue;
        doc.setFontSize(6); doc.setFont('helvetica', 'normal');
        doc.setTextColor(rc[0], rc[1], rc[2]);
        doc.text(`[${c.risk}]`, margin + cw - 15, y);
      }
      y += 3.5;
      // Detail (gray text)
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
      const detail = c.detail.length > 100 ? c.detail.substring(0, 100) + '...' : c.detail;
      doc.text(detail, margin + 14, y);
      y += 5;
    }
    y += 2;
  }

  addSection('Security Headers', result.headers);
  addSection('Exposed Files & Paths', result.exposedFiles);
  addSection('Admin Panels', result.adminPanels);
  addSection('Cookie Security', result.cookies);
  addSection('CORS Policy', result.cors);
  addSection('Information Disclosure', result.infoDisclosure);
  addSection('HTTP Methods', result.httpMethods);
  addSection('HTML Content Analysis', result.htmlAnalysis);

  // ── Technologies ──
  if (result.technologies.length > 0) {
    if (y > 260) newPage();
    doc.setFillColor(C.sectionBg[0], C.sectionBg[1], C.sectionBg[2]);
    doc.roundedRect(margin, y, cw, 8, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.black[0], C.black[1], C.black[2]);
    doc.text(`Detected Technologies (${result.technologies.length})`, margin + 3, y + 5.5);
    y += 11;
    for (const t of result.technologies) {
      if (y > 280) newPage();
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(C.purple[0], C.purple[1], C.purple[2]);
      doc.text(`• ${t.name}`, margin + 5, y);
      doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
      doc.text(`(${t.category})`, margin + 5 + doc.getTextWidth(`• ${t.name} `), y);
      y += 5;
    }
    y += 2;
  }

  // ── Trackers ──
  if (result.trackers.found > 0) {
    if (y > 260) newPage();
    doc.setFillColor(C.sectionBg[0], C.sectionBg[1], C.sectionBg[2]);
    doc.roundedRect(margin, y, cw, 8, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(C.black[0], C.black[1], C.black[2]);
    doc.text(`Pre-Consent Trackers (${result.trackers.found})`, margin + 3, y + 5.5);
    y += 11;
    for (const t of result.trackers.list) {
      if (y > 280) newPage();
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(C.red[0], C.red[1], C.red[2]);
      doc.text(`• ${t.name}`, margin + 5, y);
      doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
      doc.text(` — ${t.type}`, margin + 5 + doc.getTextWidth(`• ${t.name}`), y);
      y += 5;
    }
  }

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(C.light[0], C.light[1], C.light[2]);
    doc.line(margin, 285, pw - margin, 285);
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.mid[0], C.mid[1], C.mid[2]);
    doc.text('CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS — Athan Security', margin, 290);
    doc.text(`Page ${p} of ${totalPages}`, pw - margin, 290, { align: 'right' });
  }

  const domain = new URL(result.url).hostname.replace(/\./g, '-');
  doc.save(`DeepScan-${domain}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
export default function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<DeepScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanPhase, setScanPhase] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const phases = ['Resolving DNS...', 'Checking 15 security headers...', 'Probing 67 sensitive files...', 'Scanning 20 admin panels...', 'Testing HTTP methods...', 'Analyzing cookies & CORS...', 'Fingerprinting technologies...', 'Scanning trackers...', 'Analyzing HTML content...', 'Calculating risk score...'];
    let i = 0;
    const interval = setInterval(() => { setScanPhase(phases[i % phases.length]); i++; }, 2500);
    fetch(`/api/report/${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setResult(data.result); })
      .catch(() => setError('Failed to load report'))
      .finally(() => { setLoading(false); clearInterval(interval); });
    return () => clearInterval(interval);
  }, [token]);

  const handlePDF = useCallback(async () => {
    if (!result) return;
    setPdfLoading(true);
    try { await generatePDF(result); } catch (e) { console.error('PDF error:', e); }
    finally { setPdfLoading(false); }
  }, [result]);

  const gc = (g: string) => g === 'A' ? 'text-green-500' : g === 'B' ? 'text-blue-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500';

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-red-500 mx-auto mb-4 animate-spin" />
        <p className="text-lg font-bold mb-2">Running Deep Scan...</p>
        <p className="text-sm text-slate-400">{scanPhase}</p>
        <p className="text-xs text-slate-600 mt-4">150+ checks — this takes 15-30 seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center max-w-md p-8 bg-white/5 rounded-2xl border border-white/10">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Report Unavailable</h2>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!result) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">Athan<span className="text-red-500">DeepScan</span> — Full Report</span>
          </div>
          <button onClick={handlePDF} disabled={pdfLoading} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {/* Grade */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className={`text-7xl font-black ${gc(result.grade)}`}>{result.grade}</div>
          <div className="text-slate-500 mt-2">Score: {result.score}/100 — {result.totalChecks} checks performed</div>
          <div className="text-sm text-slate-600 mt-1">{result.url} — {new Date(result.timestamp).toLocaleDateString()}</div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-green-500">✓ {result.passed} Passed</span>
            <span className="text-red-500">✗ {result.failed} Failed</span>
            <span className="text-yellow-500">⚠ {result.warnings} Warnings</span>
          </div>
        </div>

        {/* GPC */}
        <div className={`rounded-2xl p-5 border ${result.gpc.supported ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} flex items-center gap-4`}>
          {result.gpc.supported ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
          <div>
            <div className="font-bold text-sm">Global Privacy Control (GPC)</div>
            <div className="text-xs text-slate-400">{result.gpc.details}</div>
          </div>
        </div>

        <CheckSection title="Security Headers" icon="🛡️" checks={result.headers} defaultOpen={true} />
        <CheckSection title="Exposed Files & Paths" icon="📁" checks={result.exposedFiles} />
        <CheckSection title="Admin Panels" icon="🔓" checks={result.adminPanels} />
        <CheckSection title="Cookie Security" icon="🍪" checks={result.cookies} defaultOpen={true} />
        <CheckSection title="CORS Policy" icon="🌐" checks={result.cors} defaultOpen={true} />
        <CheckSection title="Information Disclosure" icon="💬" checks={result.infoDisclosure} defaultOpen={true} />
        <CheckSection title="HTTP Methods" icon="📡" checks={result.httpMethods} />
        <CheckSection title="HTML Content Analysis" icon="📄" checks={result.htmlAnalysis} />

        {result.technologies.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4"><span className="text-xl">🔍</span><span className="font-bold">Detected Technologies</span></div>
            <div className="flex flex-wrap gap-2">{result.technologies.map((t, i) => <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-sm border border-purple-500/20">{t.name} <span className="text-xs opacity-60">({t.category})</span></span>)}</div>
          </div>
        )}

        {result.trackers.found > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4"><span className="text-xl">👁️</span><span className="font-bold">Pre-Consent Trackers ({result.trackers.found})</span></div>
            <div className="space-y-2">{result.trackers.list.map((t, i) => <div key={i} className="flex justify-between py-2 border-b border-white/5"><span className="text-sm">{t.name}</span><span className="text-xs px-2 py-0.5 rounded bg-white/10">{t.type}</span></div>)}</div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-white/5">CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS — Athan Security</footer>
    </div>
  );
}
