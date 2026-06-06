import fs from 'node:fs/promises'
import path from 'node:path'
import { extractCatalogParts } from './lib/catalogAst.mjs'

const root = process.cwd()
const catalogPath = path.join(root, 'packages', 'catalog', 'src', 'parts.ts')
const outputDir = path.join(root, 'docs')
const imageDir = path.join(outputDir, 'part-catalog-reference')
const markdownPath = path.join(outputDir, 'agent-arena-parts-catalog.md')

const categoryOrder = ['body', 'mobility', 'weapon', 'defense', 'utility', 'style']
const categoryLabels = {
  body: 'Body',
  mobility: 'Mobility',
  weapon: 'Weapon',
  defense: 'Defense',
  utility: 'Utility',
  style: 'Style',
}
const colors = {
  body: ['#b72e3b', '#23070a', '#f47b54', '#ffadb5'],
  mobility: ['#3f4c55', '#070b0d', '#8797a2', '#d5dde1'],
  weapon: ['#f6bd4f', '#4d2a05', '#17191b', '#fff0a8'],
  defense: ['#55a9ff', '#06182d', '#1f6fc2', '#d9efff'],
  utility: ['#33c4ca', '#082629', '#f47b54', '#c9fbff'],
  style: ['#ff92a8', '#3c1019', '#98e5ff', '#ffe0e8'],
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function markdownText(value) {
  return String(value ?? 'none').replaceAll('`', '\\`')
}

function formatStats(stats) {
  const keys = Object.keys(stats ?? {}).sort()
  if (keys.length === 0) return 'none'
  return keys.map((key) => `${key} ${stats[key] > 0 ? '+' : ''}${stats[key]}`).join(', ')
}

function formatControls(controls) {
  const keys = Object.entries(controls ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  return keys.length === 0 ? 'none' : keys.join(', ')
}

function compactLabel(partId) {
  return partId.replace(/^(Body|Wheel|Tread|Leg|Skid|Weapon|Armor|Utility|Style)_?/, '').replaceAll('_', ' ')
}

function partShape(part) {
  const [fill, edge, accent, light] = colors[part.category] ?? colors.body
  const id = part.id
  const cx = 210
  const cy = 128

  if (part.category === 'body') {
    if (id.includes('Cylinder')) {
      return `<ellipse cx="${cx}" cy="${cy}" rx="72" ry="48" fill="${fill}" stroke="${edge}" stroke-width="7"/><ellipse cx="${cx}" cy="${cy}" rx="38" ry="24" fill="none" stroke="${light}" stroke-width="5"/><rect x="${cx - 18}" y="70" width="36" height="20" fill="${accent}" stroke="${edge}" stroke-width="3"/>`
    }
    if (id.includes('Wedge')) {
      return `<path d="M 126 172 L 296 172 L 276 84 L 148 102 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 150 122 L 270 96" stroke="${light}" stroke-width="6"/>`
    }
    if (id.includes('Light_Frame')) {
      return `<rect x="134" y="88" width="152" height="96" fill="none" stroke="${fill}" stroke-width="15"/><path d="M 150 170 L 270 102 M 150 102 L 270 170" stroke="${light}" stroke-width="8"/>`
    }
    return `<rect x="132" y="86" width="156" height="100" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 154 136 H 266 M 210 104 V 166" stroke="${light}" stroke-width="5"/>${id.includes('Heavy') ? `<rect x="158" y="58" width="104" height="38" fill="${accent}" stroke="${edge}" stroke-width="5"/>` : ''}`
  }

  if (part.category === 'mobility') {
    if (id.includes('Tread') || id.includes('Tank')) {
      return `<rect x="112" y="86" width="196" height="112" rx="24" fill="${edge}" stroke="${light}" stroke-width="6"/><rect x="132" y="108" width="156" height="68" rx="13" fill="${fill}"/><path d="M 144 184 H 166 M 178 184 H 200 M 212 184 H 234 M 246 184 H 268" stroke="${light}" stroke-width="8"/>`
    }
    if (id.includes('Spring')) {
      return `<path d="M 132 166 C 172 92, 172 92, 132 54 M 196 166 C 236 92, 236 92, 196 54 M 260 166 C 300 92, 300 92, 260 54" fill="none" stroke="${fill}" stroke-width="11" stroke-linecap="round"/><rect x="118" y="174" width="184" height="16" fill="${edge}"/>`
    }
    if (id.includes('Skid')) {
      return `<path d="M 112 174 Q 210 78 308 174" fill="none" stroke="${fill}" stroke-width="22" stroke-linecap="round"/><path d="M 138 174 H 282" stroke="${light}" stroke-width="6"/>`
    }
    const spikes = id.includes('Spiked')
      ? Array.from({ length: 10 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 10
          const x1 = cx + Math.cos(angle) * 54
          const y1 = cy + Math.sin(angle) * 54
          const x2 = cx + Math.cos(angle) * 74
          const y2 = cy + Math.sin(angle) * 74
          return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${light}" stroke-width="8" stroke-linecap="round"/>`
        }).join('')
      : ''
    const omni = id.includes('Omni')
      ? `<path d="M 172 90 L 248 166 M 248 90 L 172 166" stroke="${light}" stroke-width="8"/>`
      : ''

    return `${spikes}<circle cx="${cx}" cy="${cy}" r="60" fill="${edge}"/><circle cx="${cx}" cy="${cy}" r="46" fill="${fill}" stroke="${light}" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="18" fill="${accent}" stroke="${edge}" stroke-width="4"/>${omni}`
  }

  if (part.category === 'weapon') {
    if (id.includes('Spinner') || id.includes('Saw')) {
      const teeth = id.includes('Saw') ? 14 : 8
      const blades = Array.from({ length: teeth }, (_, index) => {
        const angle = (Math.PI * 2 * index) / teeth
        const x1 = cx + Math.cos(angle - 0.12) * 38
        const y1 = cy + Math.sin(angle - 0.12) * 38
        const x2 = cx + Math.cos(angle) * 72
        const y2 = cy + Math.sin(angle) * 72
        const x3 = cx + Math.cos(angle + 0.12) * 38
        const y3 = cy + Math.sin(angle + 0.12) * 38
        return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} Z" fill="${fill}" stroke="${edge}" stroke-width="2"/>`
      }).join('')

      return `${blades}<circle cx="${cx}" cy="${cy}" r="40" fill="${accent}" stroke="${edge}" stroke-width="7"/><circle cx="${cx}" cy="${cy}" r="15" fill="${light}"/>`
    }
    if (id.includes('Hammer')) return `<rect x="200" y="70" width="20" height="118" fill="${accent}" stroke="${edge}" stroke-width="4"/><rect x="144" y="52" width="132" height="42" fill="${fill}" stroke="${edge}" stroke-width="7"/>`
    if (id.includes('Net')) return `<rect x="120" y="72" width="180" height="132" rx="19" fill="${edge}"/><rect x="136" y="88" width="148" height="100" rx="12" fill="none" stroke="${fill}" stroke-width="8"/><path d="M 148 112 H 272 M 148 138 H 272 M 148 164 H 272 M 166 96 V 180 M 202 96 V 180 M 238 96 V 180" stroke="${light}" stroke-width="4"/>`
    if (id.includes('Turret')) return `<circle cx="190" cy="132" r="50" fill="${fill}" stroke="${edge}" stroke-width="7"/><rect x="224" y="118" width="90" height="28" fill="${fill}" stroke="${edge}" stroke-width="6"/><circle cx="190" cy="132" r="18" fill="${light}"/>`
    if (id.includes('Spear')) return `<path d="M 120 150 H 244" stroke="${fill}" stroke-width="19" stroke-linecap="round"/><path d="M 240 84 L 318 150 L 240 216 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/>`
    if (id.includes('Grabber')) return `<path d="M 128 156 H 226" stroke="${fill}" stroke-width="19" stroke-linecap="round"/><path d="M 222 148 C 270 70, 306 90, 316 122 M 222 164 C 270 236, 306 214, 316 184" fill="none" stroke="${fill}" stroke-width="15" stroke-linecap="round"/>`

    return `<path d="M 124 176 L 296 176 L 260 88 L 146 108 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 150 146 H 268" stroke="${light}" stroke-width="7"/>`
  }

  if (part.category === 'defense') {
    if (id.includes('Cage')) return `<rect x="128" y="74" width="164" height="136" fill="none" stroke="${fill}" stroke-width="11"/><path d="M 158 78 V 206 M 186 78 V 206 M 214 78 V 206 M 242 78 V 206 M 270 78 V 206" stroke="${light}" stroke-width="6"/>`
    if (id.includes('Spiked')) return `<path d="M 142 88 L 154 48 L 166 88 M 184 88 L 196 48 L 208 88 M 226 88 L 238 48 L 250 88 M 268 88 L 280 48 L 292 88" fill="${light}" stroke="${edge}" stroke-width="3"/><rect x="128" y="88" width="164" height="110" fill="${fill}" stroke="${edge}" stroke-width="7"/>`
    if (id.includes('Reactive')) return `<rect x="126" y="86" width="168" height="112" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 154 130 H 208 L 186 164 H 258" fill="none" stroke="${light}" stroke-width="10"/>`

    return `<path d="M 126 82 L 294 102 L 276 202 L 144 202 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 210 104 V 184" stroke="${light}" stroke-width="6"/>`
  }

  if (part.category === 'utility') {
    if (id.includes('Booster')) return `<path d="M 142 88 H 260 L 302 132 L 260 176 H 142 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 126 104 C 86 120, 86 144, 126 160" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>`
    if (id.includes('Gyro')) return `<circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="${fill}" stroke-width="12"/><ellipse cx="${cx}" cy="${cy}" rx="88" ry="28" fill="none" stroke="${light}" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="19" fill="${accent}"/>`
    if (id.includes('Magnet')) return `<path d="M 140 72 V 154 Q 210 216 280 154 V 72" fill="none" stroke="${fill}" stroke-width="24"/><rect x="126" y="56" width="42" height="30" fill="${accent}"/><rect x="252" y="56" width="42" height="30" fill="${accent}"/>`
    if (id.includes('Repair')) return `<rect x="132" y="82" width="156" height="112" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 176 138 H 244 M 210 104 V 172" stroke="${light}" stroke-width="15"/>`
    if (id.includes('Smoke')) return `<rect x="132" y="148" width="156" height="48" fill="${fill}" stroke="${edge}" stroke-width="7"/><circle cx="170" cy="110" r="24" fill="${light}" opacity="0.52"/><circle cx="214" cy="88" r="33" fill="${light}" opacity="0.42"/><circle cx="258" cy="112" r="26" fill="${light}" opacity="0.5"/>`
    if (id.includes('Sensor')) return `<rect x="132" y="84" width="156" height="104" fill="${fill}" stroke="${edge}" stroke-width="7"/><circle cx="${cx}" cy="${cy}" r="34" fill="${edge}"/><circle cx="${cx}" cy="${cy}" r="19" fill="${light}"/><path d="M 260 88 Q 322 132 260 176" fill="none" stroke="${light}" stroke-width="6"/>`
    if (id.includes('Drone')) return `<rect x="164" y="94" width="92" height="72" fill="${fill}" stroke="${edge}" stroke-width="7"/><circle cx="116" cy="72" r="22" fill="none" stroke="${light}" stroke-width="8"/><circle cx="304" cy="72" r="22" fill="none" stroke="${light}" stroke-width="8"/><circle cx="116" cy="194" r="22" fill="none" stroke="${light}" stroke-width="8"/><circle cx="304" cy="194" r="22" fill="none" stroke="${light}" stroke-width="8"/>`

    return `<path d="M ${cx} 54 V 172 M 160 118 Q 160 206 100 210 M 260 118 Q 260 206 320 210" fill="none" stroke="${fill}" stroke-width="15" stroke-linecap="round"/><circle cx="${cx}" cy="40" r="18" fill="none" stroke="${light}" stroke-width="8"/>`
  }

  if (id.includes('Flag')) return `<path d="M 156 196 V 54" stroke="${edge}" stroke-width="11"/><path d="M 164 54 H 292 L 264 98 H 164 Z" fill="${fill}" stroke="${edge}" stroke-width="6"/>`
  if (id.includes('Dragon')) return `<path d="M 134 156 C 148 80, 268 58, 304 118 C 250 106, 238 166, 134 156 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><circle cx="258" cy="104" r="8" fill="${light}"/>`
  if (id.includes('Spikes')) return `<path d="M 128 188 L 152 62 L 176 188 M 178 188 L 202 62 L 226 188 M 228 188 L 252 62 L 276 188" fill="${fill}" stroke="${edge}" stroke-width="5"/>`
  if (id.includes('Wings')) return `<path d="M 204 132 C 94 28, 72 126, 148 196 Z" fill="${fill}" stroke="${edge}" stroke-width="6"/><path d="M 216 132 C 326 28, 348 126, 272 196 Z" fill="${fill}" stroke="${edge}" stroke-width="6"/>`
  if (id.includes('Neon')) return `<circle cx="${cx}" cy="${cy}" r="68" fill="none" stroke="${fill}" stroke-width="12"/><path d="M 122 132 H 298 M 210 44 V 220" stroke="${accent}" stroke-width="8"/>`
  if (id.includes('Crown')) return `<path d="M 124 176 L 144 76 L 188 132 L 210 58 L 232 132 L 276 76 L 296 176 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/>`
  if (id.includes('Trash')) return `<path d="M 144 82 H 276 L 262 202 H 158 Z" fill="${fill}" stroke="${edge}" stroke-width="7"/><path d="M 124 72 H 296" stroke="${light}" stroke-width="11"/><path d="M 184 104 V 178 M 210 104 V 178 M 236 104 V 178" stroke="${edge}" stroke-width="5" opacity="0.6"/>`

  return `<circle cx="${cx}" cy="${cy}" r="66" fill="${fill}" stroke="${edge}" stroke-width="7"/>`
}

function svgForPart(part) {
  const label = xml(compactLabel(part.id))
  const stats = xml(formatStats(part.stats))

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260" viewBox="0 0 420 260" role="img" aria-labelledby="title desc">
  <title id="title">${xml(part.displayName)}</title>
  <desc id="desc">Schematic reference image for ${xml(part.id)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#11181c"/>
      <stop offset="1" stop-color="#253037"/>
    </linearGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="420" height="260" fill="url(#bg)"/>
  <rect width="420" height="260" fill="url(#grid)"/>
  <text x="28" y="36" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="21" font-weight="700" fill="#f4f7f8">${xml(part.displayName)}</text>
  <text x="28" y="60" font-family="Consolas, monospace" font-size="12" fill="#b8c7d0">${xml(part.id)}</text>
  <g>${partShape(part)}</g>
  <text x="210" y="222" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#f4f7f8">${label}</text>
  <text x="210" y="242" text-anchor="middle" font-family="Consolas, monospace" font-size="11" fill="#aab7bd">stats: ${stats}</text>
</svg>
`
}

function catalogEntry(part) {
  const behavior = part.behavior ? `\`${markdownText(part.behavior)}\`` : 'none'
  const tags = part.tags?.length ? part.tags.map((tag) => `\`${markdownText(tag)}\``).join(', ') : 'none'

  return `### ${part.displayName}

![${part.displayName}](part-catalog-reference/${part.id}.svg)

| Field | Value |
| --- | --- |
| ID | \`${markdownText(part.id)}\` |
| Category | ${markdownText(categoryLabels[part.category] ?? part.category)} |
| Cost | ${part.cost} |
| Mass | ${part.mass} |
| Durability | ${part.durability} |
| Size | \`${Array.isArray(part.size) ? part.size.join(' x ') : markdownText(part.size)}\` |
| Controls | ${markdownText(formatControls(part.controls))} |
| Stats | ${markdownText(formatStats(part.stats))} |
| Behavior | ${behavior} |
| Tags | ${tags} |
`
}

const parts = await extractCatalogParts(catalogPath)

if (parts.length === 0) {
  throw new Error('No parts found in PART_CATALOG.')
}

await fs.mkdir(imageDir, { recursive: true })

for (const part of parts) {
  await fs.writeFile(path.join(imageDir, `${part.id}.svg`), svgForPart(part), 'utf8')
}

const summaryCounts = categoryOrder
  .map((category) => `${categoryLabels[category]} ${parts.filter((part) => part.category === category).length}`)
  .join(', ')
const lines = [
  '# Agent Arena Parts Catalog',
  '',
  `Generated from \`packages/catalog/src/parts.ts\` on 2026-06-05. Includes ${parts.length} catalog parts (${summaryCounts}).`,
  '',
  'The images are schematic reference cards generated from catalog metadata and part IDs. They are not Babylon runtime screenshots or balance proof. Use the table fields as the source of truth for game rules.',
  '',
  '## Summary',
  '',
  '| Category | Count | Parts |',
  '| --- | ---: | --- |',
]

for (const category of categoryOrder) {
  const categoryParts = parts.filter((part) => part.category === category)
  lines.push(`| ${categoryLabels[category]} | ${categoryParts.length} | ${categoryParts.map((part) => `\`${part.id}\``).join(', ')} |`)
}

for (const category of categoryOrder) {
  lines.push('', `## ${categoryLabels[category]}`, '')

  for (const part of parts.filter((candidate) => candidate.category === category)) {
    lines.push(catalogEntry(part))
  }
}

await fs.writeFile(markdownPath, `${lines.join('\n')}\n`, 'utf8')

console.log(`Wrote ${markdownPath}`)
console.log(`Wrote ${parts.length} SVG reference cards to ${imageDir}`)
