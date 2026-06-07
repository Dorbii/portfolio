import { useEffect, useMemo, useState } from 'react'
import {
  PART_CATALOG,
  buildPartCatalogDisplay,
  formatCatalogLabel,
  getPart,
} from '../../../../../packages/catalog/src/index.js'
import type {
  PartCategory,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
import {
  BabylonPartCatalogScene,
  type PartCatalogDamagePreview,
} from './BabylonPartCatalogScene'

type CatalogPart = (typeof PART_CATALOG)[number]
type CategoryFilter = PartCategory | 'all'

const DEFAULT_ACCENT_BY_ROLE: Record<TeamRole, string> = {
  blue: '#4aa3ff',
  red: '#ff5c66',
}

const REFEREE_ROUTE_PARAMS = ['session', 'sessionId', 'api']
const DAMAGE_PREVIEWS: PartCatalogDamagePreview[] = ['none', 'light', 'medium', 'critical']
const TEAM_ROLES: TeamRole[] = ['red', 'blue']

export function PartCatalogPage() {
  const initialOptions = useMemo(() => resolvePartCatalogOptions(window.location.search), [])
  const [selectedPartId, setSelectedPartId] = useState(initialOptions.partId)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialOptions.category)
  const [role, setRole] = useState<TeamRole>(initialOptions.role)
  const [accentColor, setAccentColor] = useState(initialOptions.accentColor)
  const [damagePreview, setDamagePreview] = useState<PartCatalogDamagePreview>(initialOptions.damagePreview)
  const [animate, setAnimate] = useState(initialOptions.animate)
  const refereeBackHref = useMemo(() => buildRefereeBackHref(window.location.search), [])
  const visibleParts = useMemo(
    () => filterCatalogParts(categoryFilter),
    [categoryFilter],
  )
  const selectedPart = getPart(selectedPartId) ?? PART_CATALOG[0]
  const selectedPartDisplay = useMemo(
    () => buildPartCatalogDisplay(selectedPart),
    [selectedPart],
  )

  useEffect(() => {
    if (visibleParts.some((part) => part.id === selectedPartId)) {
      return
    }

    setSelectedPartId(visibleParts[0]?.id ?? PART_CATALOG[0].id)
  }, [selectedPartId, visibleParts])

  useEffect(() => {
    const params = refereeRouteParams(window.location.search)

    params.set('part', selectedPartId)
    params.set('category', categoryFilter)
    params.set('role', role)
    params.set('accent', accentColor)
    params.set('damage', damagePreview)
    params.set('animate', animate ? '1' : '0')
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [accentColor, animate, categoryFilter, damagePreview, role, selectedPartId])

  return (
    <main className="part-catalog-page">
      <header className="replay-preview-header part-catalog-header">
        <div>
          <span className="eyebrow">Part catalog</span>
          <h1>{selectedPart.displayName}</h1>
        </div>
        <div className="part-catalog-header-actions">
          <strong>{selectedPart.id}</strong>
          <a className="ui-button ui-button-ghost part-catalog-back" href={refereeBackHref}>
            Back
          </a>
        </div>
      </header>
      <section className="part-catalog-layout">
        <div className="part-catalog-render-panel">
          <BabylonPartCatalogScene
            accentColor={accentColor}
            animate={animate}
            damagePreview={damagePreview}
            partId={selectedPart.id}
            role={role}
          />
        </div>
        <aside className="part-catalog-side-panel" aria-label="Part catalog controls">
          <div className="part-catalog-controls">
            <label>
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              >
                <option value="all">All</option>
                {uniqueCategories().map((category) => (
                  <option key={category} value={category}>
                    {formatLabel(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Part</span>
              <select
                value={selectedPart.id}
                onChange={(event) => setSelectedPartId(event.target.value)}
              >
                {visibleParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Team</span>
              <select
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value as TeamRole

                  setRole(nextRole)
                  setAccentColor(DEFAULT_ACCENT_BY_ROLE[nextRole])
                }}
              >
                {TEAM_ROLES.map((teamRole) => (
                  <option key={teamRole} value={teamRole}>
                    {formatLabel(teamRole)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Accent</span>
              <input
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
              />
            </label>
            <label>
              <span>Damage</span>
              <select
                value={damagePreview}
                onChange={(event) => setDamagePreview(event.target.value as PartCatalogDamagePreview)}
              >
                {DAMAGE_PREVIEWS.map((preview) => (
                  <option key={preview} value={preview}>
                    {formatLabel(preview)}
                  </option>
                ))}
              </select>
            </label>
            <label className="part-catalog-toggle">
              <input
                type="checkbox"
                checked={animate}
                onChange={(event) => setAnimate(event.target.checked)}
              />
              <span>Animate</span>
            </label>
          </div>
          <div className="part-catalog-details">
            <dl className="part-catalog-facts part-catalog-summary">
              {selectedPartDisplay.summaryRows.map((row) => (
                <div key={row.id}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="part-catalog-section-list">
              {selectedPartDisplay.sections.map((section) => (
                <section className="part-catalog-fact-section" key={section.id}>
                  <h2>{section.label}</h2>
                  <dl className="part-catalog-facts">
                    {section.rows.map((row) => (
                      <div key={row.id}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}

function resolvePartCatalogOptions(search: string): {
  accentColor: string
  animate: boolean
  category: CategoryFilter
  damagePreview: PartCatalogDamagePreview
  partId: string
  role: TeamRole
} {
  const params = new URLSearchParams(search)
  const role = TEAM_ROLES.includes(params.get('role') as TeamRole)
    ? (params.get('role') as TeamRole)
    : 'blue'
  const partId = getPart(params.get('part') ?? '')?.id ?? 'Wheel_Omni'
  const category = resolveCategoryFilter(params.get('category'))
  const damagePreview = DAMAGE_PREVIEWS.includes(params.get('damage') as PartCatalogDamagePreview)
    ? (params.get('damage') as PartCatalogDamagePreview)
    : 'none'

  return {
    accentColor: normalizeAccentColor(params.get('accent'), DEFAULT_ACCENT_BY_ROLE[role]),
    animate: params.get('animate') !== '0',
    category,
    damagePreview,
    partId,
    role,
  }
}

function resolveCategoryFilter(value: string | null): CategoryFilter {
  if (!value || value === 'all') {
    return 'all'
  }

  return uniqueCategories().includes(value as PartCategory) ? (value as PartCategory) : 'all'
}

function filterCatalogParts(categoryFilter: CategoryFilter): CatalogPart[] {
  return PART_CATALOG.filter((part) => categoryFilter === 'all' || part.category === categoryFilter)
    .slice()
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
}

function uniqueCategories(): PartCategory[] {
  return Array.from(new Set(PART_CATALOG.map((part) => part.category))).sort()
}

function normalizeAccentColor(value: string | null, fallback: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function buildRefereeBackHref(search: string): string {
  const params = refereeRouteParams(search)
  const nextSearch = params.toString()

  return `/${nextSearch ? `?${nextSearch}` : ''}`
}

function refereeRouteParams(search: string): URLSearchParams {
  const source = new URLSearchParams(search)
  const output = new URLSearchParams()

  for (const key of REFEREE_ROUTE_PARAMS) {
    const value = source.get(key)

    if (value) {
      output.set(key, value)
    }
  }

  return output
}

function formatLabel(value: string): string {
  return formatCatalogLabel(value)
}
