import { useState } from 'react'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { ConfirmedLoadoutView, RolePrivateState } from './agentSessionTypes.js'
import { formatLabel } from '../shared/format'
import { BotAssemblyScene } from './BotAssemblyScene'
import { resolveTeamIdentity } from '../shared/teamVisuals'
import { PlanMetric, SectionTitle } from './AgentCockpitPanels'
import type { BuildSnapshot, CatalogPartReadout, DrawerTab, LoadoutPartReadout } from './AgentInsightWorkbenchReadouts'
import {
  createBuildSnapshot,
  createCatalogLookup,
  createFoundationPartReadouts,
  createInventoryPartReadouts,
  createLoadoutPartReadouts,
  createStoreOfferReadouts,
  normalizeCategory,
} from './AgentInsightWorkbenchReadouts'

type Props = { role: TeamRole; roleState: RolePrivateState | null }

export function AgentInsightWorkbenchView({ role, roleState }: Props) {
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('equipped')
  const loadout = roleState?.ownLoadout ?? null
  const blueprint = loadout?.blueprint ?? null
  const catalogById = createCatalogLookup(roleState)
  const loadoutParts = createLoadoutPartReadouts(roleState, loadout, catalogById)
  const storeOffers = createStoreOfferReadouts(roleState, catalogById)
  const foundationParts = createFoundationPartReadouts(roleState, catalogById)
  const inventoryParts = createInventoryPartReadouts(roleState, catalogById)
  const snapshot = createBuildSnapshot(roleState, loadoutParts, storeOffers, foundationParts)
  const legalActions = roleState?.gameMaster?.legalActions ?? []
  const combatPacket = roleState?.gameMaster?.combat
  const combatBoard = roleState?.gameMaster?.board
  const submitted = roleState?.submitted ?? false
  const submissionLabel = submitted ? 'Accepted' : 'Pending'
  const teamIdentity = roleState ? resolveTeamIdentity(role, roleState.identity) : null
  const hasBot = Boolean(roleState && teamIdentity && loadout && blueprint && blueprint.blocks.length > 0)

  return (
    <section className="agent-live-panel cockpit-workbench agent-insight-workbench" aria-labelledby="agent-insight-heading">
      <div className="workbench-header insight-v6-header">
        <div>
          <SectionTitle id="agent-insight-heading" title="Agent insight" />
          <strong>{createInsightSubtitle(roleState, loadout, teamIdentity)}</strong>
        </div>
        <span className={`assembly-state${submitted ? '' : ' is-draft'}`}>{submissionLabel}</span>
      </div>

      <div className="plan-metric-strip insight-v6-status-strip" aria-label="Agent state summary">
        <PlanMetric label="Phase" value={formatLabel(roleState?.phase ?? 'not_loaded')} />
        <PlanMetric label="Loadout" tone={submitted ? 'ok' : undefined} value={submissionLabel} />
        <PlanMetric label="Build" value={`${snapshot.purchased}/${snapshot.limit} parts`} />
        <PlanMetric label="Store" tone={snapshot.storeActive ? 'ok' : undefined} value={snapshot.storeActive ? `${snapshot.storeOffers} offers` : 'No store'} />
        <PlanMetric
          label={combatPacket ? 'Combat plan' : roleState?.phase === 'combat_turn' ? 'Board actions' : 'Actions'}
          tone={combatPacket && !combatPacket.submitted ? 'ok' : legalActions.length > 0 ? 'ok' : undefined}
          value={combatPacket ? formatCombatPlanMetric(combatPacket, combatBoard) : formatActionMetric(legalActions.length)}
        />
      </div>

      {!roleState ? <NoRoleStatePanel /> : null}

      {roleState ? (
        <>
          <div className="insight-v6-layout">
            <section className="assembly-bay-panel insight-v6-assembly" aria-labelledby="assembly-bay-heading">
              <div className="plan-section-header">
                <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
                {hasBot && blueprint && loadout ? <AssemblyMeta blueprintName={blueprint.name} loadout={loadout} /> : null}
              </div>
              {hasBot && teamIdentity && loadout && blueprint ? (
                <BotAssemblyScene
                  blueprint={blueprint}
                  identity={teamIdentity}
                  machineDesign={loadout.machineDesign}
                  role={role}
                  submitted
                />
              ) : (
                <p className="assembly-empty">No confirmed bot is available for this role yet.</p>
              )}
            </section>

            <BuildSnapshotPanel snapshot={snapshot} />
          </div>

          <section className="plan-section insight-v6-drawer" aria-labelledby="detail-drawer-heading">
            <div className="insight-v6-drawer-header">
              <div>
                <SectionTitle id="detail-drawer-heading" title="Part explorer" />
                <p>Read-only drawer for installed parts, machine tree, and the current store packet.</p>
              </div>
              <PartExplorerTabs
                activeTab={drawerTab}
                partCount={loadoutParts.length}
                rowCount={snapshot.rows}
                setActiveTab={setDrawerTab}
                storeCount={storeOffers.length + foundationParts.length + inventoryParts.length}
                storeActive={snapshot.storeActive}
              />
            </div>

            {drawerTab === 'equipped' ? (
              <EquippedPartsDrawer parts={loadoutParts} snapshot={snapshot} />
            ) : null}
            {drawerTab === 'store' ? (
              <StoreDrawer
                foundationParts={foundationParts}
                inventoryParts={inventoryParts}
                loadoutParts={loadoutParts}
                snapshot={snapshot}
                storeOffers={storeOffers}
              />
            ) : null}
            {drawerTab === 'tree' ? (
              <TreeDrawer parts={loadoutParts} />
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  )
}

function AssemblyMeta({ blueprintName, loadout }: { blueprintName: string; loadout: ConfirmedLoadoutView }) {
  return (
    <div className="assembly-preview-meta">
      <span className="assembly-state">Confirmed bot</span>
      <strong>{blueprintName}</strong>
      <span>{loadout.machineDesign ? 'Machine-authority loadout from role state' : 'Legacy loadout from role state'}</span>
    </div>
  )
}

function BuildSnapshotPanel({ snapshot }: { snapshot: BuildSnapshot }) {
  return (
    <aside className="plan-section insight-v6-snapshot" aria-labelledby="build-snapshot-heading">
      <div className="insight-v6-panel-heading">
        <SectionTitle id="build-snapshot-heading" title="Build snapshot" />
        {snapshot.storeActive ? <span className="insight-v6-store-chip">Store active</span> : null}
      </div>
      <div className="insight-v6-stat-grid" aria-label="Build totals">
        <SnapshotStat label="Purchased" value={`${snapshot.purchased}/${snapshot.limit}`} />
        <SnapshotStat detail="incl core" label="Rows" value={String(snapshot.rows)} />
        <SnapshotStat detail="viewable" label="Offers" value={String(snapshot.storeOffers)} />
        <SnapshotStat label="HP" value={snapshot.hp} />
        <SnapshotStat label="Mass" value={snapshot.mass} />
        <SnapshotStat label="Armor" value={snapshot.armor} />
      </div>
      <CategoryComposition snapshot={snapshot} />
      <div className="insight-v6-map-block">
        <strong>64-part map</strong>
        <PartMap snapshot={snapshot} />
      </div>
      <div className="insight-v6-group-view">
        <span>Group view</span>
        <strong>{snapshot.dominant ? `${snapshot.dominant.label.toLowerCase()} cluster` : 'No mounted parts'}</strong>
        <p>{snapshot.dominant ? `${snapshot.dominant.count} ${snapshot.dominant.label.toLowerCase()} row(s) represented in the installed build.` : 'Confirmed rows will appear once the role has a loadout.'}</p>
      </div>
    </aside>
  )
}

function SnapshotStat({ detail, label, value }: { detail?: string; label: string; value: string }) {
  return <div className="insight-v6-stat-card"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div>
}

function CategoryComposition({ snapshot }: { snapshot: BuildSnapshot }) {
  const visible = snapshot.categories.filter((category) => category.count > 0)
  const total = visible.reduce((sum, category) => sum + category.count, 0)
  return (
    <div className="insight-v6-composition" aria-label="Category composition">
      <strong>Category composition</strong>
      <div className="insight-v6-composition-bar" aria-hidden="true">
        {visible.length > 0
          ? visible.map((category) => <span className={`category-${category.key}`} key={category.key} style={{ flexGrow: category.count }} />)
          : <span className="category-empty" />}
      </div>
      <div className="insight-v6-category-legend">
        {visible.length > 0
          ? visible.map((category) => <span className={`category-${category.key}`} key={category.key}>{category.label} {category.count}</span>)
          : <span>Waiting for parts</span>}
        {total > 0 ? <em>{total} row{total === 1 ? '' : 's'}</em> : null}
      </div>
    </div>
  )
}

function PartMap({ snapshot }: { snapshot: BuildSnapshot }) {
  const cells = Array.from({ length: snapshot.limit }, (_, index) => snapshot.mapParts[index])
  return <div className="insight-v6-part-map" aria-label="Installed part density map">{cells.map((part, index) => <span className={part ? `category-${normalizeCategory(part.category)}` : 'category-empty'} key={part?.instanceId ?? `empty.${index}`} title={part ? `${part.name} · ${part.instanceId}` : `Empty slot ${index + 1}`} />)}</div>
}

function PartExplorerTabs({ activeTab, partCount, rowCount, setActiveTab, storeActive, storeCount }: { activeTab: DrawerTab; partCount: number; rowCount: number; setActiveTab: (tab: DrawerTab) => void; storeActive: boolean; storeCount: number }) {
  return (
    <div className="insight-v6-tabs" role="tablist" aria-label="Part explorer view">
      <button className={activeTab === 'equipped' ? 'is-active' : ''} onClick={() => setActiveTab('equipped')} role="tab" type="button" aria-selected={activeTab === 'equipped'}>Equipped Parts<span>{partCount}</span></button>
      <button className={activeTab === 'store' ? 'is-active' : ''} onClick={() => setActiveTab('store')} role="tab" type="button" aria-selected={activeTab === 'store'}>Store{storeActive ? <span>{storeCount}</span> : null}</button>
      <button className={activeTab === 'tree' ? 'is-active' : ''} onClick={() => setActiveTab('tree')} role="tab" type="button" aria-selected={activeTab === 'tree'}>Tree View<span>{rowCount}</span></button>
    </div>
  )
}

function EquippedPartsDrawer({ parts, snapshot }: { parts: LoadoutPartReadout[]; snapshot: BuildSnapshot }) {
  return (
    <div className="insight-v6-drawer-body" role="tabpanel">
      <div className="insight-v6-drawer-summary"><span>{snapshot.purchased}/{snapshot.limit} purchased</span><span>{snapshot.rows} rows incl core</span><span>{snapshot.weapons} weapons</span><span>{snapshot.utility} utility</span></div>
      {parts.length > 0
        ? <ol className="insight-v6-part-table">{parts.map((part) => <li className={`insight-v6-part-row tone-${part.tone} category-${normalizeCategory(part.category)}`} key={part.instanceId}><span>{part.category}</span><strong>{part.name}</strong><small>{part.instanceId}</small><em>{part.status}</em><p>{part.detail}</p><small>{part.stats}</small></li>)}</ol>
        : <p className="agent-empty">No individual parts are available from role state.</p>}
    </div>
  )
}

function StoreDrawer({ foundationParts, inventoryParts, loadoutParts, snapshot, storeOffers }: { foundationParts: CatalogPartReadout[]; inventoryParts: CatalogPartReadout[]; loadoutParts: LoadoutPartReadout[]; snapshot: BuildSnapshot; storeOffers: CatalogPartReadout[] }) {
  return (
    <div className="insight-v6-drawer-body insight-v6-store-body" role="tabpanel">
      <div className="insight-v6-store-context"><strong>Current build context</strong><span>{snapshot.purchased}/{snapshot.limit} purchased</span><span>{snapshot.remaining === undefined ? 'cap unknown' : `${snapshot.remaining} cap remaining`}</span><span>{snapshot.storeOffers} round offers</span></div>
      <div className="insight-v6-equipped-context" aria-label="Currently equipped context">
        {loadoutParts.slice(0, 8).map((part) => <span className={`category-${normalizeCategory(part.category)}`} key={part.instanceId}>{part.name}</span>)}
      </div>
      <div className="insight-v6-store-grid"><CatalogPartList emptyText="No round store offers are loaded for this role state." parts={storeOffers} title="Round offers" /><CatalogPartList emptyText="No foundation templates are loaded." parts={foundationParts} title="Foundation templates" /><CatalogPartList emptyText="No owned catalog parts are in inventory." parts={inventoryParts} title="Owned inventory" /></div>
      <p className="insight-v6-readonly-note">Store is visible for humans, but buying, mounting, moving, and confirming remain agent actions.</p>
    </div>
  )
}

function TreeDrawer({ parts }: { parts: LoadoutPartReadout[] }) {
  const depthById = createDepthByPartId(parts)
  return (
    <div className="insight-v6-drawer-body" role="tabpanel">
      {parts.length > 0
        ? <ol className="insight-v6-tree-list">{parts.map((part) => <li className={`insight-v6-tree-row category-${normalizeCategory(part.category)}`} key={part.instanceId} style={{ paddingLeft: `${10 + (depthById.get(part.instanceId) ?? 0) * 16}px` }}><strong>{part.name}</strong><span>{part.instanceId}</span><small>parent: {part.parentId ?? 'root'}</small></li>)}</ol>
        : <p className="agent-empty">No mounted part tree is available.</p>}
    </div>
  )
}

function CatalogPartList({ emptyText, parts, title }: { emptyText: string; parts: CatalogPartReadout[]; title: string }) {
  return <div className="catalog-part-block insight-v6-catalog-block"><strong>{title}</strong>{parts.length > 0 ? <ul className="catalog-part-list insight-v6-catalog-list">{parts.map((part) => <li key={part.id}><div><span>{part.category}</span><strong>{part.name}</strong><small>{part.detail}</small></div><em>{part.quantity ? `x${part.quantity}` : part.status}</em></li>)}</ul> : <p className="agent-empty">{emptyText}</p>}</div>
}

function createDepthByPartId(parts: LoadoutPartReadout[]): Map<string, number> {
  const partsById = new Map(parts.map((part) => [part.instanceId, part]))
  const depths = new Map<string, number>()
  const depthFor = (part: LoadoutPartReadout, seen = new Set<string>()): number => {
    const cached = depths.get(part.instanceId)
    if (typeof cached === 'number') return cached
    if (!part.parentId || seen.has(part.parentId)) {
      depths.set(part.instanceId, 0)
      return 0
    }
    const parent = partsById.get(part.parentId)
    if (!parent) {
      depths.set(part.instanceId, 1)
      return 1
    }
    const nextSeen = new Set(seen)
    nextSeen.add(part.instanceId)
    const depth = depthFor(parent, nextSeen) + 1
    depths.set(part.instanceId, depth)
    return depth
  }
  for (const part of parts) depthFor(part)
  return depths
}

function createInsightSubtitle(roleState: RolePrivateState | null, loadout: ConfirmedLoadoutView | null, identity: ReturnType<typeof resolveTeamIdentity> | null): string {
  if (!roleState) return 'Load role state to inspect the agent.'
  return loadout ? `${identity?.name ?? 'This role'} confirmed ${loadout.blueprint.name}.` : `${identity?.name ?? 'This role'} has not confirmed a loadout.`
}

function NoRoleStatePanel() {
  return <section className="insight-empty-state" aria-labelledby="empty-state-heading"><SectionTitle id="empty-state-heading" title="State not loaded" /><p>The cockpit has no private role state yet. Refresh with a valid observer or agent key; once state loads, this panel shows the confirmed loadout, store, and owned parts.</p></section>
}

function formatActionMetric(legalActionCount: number): string {
  return legalActionCount > 0 ? `${legalActionCount} legal` : 'No actions'
}

function formatCombatPlanMetric(combat: NonNullable<RolePrivateState['gameMaster']>['combat'], board: NonNullable<RolePrivateState['gameMaster']>['board'] | undefined): string {
  if (!combat) return 'No combat packet'
  if (combat.submitted) return 'Plan submitted'
  return `${combat.budget.movement} move / ${combat.budget.actionTime} time / ${board?.reachableCells?.length ?? 0} cells`
}
