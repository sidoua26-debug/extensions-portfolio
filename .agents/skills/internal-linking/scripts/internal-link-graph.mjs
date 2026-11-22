#!/usr/bin/env node
// Internal link graph generator adapted for ExtensionGuy (static HTML architecture)
// Usage: node .agents/skills/internal-linking/scripts/internal-link-graph.mjs > seo/internal-link-graph.json
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const SCAN_DIRS = [
  'guides',
  'demos',
  'pdf-tools',
  'word-to-latex-converter',
  'bilexi',
  'bulkgrab',
  'tab-vault',
  'table-extractor',
  'seo-inspector',
  'changelog',
]
const IGNORE_DIRS = new Set(['node_modules', '.git', '.agents', '.specify', 'reports', 'tests', 'test-results', 'artifacts'])
const MONEY = /^\/(pdf-tools|word-to-latex-converter|bilexi|bulkgrab|tab-vault|table-extractor|seo-inspector)(\/|$)/
const SITE = (process.env.SITE ?? 'https://extensionguy.me').replace(/\/+$/, '')

const walk = (dir, out = []) => {
  let names
  try { names = readdirSync(dir) } catch { return out }
  for (const n of names) {
    if (IGNORE_DIRS.has(n) || n.startsWith('.')) continue
    const p = join(dir, n)
    try {
      const st = statSync(p)
      if (st.isDirectory()) walk(p, out)
      else if (/\.html$/i.test(n)) out.push(p)
    } catch {}
  }
  return out
}

const norm = (p) => {
  if (!p) return '/'
  const clean = p.split('#')[0].split('?')[0]
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean
}

function routeOf(file) {
  const f = file.split(sep).join('/')
  if (f === 'index.html') return '/'
  const m = f.match(/^(?:(.*)\/)?index\.html$/)
  if (m) return norm('/' + (m[1] ?? ''))
  return norm('/' + f.replace(/\.html$/, ''))
}

// Collect HTML files
const files = [
  ...SCAN_DIRS.flatMap((d) => walk(d)),
  'index.html',
  'privacy.html'
].filter(f => {
  try { return statSync(f).isFile() } catch { return false }
})

const pages = new Map(), inbound = new Map()

for (const file of files) {
  let text = ''
  try { text = readFileSync(file, 'utf8') } catch { continue }
  if (SITE) text = text.split(SITE).join('')

  const route = routeOf(file)
  if (!route) continue
  pages.set(route, file)

  const links = new Set()
  // Match href="/path" or href="https://extensionguy.me/path"
  const re = /href=["'](\/[^"'#?\s]*|https:\/\/extensionguy\.me\/[^"'#?\s]*)/g
  for (const m of text.matchAll(re)) {
    const raw = m[1].replace('https://extensionguy.me', '')
    if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/assets/')) {
      links.add(norm(raw))
    }
  }

  for (const l of links) {
    if (l !== route) {
      if (!inbound.has(l)) inbound.set(l, new Set())
      inbound.get(l).add(route)
    }
  }
}

const rows = [...pages].map(([route, file]) => ({
  route,
  file,
  contextualInbound: inbound.get(route)?.size ?? 0,
  linkedFrom: [...(inbound.get(route) ?? [])],
  money: MONEY.test(route),
})).sort((a, b) => a.contextualInbound - b.contextualInbound)

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  targetPages: rows.filter((r) => r.money),
  orphanTargetPages: rows.filter((r) => r.money && r.contextualInbound < 3).map((r) => r.route),
  allPages: rows,
}, null, 2))
