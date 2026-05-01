// ═══════════════════════════════════════════════════════════════
//  WEB SPIDER ENGINE — Full-Site Recursive Crawler
//  Discovers every page, form, parameter, and asset
// ═══════════════════════════════════════════════════════════════

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MAX_PAGES = 50;
const MAX_DEPTH = 5;
const CONCURRENCY = 5;
const PAGE_TIMEOUT = 8000;

// ─── Types ──────────────────────────────────────────────────────
export type DiscoveredForm = {
  action: string;
  method: string;
  fields: { name: string; type: string }[];
  pageUrl: string;
};

export type DiscoveredPage = {
  url: string;
  statusCode: number;
  contentType: string;
  html: string;
  responseHeaders: Record<string, string>;
  forms: DiscoveredForm[];
  parameters: string[];       // query param keys found on this URL
  internalLinks: string[];
  externalLinks: string[];
  scripts: string[];
  depth: number;
};

export type SpiderResult = {
  pages: DiscoveredPage[];
  allForms: DiscoveredForm[];
  allParameters: { url: string; params: string[] }[];
  totalPages: number;
  totalForms: number;
  totalParameters: number;
  totalInternalLinks: number;
  totalExternalLinks: number;
  crawlDepth: number;
  crawlTimeMs: number;
  domain: string;
};

// ─── URL Helpers ────────────────────────────────────────────────
function normalizeUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    // Remove fragment
    url.hash = '';
    // Remove trailing slash for consistency (except root)
    let normalized = url.href;
    if (url.pathname !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

function isSameDomain(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
  } catch {
    return false;
  }
}

function isScannablePath(url: string): boolean {
  try {
    const parsed = new URL(url);
    const ext = parsed.pathname.split('.').pop()?.toLowerCase() || '';
    // Skip binary files, images, fonts, etc.
    const skipExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp',
      'mp4', 'webm', 'avi', 'mov', 'mp3', 'wav', 'ogg',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'tar', 'gz', 'rar', '7z',
      'woff', 'woff2', 'ttf', 'eot', 'otf',
      'css', 'map'];
    return !skipExts.includes(ext);
  } catch {
    return false;
  }
}

// ─── HTML Parser Helpers ────────────────────────────────────────
function extractLinks(html: string, baseUrl: string, domain: string): { internal: string[]; external: string[] } {
  const internal = new Set<string>();
  const external = new Set<string>();

  // <a href="...">
  const hrefRegex = /href\s*=\s*["']([^"'#]+)/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const normalized = normalizeUrl(baseUrl, match[1]);
    if (!normalized) continue;
    if (normalized.startsWith('mailto:') || normalized.startsWith('tel:') || normalized.startsWith('javascript:')) continue;
    if (isSameDomain(normalized, domain) && isScannablePath(normalized)) {
      internal.add(normalized);
    } else if (normalized.startsWith('http')) {
      external.add(normalized);
    }
  }

  // Also check <meta http-equiv="refresh" content="0;url=...">
  const metaRefresh = html.match(/content\s*=\s*["'][^"']*url\s*=\s*([^"'\s;]+)/i);
  if (metaRefresh) {
    const normalized = normalizeUrl(baseUrl, metaRefresh[1]);
    if (normalized && isSameDomain(normalized, domain)) internal.add(normalized);
  }

  return { internal: Array.from(internal), external: Array.from(external) };
}

function extractForms(html: string, pageUrl: string): DiscoveredForm[] {
  const forms: DiscoveredForm[] = [];
  const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  let match;

  while ((match = formRegex.exec(html)) !== null) {
    const formTag = match[0];
    const formContent = match[1];

    // Extract action
    const actionMatch = formTag.match(/action\s*=\s*["']([^"']*)/i);
    const action = actionMatch ? normalizeUrl(pageUrl, actionMatch[1]) || pageUrl : pageUrl;

    // Extract method
    const methodMatch = formTag.match(/method\s*=\s*["']([^"']*)/i);
    const method = (methodMatch?.[1] || 'GET').toUpperCase();

    // Extract input fields
    const fields: { name: string; type: string }[] = [];
    const inputRegex = /<(?:input|textarea|select)[^>]*>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(formContent)) !== null) {
      const nameM = inputMatch[0].match(/name\s*=\s*["']([^"']*)/i);
      const typeM = inputMatch[0].match(/type\s*=\s*["']([^"']*)/i);
      if (nameM) {
        fields.push({ name: nameM[1], type: typeM?.[1]?.toLowerCase() || 'text' });
      }
    }

    if (fields.length > 0) {
      forms.push({ action, method, fields, pageUrl });
    }
  }

  return forms;
}

function extractScripts(html: string, baseUrl: string): string[] {
  const scripts = new Set<string>();
  const scriptRegex = /src\s*=\s*["']([^"']*\.js[^"']*)/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const normalized = normalizeUrl(baseUrl, match[1]);
    if (normalized) scripts.add(normalized);
  }
  return Array.from(scripts);
}

function extractUrlParameters(url: string): string[] {
  try {
    const parsed = new URL(url);
    return Array.from(parsed.searchParams.keys());
  } catch {
    return [];
  }
}

// ─── Concurrent Batch Runner ────────────────────────────────────
async function runBatch<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN SPIDER
// ═══════════════════════════════════════════════════════════════
export async function spiderSite(targetUrl: string): Promise<SpiderResult> {
  const startTime = Date.now();

  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
  const parsedTarget = new URL(targetUrl);
  const domain = parsedTarget.hostname;

  const visited = new Set<string>();
  const pages: DiscoveredPage[] = [];
  const allForms: DiscoveredForm[] = [];
  const allParams: { url: string; params: string[] }[] = [];

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[targetUrl, 0]];
  visited.add(targetUrl);

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    // Take a batch from the queue
    const batch = queue.splice(0, Math.min(CONCURRENCY, MAX_PAGES - pages.length));

    await runBatch(batch, CONCURRENCY, async ([url, depth]) => {
      if (pages.length >= MAX_PAGES) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Sec-GPC': '1',
          },
        });
        clearTimeout(timeout);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/xml') && !contentType.includes('application/xhtml')) {
          return; // Skip non-HTML responses
        }

        const html = await response.text();

        // Extract everything from this page
        const links = extractLinks(html, url, domain);
        const forms = extractForms(html, url);
        const scripts = extractScripts(html, url);
        const params = extractUrlParameters(url);

        // Convert response headers to plain object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const page: DiscoveredPage = {
          url: response.url || url, // Use final URL after redirects
          statusCode: response.status,
          contentType,
          html,
          responseHeaders,
          forms,
          parameters: params,
          internalLinks: links.internal,
          externalLinks: links.external,
          scripts,
          depth,
        };

        pages.push(page);
        allForms.push(...forms);
        if (params.length > 0) allParams.push({ url, params });

        // Add new internal links to queue (if within depth limit)
        if (depth < MAX_DEPTH) {
          for (const link of links.internal) {
            if (!visited.has(link) && pages.length + queue.length < MAX_PAGES * 2) {
              visited.add(link);
              queue.push([link, depth + 1]);
            }
          }
        }

        // Also check for parameters in discovered links
        for (const link of links.internal) {
          const linkParams = extractUrlParameters(link);
          if (linkParams.length > 0 && !allParams.some(p => p.url === link)) {
            allParams.push({ url: link, params: linkParams });
          }
        }

      } catch {
        // Page failed to load — skip silently
      }
    });
  }

  const maxDepth = pages.reduce((max, p) => Math.max(max, p.depth), 0);

  return {
    pages,
    allForms,
    allParameters: allParams,
    totalPages: pages.length,
    totalForms: allForms.length,
    totalParameters: allParams.reduce((sum, p) => sum + p.params.length, 0),
    totalInternalLinks: pages.reduce((sum, p) => sum + p.internalLinks.length, 0),
    totalExternalLinks: pages.reduce((sum, p) => sum + p.externalLinks.length, 0),
    crawlDepth: maxDepth,
    crawlTimeMs: Date.now() - startTime,
    domain,
  };
}
