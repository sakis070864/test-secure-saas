// ═══════════════════════════════════════════════════════════════
//  FREE SCANNER — Quick Security Check (~50 checks)
//  Lightweight version: headers, SSL, cookies, CORS, basic files
// ═══════════════════════════════════════════════════════════════

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 ABCSecure-Audit/1.0';

export type FreeCheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };

export type FreeScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: FreeCheckResult[];
  cookies: FreeCheckResult[];
  cors: FreeCheckResult[];
  criticalFiles: FreeCheckResult[];
  technologies: Array<{ name: string; category: string }>;
  gpc: { supported: boolean; details: string };
  ssl: { secure: boolean; details: string };
  waf: { detected: boolean; detail: string; whitelistGuide: string };
  timestamp: string;
};

// ─── Core security headers (8 most important) ───
const CORE_HEADERS = [
  { name: 'strict-transport-security', desc: 'Forces HTTPS, prevents downgrade attacks' },
  { name: 'x-frame-options', desc: 'Prevents clickjacking via iframe embedding' },
  { name: 'x-content-type-options', desc: 'Prevents MIME-type sniffing attacks' },
  { name: 'content-security-policy', desc: 'Controls resource loading, prevents XSS' },
  { name: 'referrer-policy', desc: 'Controls referrer information leakage' },
  { name: 'permissions-policy', desc: 'Restricts browser feature access' },
  { name: 'x-xss-protection', desc: 'Legacy XSS filter (still audited)' },
  { name: 'cross-origin-opener-policy', desc: 'Isolates browsing context' },
];

// ─── Critical files only (5) ───
const CRITICAL_FILES = [
  { path: '/.env', risk: 'Critical', desc: 'Environment variables — passwords, API keys' },
  { path: '/.git/config', risk: 'Critical', desc: 'Git config — repo structure exposed' },
  { path: '/wp-config.php', risk: 'Critical', desc: 'WordPress config — DB credentials' },
  { path: '/backup.sql', risk: 'Critical', desc: 'Database dump — full data exposure' },
  { path: '/phpinfo.php', risk: 'High', desc: 'PHP info — server configuration exposed' },
];

// ─── Basic tech signatures ───
const BASIC_TECH = [
  { name: 'WordPress', patterns: ['wp-content', 'wp-includes'], category: 'CMS' },
  { name: 'React', patterns: ['_reactRootContainer', '__NEXT_DATA__'], category: 'Framework' },
  { name: 'Next.js', patterns: ['__NEXT_DATA__', '_next/static'], category: 'Framework' },
  { name: 'Vue.js', patterns: ['__vue__', 'vue-router'], category: 'Framework' },
  { name: 'Shopify', patterns: ['cdn.shopify.com'], category: 'E-Commerce' },
  { name: 'Wix', patterns: ['static.wixstatic.com'], category: 'Builder' },
  { name: 'Squarespace', patterns: ['squarespace.com'], category: 'Builder' },
  { name: 'Cloudflare', patterns: ['cf-ray', 'cloudflare'], category: 'CDN/Security' },
  { name: 'Nginx', patterns: ['nginx'], category: 'Server' },
  { name: 'Apache', patterns: ['apache'], category: 'Server' },
  { name: 'PHP', patterns: ['x-powered-by: php'], category: 'Language' },
  { name: 'jQuery', patterns: ['jquery.min.js'], category: 'Library' },
  { name: 'Bootstrap', patterns: ['bootstrap.min.css'], category: 'Library' },
  { name: 'Google Fonts', patterns: ['fonts.googleapis.com'], category: 'CDN' },
  { name: 'Tailwind CSS', patterns: ['tailwindcss'], category: 'Library' },
];

// ─── Helpers ───
async function quickFetch(url: string, method = 'HEAD', timeout = 5000): Promise<Response | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeout);
    const r = await fetch(url, { method, signal: c.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
    clearTimeout(t);
    return r;
  } catch { return null; }
}

// ─── Check Functions ───
function checkHeaders(response: Response, wafBlocked = false): FreeCheckResult[] {
  return CORE_HEADERS.map(h => {
    const val = response.headers.get(h.name);
    if (val) return { name: h.name, status: 'pass' as const, detail: `Present: ${val.substring(0, 60)}`, risk: 'None' };
    if (wafBlocked) return { name: h.name, status: 'warn' as const, detail: `Cannot verify — WAF/Firewall blocked the scan (HTTP 403). ${h.desc}`, risk: 'Low' };
    return { name: h.name, status: 'fail' as const, detail: `Missing — ${h.desc}`, risk: 'Medium' };
  });
}

function checkSSL(url: string): { secure: boolean; details: string } {
  const isHttps = url.startsWith('https://');
  return { secure: isHttps, details: isHttps ? 'Site uses HTTPS encryption' : 'WARNING: Site does NOT use HTTPS — all data sent in plaintext' };
}

function checkCookies(response: Response): FreeCheckResult[] {
  const results: FreeCheckResult[] = [];
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length === 0) {
    results.push({ name: 'Cookie Presence', status: 'info', detail: 'No cookies set on initial load', risk: 'None' });
    return results;
  }
  for (const c of setCookies) {
    const name = c.split('=')[0] || 'unknown';
    const lower = c.toLowerCase();
    const issues: string[] = [];
    if (!lower.includes('secure')) issues.push('No Secure flag');
    if (!lower.includes('httponly')) issues.push('No HttpOnly');
    if (!lower.match(/samesite=(strict|lax)/i)) issues.push('SameSite missing');
    results.push(issues.length === 0
      ? { name: `Cookie: ${name}`, status: 'pass', detail: 'Secure + HttpOnly + SameSite', risk: 'None' }
      : { name: `Cookie: ${name}`, status: 'fail', detail: issues.join(', '), risk: 'Medium' }
    );
  }
  return results;
}

function checkCORS(response: Response): FreeCheckResult[] {
  const acao = response.headers.get('access-control-allow-origin');
  const acac = response.headers.get('access-control-allow-credentials');
  if (!acao) return [{ name: 'CORS Policy', status: 'pass', detail: 'No CORS headers — restrictive by default', risk: 'None' }];
  if (acao === '*' && acac === 'true') return [{ name: 'CORS Policy', status: 'fail', detail: 'CRITICAL: Wildcard + credentials', risk: 'Critical' }];
  if (acao === '*') return [{ name: 'CORS Policy', status: 'warn', detail: 'Wildcard origin (*) — any site can read', risk: 'Medium' }];
  return [{ name: 'CORS Policy', status: 'pass', detail: `Restricted to: ${acao}`, risk: 'None' }];
}

async function checkCriticalFiles(origin: string): Promise<FreeCheckResult[]> {
  const results: FreeCheckResult[] = [];
  const checks = CRITICAL_FILES.map(async f => {
    const r = await quickFetch(`${origin}${f.path}`, 'HEAD', 4000);
    const s = r?.status || 0;
    if (s === 200) results.push({ name: f.path, status: 'fail', detail: `ACCESSIBLE — ${f.desc}`, risk: f.risk });
    else results.push({ name: f.path, status: 'pass', detail: 'Not found (secure)', risk: 'None' });
  });
  await Promise.all(checks);
  return results;
}

function fingerprintTech(html: string, response: Response): Array<{ name: string; category: string }> {
  const lower = html.toLowerCase();
  const headerVals = Array.from(response.headers.entries()).map(([, v]) => v).join(' ').toLowerCase();
  const detected: Array<{ name: string; category: string }> = [];
  const seen = new Set<string>();
  for (const t of BASIC_TECH) {
    if (seen.has(t.name)) continue;
    for (const p of t.patterns) {
      if (lower.includes(p.toLowerCase()) || headerVals.includes(p.toLowerCase())) {
        detected.push({ name: t.name, category: t.category }); seen.add(t.name); break;
      }
    }
  }
  return detected;
}

async function checkGPC(origin: string) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000);
    const r = await fetch(`${origin}/.well-known/gpc.json`, { method: 'GET', signal: c.signal, redirect: 'follow', headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (!r.ok) return { supported: false, details: 'No GPC support — required in 10+ US states' };
    const json = await r.json();
    return json.gpc === true ? { supported: true, details: 'GPC support declared' } : { supported: false, details: 'gpc.json exists but set to false' };
  } catch { return { supported: false, details: 'No GPC support declared' }; }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN FREE SCAN
// ═══════════════════════════════════════════════════════════════
export async function performFreeScan(targetUrl: string): Promise<FreeScanResult> {
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
  const origin = new URL(targetUrl).origin;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(targetUrl, { method: 'GET', signal: controller.signal, redirect: 'follow', headers: {
      'User-Agent': UA, 'Sec-GPC': '1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    } });
    clearTimeout(tid);
  } catch (err: any) { clearTimeout(tid); throw new Error(`Cannot reach website: ${err.message}`); }

  // If Cloudflare blocked us (403), retry with browser-like Sec-Fetch headers
  if (response.status === 403) {
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 12000);
      const retry = await fetch(targetUrl, { method: 'GET', signal: c2.signal, redirect: 'manual', headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      } });
      clearTimeout(t2);
      if (retry.status === 200) response = retry;
    } catch { /* use original 403 response */ }
  }

  // Detect WAF/Firewall blocking
  const wafBlocked = response.status === 403 || response.status === 503;
  const waf = wafBlocked
    ? {
        detected: true,
        detail: `Web Application Firewall detected (HTTP ${response.status}). Header verification may be incomplete.`,
        whitelistGuide: [
          'To get a complete scan, whitelist our scanner in your WAF/Firewall:',
          '',
          '▸ Cloudflare: Security → WAF → Custom Rules → Create Rule:',
          '  Field: User Agent | Operator: contains | Value: "ABCSecure-Audit"',
          '  Action: Skip (or Allow)',
          '',
          '▸ Sucuri: Dashboard → Access Control → Whitelist User Agent → Add "ABCSecure-Audit"',
          '',
          '▸ AWS WAF: Create an Allow rule for User-Agent containing "ABCSecure-Audit"',
          '',
          'After whitelisting, re-run the scan for complete results.',
        ].join('\n'),
      }
    : { detected: false, detail: 'No WAF blocking detected — full scan completed.', whitelistGuide: '' };

  const html = await response.text();

  // Run checks
  const [criticalFiles, gpc] = await Promise.all([checkCriticalFiles(origin), checkGPC(origin)]);
  const headers = checkHeaders(response, wafBlocked);
  const cookies = checkCookies(response);
  const cors = checkCORS(response);
  const ssl = checkSSL(targetUrl);
  const technologies = fingerprintTech(html, response);

  // Score
  const allChecks = [...headers, ...cookies, ...cors, ...criticalFiles];
  const passed = allChecks.filter(c => c.status === 'pass').length;
  const failed = allChecks.filter(c => c.status === 'fail').length;
  const warnings = allChecks.filter(c => c.status === 'warn').length;

  let score = 100;
  for (const c of allChecks) {
    if (c.status === 'fail') { score -= c.risk === 'Critical' ? 10 : c.risk === 'High' ? 6 : c.risk === 'Medium' ? 3 : 1; }
    if (c.status === 'warn') score -= 1;
  }
  if (!ssl.secure) score -= 15;
  if (!gpc.supported) score -= 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade = score >= 91 ? 'A' : score >= 71 ? 'B' : score >= 51 ? 'C' : score >= 31 ? 'D' : 'F';

  return {
    url: targetUrl, grade, score,
    totalChecks: allChecks.length, passed, failed, warnings,
    headers, cookies, cors, criticalFiles,
    technologies, gpc, ssl, waf,
    timestamp: new Date().toISOString(),
  };
}
