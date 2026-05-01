// Scan orchestrator — drives the multi-phase deep scan from the client
// Supports 'standard' tier (homepage only) and 'deep' tier (full 4-phase scan)
export type ScanPhase = 'idle' | 'spider' | 'homepage' | 'attack' | 'infra' | 'done' | 'error';
export type ScanTier = 'standard' | 'deep';

export type ScanProgress = {
  phase: ScanPhase;
  message: string;
  pagesFound: number;
  formsFound: number;
  paramsFound: number;
  pagesAttacked: number;
  totalPages: number;
  percent: number;
};

export type FullScanResult = {
  // Homepage scan
  homepageScan: any;
  token: string;
  // Spider (deep only)
  sitemap: any[];
  crawlStats: { totalPages: number; totalForms: number; totalParams: number; crawlDepth: number; crawlTimeMs: number };
  // Attacks (deep only)
  attacks: { sqli: any[]; xss: any[]; openRedirects: any[]; pathTraversal: any[]; idor: any[]; perPageHeaders: any[] };
  // Infrastructure (deep only)
  infra: { ssl: any[]; dns: any[]; subdomains: any[]; subdomainChecks: any[]; ports: any[] };
};

export async function runFullScan(
  url: string, email: string, sessionId: string,
  onProgress: (p: ScanProgress) => void,
  tier: ScanTier = 'deep'
): Promise<FullScanResult> {
  const progress: ScanProgress = { phase: 'idle', message: '', pagesFound: 0, formsFound: 0, paramsFound: 0, pagesAttacked: 0, totalPages: 0, percent: 0 };
  const update = (p: Partial<ScanProgress>) => { Object.assign(progress, p); onProgress({ ...progress }); };

  // Determine which API to call for homepage scan based on tier
  const scanEndpoint = tier === 'standard' ? '/api/scan-standard' : '/api/scan';

  // Phase 1: Homepage scan + email + lead
  const phaseLabel = tier === 'standard' ? 'Running standard security audit...' : 'Running homepage security audit...';
  update({ phase: 'homepage', message: phaseLabel, percent: 5 });
  const scanRes = await fetch(scanEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, email, sessionId }) });
  const scanData = await scanRes.json();
  if (scanData.error) throw new Error(scanData.error);

  // For standard tier: skip spider, attack, and infra — go straight to done
  if (tier === 'standard') {
    update({ phase: 'done', message: 'Standard scan complete!', percent: 100 });
    return {
      homepageScan: scanData.result,
      token: scanData.token,
      sitemap: [],
      crawlStats: { totalPages: 1, totalForms: 0, totalParams: 0, crawlDepth: 0, crawlTimeMs: 0 },
      attacks: { sqli: [], xss: [], openRedirects: [], pathTraversal: [], idor: [], perPageHeaders: [] },
      infra: { ssl: [], dns: [], subdomains: [], subdomainChecks: [], ports: [] },
    };
  }

  // ═══ DEEP TIER — Full 4-phase scan ═══
  update({ percent: 15, message: 'Homepage audit complete' });

  // Phase 2: Spider
  update({ phase: 'spider', message: 'Spider crawling entire site...', percent: 20 });
  const spiderRes = await fetch('/api/spider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, sessionId }) });
  const spiderData = await spiderRes.json();
  if (spiderData.error) throw new Error(spiderData.error);
  update({ pagesFound: spiderData.totalPages, formsFound: spiderData.totalForms, paramsFound: spiderData.totalParameters, totalPages: spiderData.totalPages, percent: 40, message: `Found ${spiderData.totalPages} pages, ${spiderData.totalForms} forms` });

  // Phase 3: Attack in batches of 5
  update({ phase: 'attack', message: 'Testing vulnerabilities...', percent: 45 });
  const allAttacks = { sqli: [] as any[], xss: [] as any[], openRedirects: [] as any[], pathTraversal: [] as any[], idor: [] as any[], perPageHeaders: [] as any[] };
  const sitemap = spiderData.sitemap || [];
  const batchSize = 5;

  for (let i = 0; i < sitemap.length; i += batchSize) {
    const batch = sitemap.slice(i, i + batchSize);
    update({ pagesAttacked: i, message: `Attacking page ${i + 1}/${sitemap.length}...`, percent: 45 + Math.round((i / Math.max(sitemap.length, 1)) * 25) });
    try {
      const atkRes = await fetch('/api/attack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, pages: batch }) });
      const atkData = await atkRes.json();
      if (!atkData.error) {
        allAttacks.sqli.push(...(atkData.sqli || []));
        allAttacks.xss.push(...(atkData.xss || []));
        allAttacks.openRedirects.push(...(atkData.openRedirects || []));
        allAttacks.pathTraversal.push(...(atkData.pathTraversal || []));
        allAttacks.idor.push(...(atkData.idor || []));
        allAttacks.perPageHeaders.push(...(atkData.perPageHeaders || []));
      }
    } catch { /* continue */ }
  }
  update({ pagesAttacked: sitemap.length, percent: 72, message: 'Vulnerability testing complete' });

  // Phase 4: Infrastructure
  update({ phase: 'infra', message: 'Scanning SSL, DNS, subdomains, ports...', percent: 75 });
  let infraData = { ssl: [], dns: [], subdomains: [], subdomainChecks: [], ports: [] };
  try {
    const infraRes = await fetch('/api/infrastructure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, sessionId }) });
    const d = await infraRes.json();
    if (!d.error) infraData = d;
  } catch { /* continue */ }
  update({ percent: 95, message: 'Infrastructure scan complete' });

  // Done
  update({ phase: 'done', message: 'Deep scan complete!', percent: 100 });

  return {
    homepageScan: scanData.result,
    token: scanData.token,
    sitemap,
    crawlStats: { totalPages: spiderData.totalPages, totalForms: spiderData.totalForms, totalParams: spiderData.totalParameters, crawlDepth: spiderData.crawlDepth, crawlTimeMs: spiderData.crawlTimeMs },
    attacks: allAttacks,
    infra: infraData,
  };
}
