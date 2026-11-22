#!/usr/bin/env node
/**
 * Internal link graph analyzer for ExtensionGuy (static HTML architecture).
 *
 * Capabilities:
 * - Resolves relative, root-relative, and same-origin absolute anchor URLs against each page's actual URL.
 * - Counts only <a href="..."> elements (ignores <link rel="canonical">, stylesheets, etc.).
 * - Includes /word-to-latex/ and all maintained extensions/tools in product targets.
 * - Accurately distinguishes content links from navigation/footer links, while reporting total inbound links.
 * - Reserves "orphan" strictly for zero inbound links (totalInbound === 0).
 * - Labels pages with totalInbound < threshold (configurable, default 3) as "underlinked".
 *
 * Usage: node .agents/skills/internal-linking/scripts/internal-link-graph.mjs > seo/internal-link-graph.json
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

export const DEFAULT_SITE = 'https://extensionguy.me';
export const DEFAULT_UNDERLINKED_THRESHOLD = 3;

// Scanned product targets: Word to LaTeX (extension), converter (web tool), PDF tools, and extensions
export const PRODUCT_TARGET_REGEX = /^\/(word-to-latex|word-to-latex-converter|pdf-tools|table-extractor|bulkgrab|seo-inspector|bilexi|tab-vault)(\/|$)/;

export const SCAN_DIRS = [
  'guides',
  'demos',
  'pdf-tools',
  'word-to-latex',
  'word-to-latex-converter',
  'bilexi',
  'bulkgrab',
  'tab-vault',
  'table-extractor',
  'seo-inspector',
  'changelog',
];

export const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.agents',
  '.specify',
  'reports',
  'tests',
  'test-results',
  'artifacts'
]);

export function norm(path) {
  if (!path) return '/';
  const clean = path.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return '/';
  return clean.replace(/\/+$/, '');
}

export function routeOf(file) {
  const f = file.split(sep).join('/');
  if (f === 'index.html') return '/';
  if (f === 'privacy.html') return '/privacy';
  const m = f.match(/^(?:(.*)\/)?index\.html$/);
  if (m) return norm('/' + (m[1] ?? ''));
  return norm('/' + f.replace(/\.html$/, ''));
}

export function getPageBaseUrl(route, siteOrigin = DEFAULT_SITE) {
  const origin = siteOrigin.replace(/\/+$/, '');
  if (route === '/') return `${origin}/`;
  // Directory-based routes end with / for proper relative URL resolution (e.g. "../../")
  return `${origin}${route}/`;
}

export function resolveHref(href, pageBaseUrl, siteOrigin = DEFAULT_SITE) {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return null;
  }
  try {
    const origin = new URL(siteOrigin).origin;
    const base = new URL(pageBaseUrl);
    const resolved = new URL(trimmed, base);
    if (resolved.origin !== origin) {
      return null; // External URL
    }
    const pathname = resolved.pathname;
    if (pathname.startsWith('/assets/')) return null;
    return norm(pathname);
  } catch {
    return null;
  }
}

export function parseAnchorsFromHtml(html, pageBaseUrl, siteOrigin = DEFAULT_SITE) {
  // Strip script and style blocks to avoid false positives
  const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const tokenRegex = /<\/?([a-zA-Z0-9]+)(?:\s+(?:[^>"'\s]|"[^"]*"|'[^']*')*)*\s*\/?>/gs;
  let headerDepth = 0;
  let navDepth = 0;
  let footerDepth = 0;

  const contentLinks = new Set();
  const navFooterLinks = new Set();
  const totalLinks = new Set();

  let m;
  while ((m = tokenRegex.exec(sanitized)) !== null) {
    const fullTag = m[0];
    const tagName = m[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>');

    if (tagName === 'header') {
      if (isClosing) headerDepth = Math.max(0, headerDepth - 1);
      else if (!isSelfClosing) headerDepth++;
    } else if (tagName === 'nav') {
      if (isClosing) navDepth = Math.max(0, navDepth - 1);
      else if (!isSelfClosing) navDepth++;
    } else if (tagName === 'footer') {
      if (isClosing) footerDepth = Math.max(0, footerDepth - 1);
      else if (!isSelfClosing) footerDepth++;
    } else if (tagName === 'a' && !isClosing) {
      const hrefMatch = fullTag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (hrefMatch) {
        const rawHref = hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3];
        const resolved = resolveHref(rawHref, pageBaseUrl, siteOrigin);
        if (resolved) {
          totalLinks.add(resolved);
          if (headerDepth > 0 || navDepth > 0 || footerDepth > 0) {
            navFooterLinks.add(resolved);
          } else {
            contentLinks.add(resolved);
          }
        }
      }
    }
  }

  return {
    contentLinks: [...contentLinks],
    navFooterLinks: [...navFooterLinks],
    totalLinks: [...totalLinks],
  };
}

export function buildLinkGraph(fileList, readContentFn, options = {}) {
  const siteOrigin = options.siteOrigin ?? DEFAULT_SITE;
  const underlinkedThreshold = options.underlinkedThreshold ?? DEFAULT_UNDERLINKED_THRESHOLD;

  const pagesMap = new Map();
  const totalInboundMap = new Map();
  const contentInboundMap = new Map();
  const navFooterInboundMap = new Map();

  // First register all valid pages
  for (const file of fileList) {
    const route = routeOf(file);
    if (!route) continue;
    pagesMap.set(route, file);
    totalInboundMap.set(route, new Set());
    contentInboundMap.set(route, new Set());
    navFooterInboundMap.set(route, new Set());
  }

  // Scan and record inbound links
  for (const [route, file] of pagesMap) {
    const html = readContentFn(file);
    const pageBaseUrl = getPageBaseUrl(route, siteOrigin);
    const { contentLinks, navFooterLinks, totalLinks } = parseAnchorsFromHtml(html, pageBaseUrl, siteOrigin);

    for (const target of totalLinks) {
      if (target !== route && totalInboundMap.has(target)) {
        totalInboundMap.get(target).add(route);
      }
    }
    for (const target of contentLinks) {
      if (target !== route && contentInboundMap.has(target)) {
        contentInboundMap.get(target).add(route);
      }
    }
    for (const target of navFooterLinks) {
      if (target !== route && navFooterInboundMap.has(target)) {
        navFooterInboundMap.get(target).add(route);
      }
    }
  }

  const rows = [...pagesMap].map(([route, file]) => {
    const totalSet = totalInboundMap.get(route) ?? new Set();
    const contentSet = contentInboundMap.get(route) ?? new Set();
    const navFooterSet = navFooterInboundMap.get(route) ?? new Set();
    const isTarget = PRODUCT_TARGET_REGEX.test(route);

    return {
      route,
      file,
      isTarget,
      totalInbound: totalSet.size,
      contentInbound: contentSet.size,
      navFooterInbound: navFooterSet.size,
      totalLinkedFrom: [...totalSet].sort(),
      contentLinkedFrom: [...contentSet].sort(),
      navFooterLinkedFrom: [...navFooterSet].sort(),
    };
  }).sort((a, b) => a.totalInbound - b.totalInbound);

  const targets = rows.filter(r => r.isTarget);

  return {
    generatedAt: new Date().toISOString(),
    siteOrigin,
    underlinkedThreshold,
    summary: {
      totalPages: rows.length,
      productTargets: targets.length,
      // "orphan" reserved strictly for zero inbound links
      orphanTargets: targets.filter(r => r.totalInbound === 0).map(r => r.route),
      // "underlinked" for configurable < threshold (default < 3)
      underlinkedTargets: targets.filter(r => r.totalInbound > 0 && r.totalInbound < underlinkedThreshold).map(r => r.route),
      orphanPages: rows.filter(r => r.totalInbound === 0).map(r => r.route),
      underlinkedPages: rows.filter(r => r.totalInbound > 0 && r.totalInbound < underlinkedThreshold).map(r => r.route),
    },
    targets,
    pages: rows,
  };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const walkDir = (dir, out = []) => {
    let names;
    try { names = readdirSync(dir); } catch { return out; }
    for (const n of names) {
      if (IGNORE_DIRS.has(n) || n.startsWith('.')) continue;
      const p = join(dir, n);
      try {
        const st = statSync(p);
        if (st.isDirectory()) walkDir(p, out);
        else if (/\.html$/i.test(n)) out.push(p);
      } catch {}
    }
    return out;
  };

  const files = [
    ...SCAN_DIRS.flatMap(d => walkDir(d)),
    'index.html',
    'privacy.html',
  ].filter(f => {
    try { return statSync(f).isFile(); } catch { return false; }
  });

  const threshold = parseInt(process.env.UNDERLINKED_THRESHOLD ?? `${DEFAULT_UNDERLINKED_THRESHOLD}`, 10);
  const siteOrigin = process.env.SITE ?? DEFAULT_SITE;

  const result = buildLinkGraph(files, f => readFileSync(f, 'utf8'), {
    siteOrigin,
    underlinkedThreshold: threshold,
  });

  console.log(JSON.stringify(result, null, 2));
}
