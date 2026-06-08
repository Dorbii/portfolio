import type {
  AgentBoardView,
  BlueprintBlock,
  GameMasterLegalAction,
  MachineDesign,
  MachinePartInstance,
  PartDefinition,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { formatCatalogLabel } from '../../../../packages/catalog/src/index.js'
import type {
  ConfirmedLoadoutView,
  RolePrivateState,
} from './agentSessionTypes.js'
import { MetricGrid } from '../shared/ui'
import { formatLabel } from '../shared/format'
import { BotAssemblyScene } from './BotAssemblyScene'
import { resolveTeamIdentity } from '../shared/teamVisuals'
import {
  Fact,
  PlanMetric,
  SectionTitle,
} from './AgentCockpitPanels'

type AgentInsightWorkbenchProps = {
  role: TeamRole
  roleState: RolePrivateState | null
}

export function AgentInsightWorkbench({
  role,
  roleState,
}: AgentInsightWorkbenchProps) {
  const loadout = roleState?.ownLoadout ?? null
  const blueprint = loadout?.blueprint ?? null
  const decision = roleState?.combat?.decision
  const legalActions = roleState?.gameMaster?.legalActions ?? []
  const boardSummary = createBoardActionSummary(roleState?.gameMaster?.board)
  const catalogById = createCatalogLookup(roleState)
  const loadoutParts = createLoadoutPartReadouts(roleState, loadout, catalogById)
  const hasBlueprint = Boolean(blueprint && blueprint.blocks.length > 0)
  const submissionLabel = roleState?.submitted ? 'Accepted' : 'Pending'
  const teamIdentity = roleState ? resolveTeamIdentity(role, roleState.identity) : null

  return (
    <section className="agent-live-panel cockpit-workbench agent-insight-workbench" aria-labelledby="agent-insight-heading">
      <div className="workbench-header">
        <div>
          <SectionTitle id="agent-insight-heading" title="Agent insight" />
          <strong>{createInsightSubtitle(roleState, loadout, teamIdentity)}</strong>
        </div>
        <span className={`assembly-state${roleState?.submitted ? '' : ' is-draft'}`}>
          {submissionLabel}
        </span>
      </div>

      <div className="plan-metric-strip" aria-label="Agent state summary">
        <PlanMetric label="Phase" value={formatLabel(roleState?.phase ?? 'not_loaded')} />
        <PlanMetric label="Loadout" tone={roleState?.submitted ? 'ok' : undefined} value={submissionLabel} />
        <PlanMetric label="Blueprint" value={blueprint ? `${blueprint.blocks.length} blocks` : 'No blueprint'} />
        <PlanMetric
          label={roleState?.phase === 'combat_turn' ? 'Board actions' : 'Actions'}
          tone={legalActions.length > 0 ? 'ok' : undefined}
          value={formatActionMetric(roleState, legalActions, boardSummary)}
        />
      </div>

      {!roleState ? (
        <NoRoleStatePanel />
      ) : null}

      {roleState && teamIdentity && loadout && hasBlueprint && blueprint ? (
        <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
          <div className="plan-section-header">
            <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
            <div className="assembly-preview-meta">
              <span className="assembly-state">Confirmed bot</span>
              <strong>{blueprint.name}</strong>
              <span>{loadout.machineDesign ? 'Machine-authority loadout from role state' : 'Legacy loadout from role state'}</span>
            </div>
          </div>
          <BotAssemblyScene
            blueprint={blueprint}
            identity={teamIdentity}
            machineDesign={loadout.machineDesign}
            role={role}
            submitted
          />
        </section>
      ) : null}

      {roleState ? (
      <div className={`insight-grid${decision ? ' has-decision' : ''}`}>
        <section className="plan-section insight-panel" aria-labelledby="plan-read-heading">
          <SectionTitle id="plan-read-heading" title="Loadout read" />
          {loadout ? (
            <>
              <div className="insight-readout-grid">
                <ReadoutCard
                  label="Bot"
                  value={loadout.blueprint.name}
                  detail={`${loadout.blueprint.blocks.length} installed blocks`}
                />
                <ReadoutCard
                  label="Movement"
                  value={formatOptionalLabel(roleState.controls?.movement[0])}
                  detail={`${roleState.controls?.movement.length ?? 0} movement action choices`}
                />
                <ReadoutCard
                  label="Weapons"
                  value={formatWeaponSummary(roleState)}
                  detail={formatUtilitySummary(roleState)}
                />
              </div>
              <InsightText
                title="Loadout status"
                text={loadout.confirmedAt ? `Confirmed at ${loadout.confirmedAt}.` : undefined}
                fallback="This loadout has not been confirmed yet."
              />
              <LoadoutPartList parts={loadoutParts} />
              <InsightText
                fallback="Server acceptance means the action passed validation, shop, and budget rules."
                title="Machine legality"
                text="Server acceptance means the action passed validation, shop, and budget rules. It does not mean the machine is strategically good."
              />
            </>
          ) : (
            <>
              <p className="agent-empty">
                No confirmed loadout is available yet. That means this agent has not committed a bot for this round.
              </p>
              {loadoutParts.length > 0 ? <LoadoutPartList parts={loadoutParts} /> : null}
            </>
          )}
        </section>

        <section className="plan-section insight-panel combat-decision-panel" aria-labelledby="decision-heading">
          <SectionTitle id="decision-heading" title="Combat decision" />
          {decision && roleState?.combat ? (
            <>
              <MetricGrid className="agent-facts">
                <Fact label="Turn" value={String(decision.tick)} />
                <Fact label="Range" value={`${formatLabel(decision.range.band)} / ${decision.range.distance.toFixed(2)}m`} />
                <Fact label="Preferred" value={formatLabel(decision.range.preferred)} />
                <Fact label="Self health" value={`${Math.round(decision.health.selfPct)}%`} />
                <Fact label="Opponent health" value={`${Math.round(decision.health.opponentPct)}%`} />
                <Fact label="Submitted" value={roleState.combat.submitted[roleState.role] ? 'Yes' : 'No'} />
              </MetricGrid>
              <DecisionReadiness state={roleState} />
              <InsightList
                emptyText="No tactical cues returned for this turn."
                items={decision.tacticalCues}
                title="Tactical cues"
              />
              <PacketActionSummary
                boardSummary={boardSummary}
                legalActions={legalActions}
              />
              <InsightList
                emptyText="No grid guidance returned."
                items={decision.movementGuidance.reasons}
                title="Grid guidance"
              />
            </>
          ) : (
            <p className="agent-empty">
              Combat decision context appears once both loadouts resolve and a turn is open.
            </p>
          )}
        </section>
      </div>
      ) : null}
    </section>
  )
}

function ReadoutCard({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="insight-readout-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

type LoadoutPartReadout = {
  category: string
  detail: string
  instanceId: string
  name: string
  source: string
  stats: string
  status: string
  tone: 'neutral' | 'ok' | 'warning'
}

type BoardActionSummary = {
  attackActionCount: number
  gridActionIds: Set<string>
  moveActionCount: number
  reachableCellCount: number
  totalCellCount: number
  utilityActionCount: number
}

function LoadoutPartList({ parts }: { parts: LoadoutPartReadout[] }) {
  return (
    <div className="loadout-parts-block">
      <strong>Loadout parts</strong>
      {parts.length > 0 ? (
        <ul className="loadout-part-list">
          {parts.map((part) => (
            <li className={`loadout-part-card tone-${part.tone}`} key={part.instanceId}>
              <div className="loadout-part-main">
                <span>{part.category}</span>
                <strong>{part.name}</strong>
                <small>{part.instanceId}</small>
              </div>
              <div className="loadout-part-side">
                <span>{part.status}</span>
                <small>{part.source}</small>
              </div>
              <p>{part.detail}</p>
              <small className="loadout-part-stats">{part.stats}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">No individual parts are available from role state.</p>
      )}
    </div>
  )
}

function PacketActionSummary({
  boardSummary,
  legalActions,
}: {
  boardSummary: BoardActionSummary
  legalActions: GameMasterLegalAction[]
}) {
  const directActions = legalActions.filter((action) => !boardSummary.gridActionIds.has(action.id))

  return (
    <div className="packet-action-summary">
      <strong>Action packet</strong>
      <div className="action-summary-grid">
        <ReadoutCard
          detail={`${boardSummary.reachableCellCount} reachable cells`}
          label="Board"
          value={`${boardSummary.gridActionIds.size} grid refs`}
        />
        <ReadoutCard
          detail={`${boardSummary.totalCellCount} cells in packet`}
          label="Movement"
          value={`${boardSummary.moveActionCount} moves`}
        />
        <ReadoutCard
          detail={`${boardSummary.utilityActionCount} utility refs`}
          label="Threats"
          value={`${boardSummary.attackActionCount} attacks`}
        />
      </div>
      {directActions.length > 0 ? (
        <ul className="direct-action-list" aria-label="Direct non-grid actions">
          {directActions.slice(0, 4).map((action) => (
            <li key={action.id}>
              <strong>{action.label}</strong>
              <span>{formatLabel(action.kind)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">All current actions are represented by board cells.</p>
      )}
    </div>
  )
}

function createInsightSubtitle(
  roleState: RolePrivateState | null,
  loadout: ConfirmedLoadoutView | null,
  identity: ReturnType<typeof resolveTeamIdentity> | null,
): string {
  if (!roleState) {
    return 'Load role state to inspect the agent.'
  }

  if (loadout) {
    return `${identity?.name ?? 'This role'} confirmed ${loadout.blueprint.name}.`
  }

  return `${identity?.name ?? 'This role'} has not confirmed a loadout.`
}

function NoRoleStatePanel() {
  return (
    <section className="insight-empty-state" aria-labelledby="empty-state-heading">
      <SectionTitle id="empty-state-heading" title="State not loaded" />
      <p>
        The cockpit has no private role state yet. Refresh with a valid observer or agent key; once state loads, this panel shows the confirmed loadout, rationale, and combat decision context.
      </p>
    </section>
  )
}

function DecisionReadiness({ state }: { state: RolePrivateState }) {
  const decision = state.combat?.decision

  if (!decision) {
    return null
  }

  return (
    <div className="decision-readiness">
      <ReadinessCard
        label="Weapon A"
        ready={decision.actionReadiness.weaponA.canFire}
        reason={decision.actionReadiness.weaponA.reason}
      />
      {decision.actionReadiness.weaponB ? (
        <ReadinessCard
          label="Weapon B"
          ready={decision.actionReadiness.weaponB.canFire}
          reason={decision.actionReadiness.weaponB.reason}
        />
      ) : null}
      {decision.actionReadiness.utility ? (
        <ReadinessCard
          label="Utility"
          ready={decision.actionReadiness.utility.canActivate}
          reason={decision.actionReadiness.utility.reason}
        />
      ) : null}
    </div>
  )
}

function ReadinessCard({
  label,
  ready,
  reason,
}: {
  label: string
  ready: boolean
  reason: string
}) {
  return (
    <div className={`readiness-card ${ready ? 'is-ready' : 'is-waiting'}`}>
      <span>{label}</span>
      <strong>{ready ? 'Ready' : 'Hold'}</strong>
      <p>{reason}</p>
    </div>
  )
}

function InsightText({
  fallback,
  text,
  title,
}: {
  fallback: string
  text?: string
  title: string
}) {
  return (
    <div className="insight-text">
      <strong>{title}</strong>
      <p>{text?.trim() || fallback}</p>
    </div>
  )
}

function InsightList({
  emptyText,
  items,
  title,
}: {
  emptyText: string
  items: string[]
  title: string
}) {
  return (
    <div className="insight-list-block">
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul className="insight-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">{emptyText}</p>
      )}
    </div>
  )
}

function formatOptionalLabel(value: string | undefined): string {
  return value ? formatLabel(value) : 'Not set'
}

function formatWeaponSummary(state: RolePrivateState): string {
  const slots = [
    state.controls?.weaponA ? 'Weapon A' : '',
    state.controls?.weaponB ? 'Weapon B' : '',
  ].filter(Boolean)

  return slots.length > 0 ? slots.join(' / ') : 'No weapon command'
}

function formatUtilitySummary(state: RolePrivateState): string {
  return state.controls?.utility ? 'Utility command available' : 'No utility command'
}

function formatActionMetric(
  state: RolePrivateState | null,
  legalActions: GameMasterLegalAction[],
  boardSummary: BoardActionSummary,
): string {
  if (state?.phase === 'combat_turn' && boardSummary.gridActionIds.size > 0) {
    return `${boardSummary.gridActionIds.size} grid refs`
  }

  return legalActions.length > 0 ? `${legalActions.length} legal` : 'No actions'
}

function createCatalogLookup(state: RolePrivateState | null): Map<string, PartDefinition> {
  const parts = state?.gameMaster?.catalog?.parts

  if (!Array.isArray(parts)) {
    return new Map()
  }

  return new Map(parts.filter(isPartDefinition).map((part) => [part.id, part]))
}

function createLoadoutPartReadouts(
  state: RolePrivateState | null,
  loadout: ConfirmedLoadoutView | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout[] {
  const buildState = state?.gameMaster?.buildState
  const currentMachine = buildState?.currentDesign.version === 'machine:v1'
    ? buildState.currentDesign.machine
    : undefined
  const machine = loadout?.machineDesign ?? currentMachine

  if (machine) {
    return machine.parts.map((part) => machinePartReadout(part, machine, state, catalogById))
  }

  return (loadout?.blueprint.blocks ?? []).map((block) => blueprintBlockReadout(block, state, catalogById))
}

function machinePartReadout(
  part: MachinePartInstance,
  machine: MachineDesign,
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout {
  const partId = catalogPartIdFromDefinition(part.definitionId)
  const definition = partId ? catalogById.get(partId) : undefined
  const health = machine.runtime?.healthByInstanceId[part.instanceId] ?? state?.combat?.self.partHealth[part.instanceId]
  const detached = machine.runtime?.detachedInstanceIds?.includes(part.instanceId)
  const disabled = machine.runtime?.disabledInstanceIds?.includes(part.instanceId)
  const status = formatPartStatus(part, health, Boolean(detached), Boolean(disabled))

  return {
    category: definition ? formatCatalogLabel(definition.category) : part.source === 'system_core' ? 'Core' : 'Unknown',
    detail: formatPartDetail(definition, health),
    instanceId: part.instanceId,
    name: definition?.displayName ?? (part.source === 'system_core' ? 'Machine Core' : formatCatalogLabel(part.definitionId)),
    source: part.source === 'system_core' ? 'System' : 'Catalog',
    stats: formatPartStats(definition),
    status: status.label,
    tone: status.tone,
  }
}

function blueprintBlockReadout(
  block: BlueprintBlock,
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout {
  const definition = catalogById.get(block.partId)
  const health = state?.combat?.self.partHealth[block.id]
  const status = formatPartStatus({ source: 'catalog_part' }, health, false, false)

  return {
    category: definition ? formatCatalogLabel(definition.category) : 'Unknown',
    detail: formatPartDetail(definition, health),
    instanceId: block.id,
    name: definition?.displayName ?? formatCatalogLabel(block.partId),
    source: 'Blueprint',
    stats: formatPartStats(definition),
    status: status.label,
    tone: status.tone,
  }
}

function createBoardActionSummary(board: AgentBoardView | undefined): BoardActionSummary {
  const summary: BoardActionSummary = {
    attackActionCount: 0,
    gridActionIds: new Set(),
    moveActionCount: 0,
    reachableCellCount: 0,
    totalCellCount: board?.cells?.length ?? 0,
    utilityActionCount: 0,
  }

  for (const cell of board?.cells ?? []) {
    if (cell.reachable) {
      summary.reachableCellCount += 1
    }

    if (cell.legal?.moveHere) {
      summary.gridActionIds.add(cell.legal.moveHere.actionId)
      summary.moveActionCount += 1
    }

    for (const attack of cell.legal?.attacksFromHere ?? []) {
      summary.gridActionIds.add(attack.actionId)
      summary.attackActionCount += 1
    }

    if (cell.legal?.useUtilityFromHere) {
      summary.gridActionIds.add(cell.legal.useUtilityFromHere.actionId)
      summary.utilityActionCount += 1
    }
  }

  return summary
}

function formatPartDetail(definition: PartDefinition | undefined, health: number | undefined): string {
  const details = [
    definition ? `${definition.cost}g` : '',
    definition ? `${formatPartMass(definition.mass)} mass` : '',
    definition ? `${definition.durability} durability` : '',
    typeof health === 'number' ? `${Math.max(0, Math.round(health))} health` : '',
  ].filter(Boolean)

  return details.length > 0 ? details.join(' / ') : 'No catalog detail available'
}

function formatPartStats(definition: PartDefinition | undefined): string {
  if (!definition) {
    return 'Stats unavailable'
  }

  const stats = Object.entries(definition.stats)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .slice(0, 4)
    .map(([key, value]) => `${formatCatalogLabel(key)} ${value}`)

  return stats.length > 0 ? stats.join(' / ') : formatCatalogLabel(definition.spec.kind)
}

function formatPartStatus(
  part: Pick<MachinePartInstance, 'source'>,
  health: number | undefined,
  detached: boolean,
  disabled: boolean,
): { label: string; tone: LoadoutPartReadout['tone'] } {
  if (detached) {
    return { label: 'Detached', tone: 'warning' }
  }

  if (disabled) {
    return { label: 'Disabled', tone: 'warning' }
  }

  if (typeof health === 'number' && health <= 0) {
    return { label: 'Destroyed', tone: 'warning' }
  }

  return part.source === 'system_core'
    ? { label: 'Core', tone: 'neutral' }
    : { label: 'Installed', tone: 'ok' }
}

function catalogPartIdFromDefinition(definitionId: string): string | undefined {
  const prefix = 'catalog:'

  return definitionId.startsWith(prefix) ? definitionId.slice(prefix.length) : undefined
}

function formatPartMass(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function isPartDefinition(value: unknown): value is PartDefinition {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as PartDefinition).id === 'string' &&
      typeof (value as PartDefinition).displayName === 'string',
  )
}
