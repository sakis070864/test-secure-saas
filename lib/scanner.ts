// ═══════════════════════════════════════════════════════════════
//  DEEP PENETRATION SCANNER ENGINE v2 — 150+ Check Points
//  Shows ALL checks (PASS + FAIL) like professional scanners
// ═══════════════════════════════════════════════════════════════

import {
  SECURITY_HEADERS, SENSITIVE_PATHS, ADMIN_PANELS,
  KNOWN_TRACKERS, INLINE_TRACKER_SIGS, TECH_SIGNATURES,
  DANGEROUS_HTTP_METHODS
} from './scanChecks';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── Types ──────────────────────────────────────────────────────────────────
export type CheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };

export type DeepScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: CheckResult[];
  exposedFiles: CheckResult[];
  adminPanels: CheckResult[];
  cookies: CheckResult[];
  cors: CheckResult[];
  infoDisclosure: CheckResult[];
  httpMethods: CheckResult[];
  technologies: Array<{ name: string; category: string }>;
  trackers: { found: number; list: Array<{ name: string; type: string }> };
  gpc: { supported: boolean; details: string };
  htmlAnalysis: CheckResult[];
  timestamp: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
async function quickFetch(url: string, method = 'HEAD', timeout = 5000): Promise<Response | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeout);
    const r = await fetch(url, { method, signal: c.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
    clearTimeout(t);
    return r;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  CHECK FUNCTIONS — Each returns CheckResult[]
// ═══════════════════════════════════════════════════════════════

function checkHeaders(response: Response): CheckResult[] {
  return SECURITY_HEADERS.map(h => {
    const val = response.headers.get(h.name);
    if (val) return { name: h.name, status: 'pass' as const, detail: `Present: ${val.substring(0, 80)}`, risk: 'None' };
    return { name: h.name, status: 'fail' as const, detail: `Missing — ${h.desc}`, risk: 'Medium' };
  });
}

async function checkExposedFiles(origin: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const batches: typeof SENSITIVE_PATHS[] = [];
  for (let i = 0; i < SENSITIVE_PATHS.length; i += 15) batches.push(SENSITIVE_PATHS.slice(i, i + 15));

  for (const batch of batches) {
    const checks = batch.map(async (f) => {
      const r = await quickFetch(`${origin}${f.path}`, 'HEAD', 4000);
      const s = r?.status || 0;
      if (s === 200) {
        results.push({ name: f.path, status: 'fail', detail: `ACCESSIBLE (${s}) — ${f.desc}`, risk: f.risk });
      } else if (s === 403) {
        results.push({ name: f.path, status: 'warn', detail: `Blocked (403) but exists — ${f.desc}`, risk: 'Low' });
      } else {
        results.push({ name: f.path, status: 'pass', detail: 'Not found (secure)', risk: 'None' });
      }
    });
    await Promise.all(checks);
  }
  return results;
}

async function checkAdminPanels(origin: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const checks = ADMIN_PANELS.map(async (p) => {
    const r = await quickFetch(`${origin}${p.path}`, 'HEAD', 4000);
    const s = r?.status || 0;
    if (s === 200 || s === 301 || s === 302) {
      results.push({ name: `${p.path} (${p.name})`, status: 'fail', detail: `Accessible (${s}) — admin interface exposed`, risk: 'High' });
    } else {
      results.push({ name: `${p.path} (${p.name})`, status: 'pass', detail: 'Not accessible (secure)', risk: 'None' });
    }
  });
  await Promise.all(checks);
  return results;
}

function checkCookies(response: Response): CheckResult[] {
  const results: CheckResult[] = [];
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length === 0) {
    results.push({ name: 'Cookie Presence', status: 'info', detail: 'No cookies set on initial page load', risk: 'None' });
    return results;
  }
  for (const c of setCookies) {
    const name = c.split('=')[0] || 'unknown';
    const lower = c.toLowerCase();
    const secure = lower.includes('secure');
    const httpOnly = lower.includes('httponly');
    const sameSite = lower.match(/samesite=(strict|lax|none)/i);
    const issues: string[] = [];
    if (!secure) issues.push('No Secure flag');
    if (!httpOnly) issues.push('No HttpOnly flag');
    if (!sameSite || sameSite[1].toLowerCase() === 'none') issues.push('SameSite missing/None');
    if (issues.length === 0) {
      results.push({ name: `Cookie: ${name}`, status: 'pass', detail: 'Secure + HttpOnly + SameSite set', risk: 'None' });
    } else {
      results.push({ name: `Cookie: ${name}`, status: 'fail', detail: issues.join(', '), risk: 'Medium' });
    }
  }
  return results;
}

function checkCORS(response: Response): CheckResult[] {
  const acao = response.headers.get('access-control-allow-origin');
  const acac = response.headers.get('access-control-allow-credentials');
  if (!acao) return [{ name: 'CORS Policy', status: 'pass', detail: 'No CORS headers — restrictive by default', risk: 'None' }];
  if (acao === '*' && acac === 'true') return [{ name: 'CORS Policy', status: 'fail', detail: 'CRITICAL: Wildcard + credentials allowed', risk: 'Critical' }];
  if (acao === '*') return [{ name: 'CORS Policy', status: 'warn', detail: 'Wildcard origin (*) — any site can read responses', risk: 'Medium' }];
  return [{ name: 'CORS Policy', status: 'pass', detail: `Restricted to: ${acao}`, risk: 'None' }];
}

function checkInfoDisclosure(response: Response): CheckResult[] {
  const results: CheckResult[] = [];
  const checks = [
    { header: 'server', desc: 'Server software exposed' },
    { header: 'x-powered-by', desc: 'Technology stack exposed' },
    { header: 'x-aspnet-version', desc: 'ASP.NET version exposed' },
    { header: 'x-generator', desc: 'Generator/CMS version exposed' },
    { header: 'x-debug', desc: 'Debug header exposed' },
    { header: 'x-runtime', desc: 'Runtime info exposed' },
  ];
  for (const c of checks) {
    const val = response.headers.get(c.header);
    if (val) results.push({ name: c.header, status: 'fail', detail: `${val} — ${c.desc}`, risk: 'Medium' });
    else results.push({ name: c.header, status: 'pass', detail: 'Not exposed (secure)', risk: 'None' });
  }
  return results;
}

async function checkHTTPMethods(origin: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const method of DANGEROUS_HTTP_METHODS) {
    try {
      const r = await quickFetch(origin, method, 4000);
      const s = r?.status || 0;
      if (s === 200 || s === 204) {
        results.push({ name: `HTTP ${method}`, status: 'fail', detail: `Method allowed (${s}) — potential security risk`, risk: 'Medium' });
      } else {
        results.push({ name: `HTTP ${method}`, status: 'pass', detail: `Blocked (${s || 'timeout'})`, risk: 'None' });
      }
    } catch {
      results.push({ name: `HTTP ${method}`, status: 'pass', detail: 'Blocked', risk: 'None' });
    }
  }
  return results;
}

function analyzeHTML(html: string): CheckResult[] {
  const results: CheckResult[] = [];
  const lower = html.toLowerCase();

  // Mixed content
  const httpInHttps = (lower.match(/src=["']http:\/\//g) || []).length;
  results.push(httpInHttps > 0
    ? { name: 'Mixed Content', status: 'fail', detail: `${httpInHttps} HTTP resources on HTTPS page`, risk: 'Medium' }
    : { name: 'Mixed Content', status: 'pass', detail: 'No mixed content detected', risk: 'None' }
  );

  // Inline scripts
  const inlineScripts = (lower.match(/<script(?![^>]*src)[^>]*>/g) || []).length;
  results.push(inlineScripts > 3
    ? { name: 'Inline Scripts', status: 'warn', detail: `${inlineScripts} inline scripts — CSP bypass risk`, risk: 'Low' }
    : { name: 'Inline Scripts', status: 'pass', detail: `${inlineScripts} inline scripts`, risk: 'None' }
  );

  // Forms without HTTPS
  const insecureForms = (lower.match(/action=["']http:\/\//g) || []).length;
  results.push(insecureForms > 0
    ? { name: 'Insecure Forms', status: 'fail', detail: `${insecureForms} forms submit over HTTP`, risk: 'High' }
    : { name: 'Insecure Forms', status: 'pass', detail: 'All forms use secure endpoints', risk: 'None' }
  );

  // Password fields without autocomplete=off
  const pwdFields = (lower.match(/type=["']password/g) || []).length;
  results.push(pwdFields > 0
    ? { name: 'Password Fields', status: 'info', detail: `${pwdFields} password fields found — verify autocomplete=off`, risk: 'Low' }
    : { name: 'Password Fields', status: 'pass', detail: 'No password fields on page', risk: 'None' }
  );

  // External iframes
  const iframes = (lower.match(/<iframe/g) || []).length;
  results.push(iframes > 0
    ? { name: 'Iframes', status: 'warn', detail: `${iframes} iframes detected — verify trusted sources`, risk: 'Low' }
    : { name: 'Iframes', status: 'pass', detail: 'No iframes detected', risk: 'None' }
  );

  // Base tag hijacking
  const baseTag = lower.includes('<base ');
  results.push(baseTag
    ? { name: 'Base Tag', status: 'warn', detail: 'Base tag found — verify it points to correct origin', risk: 'Low' }
    : { name: 'Base Tag', status: 'pass', detail: 'No base tag (default behavior)', risk: 'None' }
  );

  // Meta generator
  const genMatch = html.match(/meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)/i);
  results.push(genMatch
    ? { name: 'Generator Meta', status: 'fail', detail: `CMS version disclosed: ${genMatch[1]}`, risk: 'Medium' }
    : { name: 'Generator Meta', status: 'pass', detail: 'No generator meta tag', risk: 'None' }
  );

  // Email addresses exposed
  const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const uniqueEmails = [...new Set(emails)];
  results.push(uniqueEmails.length > 0
    ? { name: 'Exposed Emails', status: 'warn', detail: `${uniqueEmails.length} email(s) in HTML — spam/phishing risk`, risk: 'Low' }
    : { name: 'Exposed Emails', status: 'pass', detail: 'No email addresses exposed', risk: 'None' }
  );

  // Source maps
  const sourceMaps = lower.includes('sourcemappingurl');
  results.push(sourceMaps
    ? { name: 'Source Maps', status: 'warn', detail: 'Source maps detected — source code may be readable', risk: 'Low' }
    : { name: 'Source Maps', status: 'pass', detail: 'No source maps exposed', risk: 'None' }
  );

  // HTML comments with sensitive info
  const comments = (html.match(/<!--[\s\S]*?-->/g) || []);
  const suspiciousComments = comments.filter(c => /password|secret|key|todo|hack|bug|fix|debug/i.test(c));
  results.push(suspiciousComments.length > 0
    ? { name: 'Suspicious Comments', status: 'warn', detail: `${suspiciousComments.length} comments with sensitive keywords`, risk: 'Low' }
    : { name: 'HTML Comments', status: 'pass', detail: 'No suspicious comments found', risk: 'None' }
  );

  return results;
}

function scanTrackers(html: string) {
  const lower = html.toLowerCase();
  const found: Array<{ name: string; type: string }> = [];
  const seen = new Set<string>();
  for (const t of KNOWN_TRACKERS) {
    if (seen.has(t.name)) continue;
    for (const p of t.patterns) { if (lower.includes(p.toLowerCase())) { found.push({ name: t.name, type: t.type }); seen.add(t.name); break; } }
  }
  for (const s of INLINE_TRACKER_SIGS) {
    if (seen.has(s.name)) continue;
    if (lower.includes(s.pattern.toLowerCase())) { found.push({ name: s.name, type: s.type }); seen.add(s.name); }
  }
  return { found: found.length, list: found };
}

function fingerprintTech(html: string, response: Response) {
  const lower = html.toLowerCase();
  const det: Array<{ name: string; category: string }> = [];
  const seen = new Set<string>();
  for (const t of TECH_SIGNATURES) {
    if (seen.has(t.name)) continue;
    for (const p of t.patterns) {
      const headerVals = Array.from(response.headers.entries()).map(([,v]) => v).join(' ').toLowerCase();
      if (lower.includes(p.toLowerCase()) || headerVals.includes(p.toLowerCase())) { det.push({ name: t.name, category: t.category }); seen.add(t.name); break; }
    }
  }
  return det;
}

async function checkGPC(origin: string) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000);
    const r = await fetch(`${origin}/.well-known/gpc.json`, { method: 'GET', signal: c.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (!r.ok) return { supported: false, details: 'No GPC support declared — required in 10+ US states' };
    const json = await r.json();
    return json.gpc === true ? { supported: true, details: 'GPC support declared' } : { supported: false, details: 'gpc.json exists but set to false' };
  } catch { return { supported: false, details: 'No GPC support declared' }; }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN SCAN
// ═══════════════════════════════════════════════════════════════
export async function performDeepScan(targetUrl: string): Promise<DeepScanResult> {
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
  const origin = new URL(targetUrl).origin;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(targetUrl, { method: 'GET', signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Sec-GPC': '1' } });
    clearTimeout(tid);
  } catch (err: any) { clearTimeout(tid); throw new Error(`Cannot reach website: ${err.message}`); }

  const html = await response.text();

  // Run all checks in parallel
  const [exposedFiles, adminPanels, httpMethods, gpc] = await Promise.all([
    checkExposedFiles(origin), checkAdminPanels(origin), checkHTTPMethods(origin), checkGPC(origin)
  ]);

  const headers = checkHeaders(response);
  const cookies = checkCookies(response);
  const cors = checkCORS(response);
  const infoDisclosure = checkInfoDisclosure(response);
  const htmlAnalysis = analyzeHTML(html);
  const trackers = scanTrackers(html);
  const technologies = fingerprintTech(html, response);

  // Count totals
  const allChecks = [...headers, ...exposedFiles, ...adminPanels, ...cookies, ...cors, ...infoDisclosure, ...httpMethods, ...htmlAnalysis];
  const passed = allChecks.filter(c => c.status === 'pass').length;
  const failed = allChecks.filter(c => c.status === 'fail').length;
  const warnings = allChecks.filter(c => c.status === 'warn').length;

  // Score: start at 100, deduct per failure
  let score = 100;
  for (const c of allChecks) {
    if (c.status === 'fail') {
      if (c.risk === 'Critical') score -= 8;
      else if (c.risk === 'High') score -= 5;
      else if (c.risk === 'Medium') score -= 3;
      else score -= 1;
    }
    if (c.status === 'warn') score -= 0.5;
  }
  if (!gpc.supported) score -= 3;
  score -= trackers.found * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade = 'F';
  if (score >= 91) grade = 'A';
  else if (score >= 71) grade = 'B';
  else if (score >= 51) grade = 'C';
  else if (score >= 31) grade = 'D';

  return {
    url: targetUrl, grade, score,
    totalChecks: allChecks.length, passed, failed, warnings,
    headers, exposedFiles, adminPanels, cookies, cors,
    infoDisclosure, httpMethods, technologies,
    trackers, gpc, htmlAnalysis,
    timestamp: new Date().toISOString()
  };
}
