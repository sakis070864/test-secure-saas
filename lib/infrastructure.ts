// ═══════════════════════════════════════════════════════════════
//  INFRASTRUCTURE SCANNER — SSL/TLS, DNS, Subdomains, Ports
// ═══════════════════════════════════════════════════════════════

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

export type InfraResult = {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  detail: string;
  risk: string;
  category: 'ssl' | 'dns' | 'subdomain' | 'port';
};

export type SubdomainResult = {
  subdomain: string;
  fullDomain: string;
  alive: boolean;
  statusCode?: number;
};

export type InfrastructureScanResult = {
  ssl: InfraResult[];
  dns: InfraResult[];
  subdomains: SubdomainResult[];
  subdomainChecks: InfraResult[];
  ports: InfraResult[];
};

// ═══════════════════════════════════════════════════════════════
//  SSL/TLS ANALYSIS (via HTTPS connection properties)
// ═══════════════════════════════════════════════════════════════
async function checkSSL(domain: string): Promise<InfraResult[]> {
  const results: InfraResult[] = [];

  // Test HTTPS availability
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeout);

    results.push({
      name: 'HTTPS Available',
      status: 'pass',
      detail: `Site responds over HTTPS (${response.status})`,
      risk: 'None', category: 'ssl',
    });

    // Check HSTS
    const hsts = response.headers.get('strict-transport-security');
    if (hsts) {
      const maxAge = hsts.match(/max-age=(\d+)/);
      const age = maxAge ? parseInt(maxAge[1]) : 0;
      if (age >= 31536000) {
        results.push({ name: 'HSTS', status: 'pass', detail: `HSTS enabled with max-age=${age} (≥1 year)`, risk: 'None', category: 'ssl' });
      } else if (age > 0) {
        results.push({ name: 'HSTS', status: 'warn', detail: `HSTS max-age=${age} — recommend ≥31536000 (1 year)`, risk: 'Low', category: 'ssl' });
      }
      if (hsts.includes('includeSubDomains')) {
        results.push({ name: 'HSTS includeSubDomains', status: 'pass', detail: 'Subdomains included in HSTS policy', risk: 'None', category: 'ssl' });
      } else {
        results.push({ name: 'HSTS includeSubDomains', status: 'warn', detail: 'Subdomains not included in HSTS policy', risk: 'Low', category: 'ssl' });
      }
      if (hsts.includes('preload')) {
        results.push({ name: 'HSTS Preload', status: 'pass', detail: 'HSTS preload directive present', risk: 'None', category: 'ssl' });
      } else {
        results.push({ name: 'HSTS Preload', status: 'info', detail: 'HSTS preload not configured — consider submitting to preload list', risk: 'None', category: 'ssl' });
      }
    } else {
      results.push({ name: 'HSTS', status: 'fail', detail: 'HSTS not configured — browsers may connect over HTTP', risk: 'High', category: 'ssl' });
    }
  } catch {
    results.push({
      name: 'HTTPS Available',
      status: 'fail',
      detail: 'Site does not respond over HTTPS',
      risk: 'Critical', category: 'ssl',
    });
  }

  // Test HTTP → HTTPS redirect
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`http://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeout);

    const location = response.headers.get('location') || '';
    if (response.status >= 300 && response.status < 400 && location.startsWith('https://')) {
      results.push({ name: 'HTTP to HTTPS Redirect', status: 'pass', detail: `Redirects to ${location}`, risk: 'None', category: 'ssl' });
    } else if (response.status === 200) {
      results.push({ name: 'HTTP to HTTPS Redirect', status: 'fail', detail: 'Site serves content over HTTP without redirecting to HTTPS', risk: 'High', category: 'ssl' });
    }
  } catch {
    results.push({ name: 'HTTP to HTTPS Redirect', status: 'info', detail: 'HTTP port not responding (may be blocked)', risk: 'None', category: 'ssl' });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  DNS SECURITY (SPF, DKIM, DMARC)
// ═══════════════════════════════════════════════════════════════
async function checkDNS(domain: string): Promise<InfraResult[]> {
  const results: InfraResult[] = [];

  // Use DNS-over-HTTPS (Cloudflare) for DNS record lookup
  async function dnsLookup(name: string, type: string): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
        { headers: { Accept: 'application/dns-json' }, signal: controller.signal }
      );
      clearTimeout(timeout);
      const data = await response.json() as { Answer?: { data: string }[] };
      return (data.Answer || []).map((a: { data: string }) => a.data);
    } catch {
      return [];
    }
  }

  // SPF
  const txtRecords = await dnsLookup(domain, 'TXT');
  const spf = txtRecords.find(r => r.includes('v=spf1'));
  if (spf) {
    if (spf.includes('-all')) {
      results.push({ name: 'SPF Record', status: 'pass', detail: `SPF configured with hard fail: ${spf.substring(0, 100)}`, risk: 'None', category: 'dns' });
    } else if (spf.includes('~all')) {
      results.push({ name: 'SPF Record', status: 'warn', detail: `SPF configured with soft fail: ${spf.substring(0, 100)}`, risk: 'Low', category: 'dns' });
    } else {
      results.push({ name: 'SPF Record', status: 'warn', detail: `SPF present but no fail mechanism: ${spf.substring(0, 100)}`, risk: 'Medium', category: 'dns' });
    }
  } else {
    results.push({ name: 'SPF Record', status: 'fail', detail: 'No SPF record — domain can be spoofed for phishing', risk: 'High', category: 'dns' });
  }

  // DMARC
  const dmarcRecords = await dnsLookup(`_dmarc.${domain}`, 'TXT');
  const dmarc = dmarcRecords.find(r => r.includes('v=DMARC1'));
  if (dmarc) {
    const policy = dmarc.match(/p=(none|quarantine|reject)/i);
    if (policy && policy[1].toLowerCase() === 'reject') {
      results.push({ name: 'DMARC Policy', status: 'pass', detail: `DMARC with reject policy: ${dmarc.substring(0, 100)}`, risk: 'None', category: 'dns' });
    } else if (policy && policy[1].toLowerCase() === 'quarantine') {
      results.push({ name: 'DMARC Policy', status: 'pass', detail: `DMARC with quarantine policy: ${dmarc.substring(0, 100)}`, risk: 'None', category: 'dns' });
    } else {
      results.push({ name: 'DMARC Policy', status: 'warn', detail: `DMARC set to "none" (monitoring only): ${dmarc.substring(0, 100)}`, risk: 'Medium', category: 'dns' });
    }
  } else {
    results.push({ name: 'DMARC Policy', status: 'fail', detail: 'No DMARC record — email spoofing prevention not configured', risk: 'High', category: 'dns' });
  }

  // DKIM (check common selectors)
  const dkimSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'mail', 'dkim'];
  let dkimFound = false;
  for (const selector of dkimSelectors) {
    const dkimRecords = await dnsLookup(`${selector}._domainkey.${domain}`, 'TXT');
    if (dkimRecords.some(r => r.includes('v=DKIM1') || r.includes('p='))) {
      dkimFound = true;
      results.push({ name: 'DKIM', status: 'pass', detail: `DKIM record found for selector "${selector}"`, risk: 'None', category: 'dns' });
      break;
    }
  }
  if (!dkimFound) {
    results.push({ name: 'DKIM', status: 'warn', detail: 'No DKIM record found (checked common selectors)', risk: 'Medium', category: 'dns' });
  }

  // MX Records
  const mxRecords = await dnsLookup(domain, 'MX');
  if (mxRecords.length > 0) {
    results.push({ name: 'MX Records', status: 'info', detail: `${mxRecords.length} MX record(s): ${mxRecords.slice(0, 3).join(', ').substring(0, 120)}`, risk: 'None', category: 'dns' });
  } else {
    results.push({ name: 'MX Records', status: 'info', detail: 'No MX records — domain may not receive email', risk: 'None', category: 'dns' });
  }

  // CAA Record (Certificate Authority Authorization)
  const caaRecords = await dnsLookup(domain, 'CAA');
  if (caaRecords.length > 0) {
    results.push({ name: 'CAA Record', status: 'pass', detail: `CAA restricts certificate issuance: ${caaRecords[0].substring(0, 100)}`, risk: 'None', category: 'dns' });
  } else {
    results.push({ name: 'CAA Record', status: 'warn', detail: 'No CAA record — any CA can issue certificates for this domain', risk: 'Low', category: 'dns' });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  SUBDOMAIN DISCOVERY — Real OSINT Data Only (No Guessing)
//  Sources: CertSpotter, crt.sh, HackerTarget, AlienVault OTX
//  Filtering: DNS-level wildcard IP comparison + HTTP fingerprinting
// ═══════════════════════════════════════════════════════════════

// ─── Wildcard DNS Fingerprint (HTTP-level) ─────────────────────
type WildcardFingerprint = {
  detected: boolean;
  statusCode: number;
  bodySize: number;
} | null;

async function getWildcardBaseline(domain: string): Promise<WildcardFingerprint> {
  const fakeSubdomain = `xj7q9z-baseline-${Date.now()}.${domain}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://${fakeSubdomain}`, {
      method: 'GET', signal: controller.signal, redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeout);
    const body = await response.text();
    return { detected: true, statusCode: response.status, bodySize: body.length };
  } catch {
    return null;
  }
}

function matchesWildcard(statusCode: number, bodySize: number, baseline: WildcardFingerprint): boolean {
  if (!baseline || !baseline.detected) return false;
  if (statusCode !== baseline.statusCode) return false;
  const tolerance = Math.max(baseline.bodySize * 0.1, 50);
  return Math.abs(bodySize - baseline.bodySize) <= tolerance;
}

// ─── DNS-level Wildcard IP Detection (Google DNS-over-HTTPS) ───
// Real subdomains point to the SAME IPs as the root domain.
// Wildcard catch-all phantoms point to DIFFERENT IPs.
// We use Google's public DNS API to resolve and compare.
type DnsWildcardBaseline = {
  detected: boolean;
  wildcardIPs: Set<string>;
  rootIPs: Set<string>;
} | null;

async function getDnsWildcardBaseline(domain: string): Promise<DnsWildcardBaseline> {
  try {
    // Resolve root domain
    const rootRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    if (!rootRes.ok) return null;
    const rootData = await rootRes.json() as { Answer?: { data: string }[] };
    const rootIPs = new Set<string>((rootData.Answer || []).map(a => a.data));

    // Resolve a guaranteed-fake subdomain
    const fakeRes = await fetch(
      `https://dns.google/resolve?name=xj7q9z-baseline-${Date.now()}.${encodeURIComponent(domain)}&type=A`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    if (!fakeRes.ok) return null;
    const fakeData = await fakeRes.json() as { Answer?: { data: string }[] };
    const wildcardIPs = new Set<string>((fakeData.Answer || []).map(a => a.data));

    if (wildcardIPs.size === 0) return null; // No wildcard DNS

    // Check if wildcard IPs differ from root IPs
    const hasOverlap = [...wildcardIPs].some(ip => rootIPs.has(ip));
    return { detected: !hasOverlap, wildcardIPs, rootIPs };
  } catch {
    return null;
  }
}

async function resolveSubdomainIPs(subdomain: string, domain: string): Promise<Set<string>> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(subdomain)}.${encodeURIComponent(domain)}&type=A`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    if (!res.ok) return new Set();
    const data = await res.json() as { Answer?: { data: string }[] };
    return new Set<string>((data.Answer || []).map(a => a.data));
  } catch {
    return new Set();
  }
}

function isDnsWildcard(subIPs: Set<string>, baseline: DnsWildcardBaseline): boolean {
  if (!baseline || !baseline.detected) return false;
  if (subIPs.size === 0) return false;
  // If the subdomain IPs match the wildcard IPs (not root IPs), it's a phantom
  const matchesWildcardIPs = [...subIPs].every(ip => baseline.wildcardIPs.has(ip));
  const matchesRootIPs = [...subIPs].some(ip => baseline.rootIPs.has(ip));
  return matchesWildcardIPs && !matchesRootIPs;
}

// ─── Subdomain Prober ──────────────────────────────────────────
async function probeSubdomain(
  sub: string, domain: string
): Promise<{ subdomain: string; fullDomain: string; alive: boolean; statusCode: number; bodySize: number } | null> {
  const fullDomain = `${sub}.${domain}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`https://${fullDomain}`, {
      method: 'GET', signal: controller.signal, redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timeout);
    const body = await response.text();
    return { subdomain: sub, fullDomain, alive: true, statusCode: response.status, bodySize: body.length };
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`http://${fullDomain}`, {
        method: 'GET', signal: controller.signal, redirect: 'follow',
        headers: { 'User-Agent': UA },
      });
      clearTimeout(timeout);
      const body = await response.text();
      return { subdomain: sub, fullDomain, alive: true, statusCode: response.status, bodySize: body.length };
    } catch {
      return null;
    }
  }
}

// ─── OSINT Source 1: CertSpotter (most reliable) ───────────────
// SSLMate's Certificate Transparency search engine.
// Free, no API key, very reliable uptime.
async function osintCertSpotter(domain: string): Promise<string[]> {
  const subdomains = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];

    const data = await response.json() as { dns_names?: string[] }[];
    for (const entry of data) {
      for (const name of entry.dns_names || []) {
        const clean = name.trim().toLowerCase().replace(/^\*\./, '');
        if (clean.endsWith(`.${domain}`) && clean !== domain) {
          const sub = clean.replace(`.${domain}`, '');
          if (sub && !sub.includes('*') && !sub.includes(' ')) {
            subdomains.add(sub);
          }
        }
      }
    }
  } catch { /* CertSpotter unavailable */ }
  return Array.from(subdomains);
}

// ─── OSINT Source 2: crt.sh (Certificate Transparency) ─────────
// Free, no API key. Frequently down but good data when available.
async function osintCrtSh(domain: string): Promise<string[]> {
  const subdomains = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];

    const data = await response.json() as { common_name?: string; name_value?: string }[];
    for (const entry of data) {
      const names = [entry.common_name, ...(entry.name_value?.split('\n') || [])];
      for (const name of names) {
        if (!name) continue;
        const clean = name.trim().toLowerCase().replace(/^\*\./, '');
        if (clean.endsWith(`.${domain}`) && clean !== domain) {
          const sub = clean.replace(`.${domain}`, '');
          if (sub && !sub.includes('*') && !sub.includes(' ')) {
            subdomains.add(sub);
          }
        }
      }
    }
  } catch { /* crt.sh unavailable */ }
  return Array.from(subdomains);
}

// ─── OSINT Source 3: HackerTarget ──────────────────────────────
// DNS host search from aggregated records. Free, no API key.
async function osintHackerTarget(domain: string): Promise<string[]> {
  const subdomains = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`,
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];

    const text = await response.text();
    if (text.startsWith('error') || text.includes('API count exceeded')) return [];

    for (const line of text.split('\n')) {
      const host = line.split(',')[0]?.trim().toLowerCase();
      if (!host) continue;
      if (host.endsWith(`.${domain}`) && host !== domain) {
        const sub = host.replace(`.${domain}`, '');
        if (sub && !sub.includes(' ')) {
          subdomains.add(sub);
        }
      }
    }
  } catch { /* HackerTarget unavailable */ }
  return Array.from(subdomains);
}

// ─── OSINT Source 4: AlienVault OTX ────────────────────────────
// Passive DNS from threat intelligence. Free, no API key.
async function osintAlienVault(domain: string): Promise<string[]> {
  const subdomains = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/passive_dns`,
      { signal: controller.signal, headers: { 'User-Agent': UA } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];

    const data = await response.json() as { passive_dns?: { hostname?: string }[] };
    for (const record of data.passive_dns || []) {
      const host = record.hostname?.trim().toLowerCase();
      if (!host) continue;
      if (host.endsWith(`.${domain}`) && host !== domain) {
        const sub = host.replace(`.${domain}`, '');
        if (sub && !sub.includes('*') && !sub.includes(' ')) {
          subdomains.add(sub);
        }
      }
    }
  } catch { /* AlienVault unavailable */ }
  return Array.from(subdomains);
}

// ─── Source 5: DNS Brute-Force Wordlist ─────────────────────────
// Resolves common subdomain names via Cloudflare DNS-over-HTTPS.
// Catches subdomains that OSINT sources haven't indexed yet.
const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'webmail', 'mx',
  'app', 'api', 'dev', 'staging', 'stage', 'test', 'beta', 'demo',
  'scan', 'admin', 'panel', 'dashboard', 'portal', 'login', 'auth',
  'blog', 'shop', 'store', 'cdn', 'static', 'media', 'assets', 'img',
  'docs', 'help', 'support', 'status', 'monitor', 'grafana',
  'git', 'gitlab', 'jenkins', 'ci', 'deploy',
  'vpn', 'remote', 'ssh', 'ns1', 'ns2', 'dns',
  'crm', 'erp', 'hr', 'wiki', 'intranet',
  'sandbox', 'preview', 'uat', 'qa',
];

async function dnsWordlistBrute(domain: string): Promise<string[]> {
  const found: string[] = [];
  // Batch resolve in groups of 10 to avoid overloading
  const batches: string[][] = [];
  for (let i = 0; i < COMMON_SUBDOMAINS.length; i += 10) {
    batches.push(COMMON_SUBDOMAINS.slice(i, i + 10));
  }
  for (const batch of batches) {
    const results = await Promise.all(batch.map(async (sub) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(`${sub}.${domain}`)}&type=A`,
          { headers: { Accept: 'application/dns-json' }, signal: controller.signal }
        );
        clearTimeout(timeout);
        const data = await res.json() as { Answer?: { data: string }[] };
        if (data.Answer && data.Answer.length > 0) return sub;
        return null;
      } catch { return null; }
    }));
    for (const r of results) { if (r) found.push(r); }
  }
  return found;
}

// ─── Main Discovery ────────────────────────────────────────────
async function discoverSubdomains(domain: string, userSubdomains: string[] = []): Promise<{ subdomains: SubdomainResult[]; checks: InfraResult[] }> {
  const subdomains: SubdomainResult[] = [];
  const checks: InfraResult[] = [];

  // ── Step 1: HTTP Wildcard Baseline ──
  const wildcardBaseline = await getWildcardBaseline(domain);
  if (wildcardBaseline?.detected) {
    checks.push({
      name: 'Wildcard DNS Detected',
      status: 'info',
      detail: `Domain uses wildcard DNS (*.${domain} resolves). Baseline: ${wildcardBaseline.statusCode} / ${wildcardBaseline.bodySize} bytes. Filtering false positives.`,
      risk: 'None', category: 'subdomain',
    });
  }

  // ── Step 2: DNS-level Wildcard IP Detection ──
  const dnsBaseline = await getDnsWildcardBaseline(domain);
  if (dnsBaseline?.detected) {
    checks.push({
      name: 'DNS Wildcard IP Analysis',
      status: 'info',
      detail: `Root IPs: ${[...dnsBaseline.rootIPs].join(', ')} | Wildcard IPs: ${[...dnsBaseline.wildcardIPs].join(', ')}. Using IP comparison to filter phantoms.`,
      risk: 'None', category: 'subdomain',
    });
  }

  // ── Step 3: Query all OSINT sources + DNS brute-force in parallel ──
  const [csResults, ctResults, htResults, avResults, bfResults] = await Promise.all([
    osintCertSpotter(domain),
    osintCrtSh(domain),
    osintHackerTarget(domain),
    osintAlienVault(domain),
    dnsWordlistBrute(domain),
  ]);

  const sourceSummary: string[] = [];
  if (csResults.length > 0) sourceSummary.push(`CertSpotter: ${csResults.length}`);
  if (ctResults.length > 0) sourceSummary.push(`crt.sh: ${ctResults.length}`);
  if (htResults.length > 0) sourceSummary.push(`HackerTarget: ${htResults.length}`);
  if (avResults.length > 0) sourceSummary.push(`AlienVault: ${avResults.length}`);
  if (bfResults.length > 0) sourceSummary.push(`DNS Brute: ${bfResults.length}`);

  // ── Step 4: Merge & deduplicate (OSINT + brute-force + user-provided) ──
  const allDiscovered = new Set<string>([...csResults, ...ctResults, ...htResults, ...avResults, ...bfResults, ...userSubdomains]);

  if (userSubdomains.length > 0) {
    checks.push({
      name: 'User-Provided Subdomains',
      status: 'info',
      detail: `${userSubdomains.length} subdomain(s) provided by the user: ${userSubdomains.join(', ')}`,
      risk: 'None', category: 'subdomain',
    });
  }

  if (sourceSummary.length > 0) {
    checks.push({
      name: 'OSINT Subdomain Intelligence',
      status: 'info',
      detail: `Queried 5 sources - ${allDiscovered.size} unique subdomain(s) discovered (${sourceSummary.join(', ')})`,
      risk: 'None', category: 'subdomain',
    });
  } else {
    checks.push({
      name: 'OSINT Subdomain Intelligence',
      status: 'info',
      detail: 'All 5 sources returned 0 results (CertSpotter, crt.sh, HackerTarget, AlienVault, DNS Brute-Force)',
      risk: 'None', category: 'subdomain',
    });
  }

  if (allDiscovered.size === 0) {
    checks.push({
      name: 'Subdomain Discovery',
      status: 'pass',
      detail: 'No subdomains found in public intelligence sources',
      risk: 'None', category: 'subdomain',
    });
    return { subdomains, checks };
  }

  // ── Step 5: Probe discovered subdomains in batches ──
  const allSubsArray = Array.from(allDiscovered);
  const batches: string[][] = [];
  for (let i = 0; i < allSubsArray.length; i += 10) {
    batches.push(allSubsArray.slice(i, i + 10));
  }

  let wildcardFiltered = 0;

  for (const batch of batches) {
    const promises = batch.map(async (sub) => {
      // DNS-level wildcard check first (cheaper than HTTP)
      if (dnsBaseline?.detected) {
        const subIPs = await resolveSubdomainIPs(sub, domain);
        if (isDnsWildcard(subIPs, dnsBaseline)) {
          wildcardFiltered++;
          return;
        }
      }

      const result = await probeSubdomain(sub, domain);
      if (!result) return;

      // ── Step 6: HTTP-level wildcard filter as backup ──
      if (matchesWildcard(result.statusCode, result.bodySize, wildcardBaseline)) {
        wildcardFiltered++;
        return;
      }

      subdomains.push({
        subdomain: result.subdomain,
        fullDomain: result.fullDomain,
        alive: true,
        statusCode: result.statusCode,
      });
    });
    await Promise.all(promises);
  }

  // ── Step 7: Report results ──
  const alive = subdomains.filter(s => s.alive);

  if (alive.length > 0) {
    const filteredNote = wildcardFiltered > 0
      ? ` (${wildcardFiltered} wildcard false positives filtered)`
      : '';
    checks.push({
      name: 'Subdomain Discovery',
      status: 'info',
      detail: `Found ${alive.length} verified subdomain(s) from ${allDiscovered.size} discovered${filteredNote}`,
      risk: 'None', category: 'subdomain',
    });

    // List each verified subdomain individually
    const dangerousSubs = ['admin', 'phpmyadmin', 'staging', 'dev', 'test', 'backup', 'db', 'database', 'mysql', 'mongo', 'redis', 'jenkins', 'git', 'gitlab', 'grafana', 'kibana', 'internal', 'cpanel', 'whm', 'plesk'];
    for (const sub of alive) {
      const isDangerous = dangerousSubs.includes(sub.subdomain);
      checks.push({
        name: isDangerous ? `EXPOSED: ${sub.fullDomain}` : sub.fullDomain,
        status: isDangerous ? 'warn' : 'pass',
        detail: isDangerous
          ? `Potentially sensitive subdomain "${sub.subdomain}" is publicly accessible (HTTP ${sub.statusCode})`
          : `Active subdomain — HTTP ${sub.statusCode}`,
        risk: isDangerous ? 'Medium' : 'None',
        category: 'subdomain',
      });
    }
  } else {
    const filteredNote = wildcardFiltered > 0
      ? ` (${wildcardFiltered} wildcard catch-all responses filtered)`
      : '';
    checks.push({
      name: 'Subdomain Discovery',
      status: 'pass',
      detail: `No live subdomains from ${allDiscovered.size} discovered${filteredNote}`,
      risk: 'None', category: 'subdomain',
    });
  }

  return { subdomains, checks };
}

// ═══════════════════════════════════════════════════════════════
//  PORT SCAN (HTTP-based probing)
// ═══════════════════════════════════════════════════════════════
const SCAN_PORTS = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 25, service: 'SMTP' },
  { port: 80, service: 'HTTP' },
  { port: 443, service: 'HTTPS' },
  { port: 445, service: 'SMB' },
  { port: 1433, service: 'MSSQL' },
  { port: 3000, service: 'Node.js/Dev' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 5900, service: 'VNC' },
  { port: 6379, service: 'Redis' },
  { port: 8080, service: 'HTTP Alt' },
  { port: 8443, service: 'HTTPS Alt' },
  { port: 8888, service: 'HTTP Alt' },
  { port: 9090, service: 'Prometheus' },
  { port: 9200, service: 'Elasticsearch' },
  { port: 27017, service: 'MongoDB' },
];

async function scanPorts(domain: string): Promise<InfraResult[]> {
  const results: InfraResult[] = [];
  const openPorts: string[] = [];

  const promises = SCAN_PORTS.map(async ({ port, service }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const protocol = port === 443 || port === 8443 ? 'https' : 'http';
      const response = await fetch(`${protocol}://${domain}:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA },
      });
      clearTimeout(timeout);

      // Port responded
      openPorts.push(`${port}/${service}`);

      // Flag dangerous open ports
      const dangerous = [21, 22, 25, 445, 1433, 3306, 3389, 5432, 5900, 6379, 9200, 27017];
      if (dangerous.includes(port)) {
        results.push({
          name: `Port ${port} (${service})`,
          status: 'fail',
          detail: `Dangerous service "${service}" is publicly accessible on port ${port}`,
          risk: port === 3389 || port === 5900 ? 'Critical' : 'High',
          category: 'port',
        });
      } else if (port === 3000 || port === 8080 || port === 8888 || port === 9090) {
        results.push({
          name: `Port ${port} (${service})`,
          status: 'warn',
          detail: `Development/monitoring service on port ${port} (${response.status})`,
          risk: 'Medium', category: 'port',
        });
      }
    } catch {
      // Port closed or filtered — good
    }
  });

  await Promise.all(promises);

  if (openPorts.length === 0 || results.length === 0) {
    results.push({
      name: 'Port Scan',
      status: 'pass',
      detail: `Scanned ${SCAN_PORTS.length} common ports — no dangerous services exposed`,
      risk: 'None', category: 'port',
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN INFRASTRUCTURE SCAN
// ═══════════════════════════════════════════════════════════════
export async function scanInfrastructure(targetUrl: string, userSubdomains: string[] = []): Promise<InfrastructureScanResult> {
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
  const domain = new URL(targetUrl).hostname;

  // Run all infrastructure checks in parallel
  const [ssl, dns, { subdomains, checks: subdomainChecks }, ports] = await Promise.all([
    checkSSL(domain),
    checkDNS(domain),
    discoverSubdomains(domain, userSubdomains),
    scanPorts(domain),
  ]);

  return { ssl, dns, subdomains, subdomainChecks, ports };
}
