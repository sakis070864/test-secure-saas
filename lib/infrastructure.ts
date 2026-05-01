// ═══════════════════════════════════════════════════════════════
//  INFRASTRUCTURE SCANNER — SSL/TLS, DNS, Subdomains, Ports
// ═══════════════════════════════════════════════════════════════

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
      results.push({ name: 'HTTP → HTTPS Redirect', status: 'pass', detail: `Redirects to ${location}`, risk: 'None', category: 'ssl' });
    } else if (response.status === 200) {
      results.push({ name: 'HTTP → HTTPS Redirect', status: 'fail', detail: 'Site serves content over HTTP without redirecting to HTTPS', risk: 'High', category: 'ssl' });
    }
  } catch {
    results.push({ name: 'HTTP → HTTPS Redirect', status: 'info', detail: 'HTTP port not responding (may be blocked)', risk: 'None', category: 'ssl' });
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
//  SUBDOMAIN DISCOVERY
// ═══════════════════════════════════════════════════════════════
const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'imap',
  'admin', 'api', 'dev', 'staging', 'test', 'beta', 'demo',
  'app', 'portal', 'dashboard', 'panel', 'cms', 'blog',
  'shop', 'store', 'secure', 'vpn', 'remote', 'intranet',
  'cdn', 'media', 'static', 'assets', 'img', 'images',
  'docs', 'wiki', 'help', 'support', 'status',
  'db', 'database', 'mysql', 'mongo', 'redis', 'elastic',
  'git', 'gitlab', 'jenkins', 'ci', 'deploy',
  'ns1', 'ns2', 'dns', 'ns',
  'mx', 'mx1', 'mx2',
  'backup', 'old', 'legacy', 'archive',
  'staging2', 'dev2', 'test2', 'uat',
  'gateway', 'proxy', 'lb', 'loadbalancer',
  'grafana', 'kibana', 'prometheus', 'monitor',
  'm', 'mobile', 'wap',
  'crm', 'erp', 'hr', 'internal',
  'sso', 'auth', 'login', 'accounts',
  'sandbox', 'preview', 'canary',
  'autodiscover', 'autoconfig',
  'cpanel', 'whm', 'plesk',
  's3', 'bucket', 'storage',
];

async function discoverSubdomains(domain: string): Promise<{ subdomains: SubdomainResult[]; checks: InfraResult[] }> {
  const subdomains: SubdomainResult[] = [];
  const checks: InfraResult[] = [];

  // Use DNS to check if subdomain resolves
  const batches: string[][] = [];
  for (let i = 0; i < COMMON_SUBDOMAINS.length; i += 10) {
    batches.push(COMMON_SUBDOMAINS.slice(i, i + 10));
  }

  for (const batch of batches) {
    const promises = batch.map(async (sub) => {
      const fullDomain = `${sub}.${domain}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`https://${fullDomain}`, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': UA },
        });
        clearTimeout(timeout);
        subdomains.push({ subdomain: sub, fullDomain, alive: true, statusCode: response.status });
      } catch {
        // Try HTTP as fallback
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(`http://${fullDomain}`, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': UA },
          });
          clearTimeout(timeout);
          subdomains.push({ subdomain: sub, fullDomain, alive: true, statusCode: response.status });
        } catch {
          // Not alive — don't add
        }
      }
    });
    await Promise.all(promises);
  }

  const alive = subdomains.filter(s => s.alive);
  if (alive.length > 0) {
    checks.push({
      name: 'Subdomain Discovery',
      status: 'info',
      detail: `Found ${alive.length} live subdomains out of ${COMMON_SUBDOMAINS.length} tested`,
      risk: 'None', category: 'subdomain',
    });

    // Flag potentially dangerous subdomains
    const dangerousSubs = ['admin', 'phpmyadmin', 'staging', 'dev', 'test', 'backup', 'db', 'database', 'mysql', 'mongo', 'redis', 'jenkins', 'git', 'gitlab', 'grafana', 'kibana', 'internal', 'cpanel', 'whm', 'plesk'];
    for (const sub of alive) {
      if (dangerousSubs.includes(sub.subdomain)) {
        checks.push({
          name: `Exposed: ${sub.fullDomain}`,
          status: 'warn',
          detail: `Potentially sensitive subdomain "${sub.subdomain}" is publicly accessible (${sub.statusCode})`,
          risk: 'Medium', category: 'subdomain',
        });
      }
    }
  } else {
    checks.push({
      name: 'Subdomain Discovery',
      status: 'pass',
      detail: `No additional subdomains found (tested ${COMMON_SUBDOMAINS.length} common names)`,
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
export async function scanInfrastructure(targetUrl: string): Promise<InfrastructureScanResult> {
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
  const domain = new URL(targetUrl).hostname;

  // Run all infrastructure checks in parallel
  const [ssl, dns, { subdomains, checks: subdomainChecks }, ports] = await Promise.all([
    checkSSL(domain),
    checkDNS(domain),
    discoverSubdomains(domain),
    scanPorts(domain),
  ]);

  return { ssl, dns, subdomains, subdomainChecks, ports };
}
