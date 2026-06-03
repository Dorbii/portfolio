import { useMemo, useState } from 'react'
import { getPart } from '../../../packages/catalog/src/index.js'
import type {
  PartCategory,
  PartDefinition,
  RolePrivateState,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import {
  mockAwards,
  mockPublicSession,
  mockReplay,
  mockRoleStates,
  visibleCatalogParts,
  type AwardOption,
} from './mockSession'
import { LiveAgentCockpit } from './agent/LiveAgentCockpit'

type ViewMode = 'human' | 'agent'

const orderedCategories: PartCategory[] = [
  'body',
  'mobility',
  'weapon',
  'defense',
  'utility',
  'style',
]

export default function App() {
  const isAgentRoute = isAgentPath(window.location.pathname)
  const [viewMode, setViewMode] = useState<ViewMode>('human')
  const [selectedRole, setSelectedRole] = useState<TeamRole>('red')
  const selectedRoleState = mockRoleStates[selectedRole]

  if (isAgentRoute) {
    return <LiveAgentCockpit />
  }

  return (
    <main className="arena-app">
      <TopBar viewMode={viewMode} onViewModeChange={setViewMode} />
      {viewMode === 'human' ? (
        <HumanDashboard />
      ) : (
        <AgentCockpit
          roleState={selectedRoleState}
          selectedRole={selectedRole}
          onSelectedRoleChange={setSelectedRole}
        />
      )}
    </main>
  )
}

function TopBar({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}) {
  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="eyebrow">Agent Arena</span>
        <h1>Referee Console</h1>
      </div>
      <div className="session-strip" aria-label="Match status">
        <Metric label="Session" value={mockPublicSession.sessionId} />
        <Metric
          label="Round"
          value={`${mockPublicSession.round} / ${mockPublicSession.maxRounds}`}
        />
        <Metric label="Score" value="Red 2 - Blue 1" />
        <Metric label="Phase" value={formatPhase(mockPublicSession.phase)} />
      </div>
      <div className="view-switch" aria-label="Screen selector">
        <button
          className={viewMode === 'human' ? 'active' : ''}
          type="button"
          onClick={() => onViewModeChange('human')}
        >
          Human
        </button>
        <button
          className={viewMode === 'agent' ? 'active' : ''}
          type="button"
          onClick={() => onViewModeChange('agent')}
        >
          Agent
        </button>
      </div>
    </header>
  )
}

function HumanDashboard() {
  return (
    <div className="human-grid">
      <nav className="rail" aria-label="Dashboard sections">
        {['Overview', 'Match Log', 'Agents', 'Parts', 'Replays', 'Settings'].map(
          (item) => (
            <button
              className={item === 'Overview' ? 'active' : ''}
              key={item}
              type="button"
            >
              {item}
            </button>
          ),
        )}
      </nav>
      <section className="replay-column" aria-labelledby="replay-heading">
        <SectionHeader
          kicker="Replay"
          title="Round 3 Rail Trap"
          aside={mockReplay.summary}
          id="replay-heading"
        />
        <ReplayViewer />
        <AwardPanel awards={mockAwards} />
      </section>
      <aside className="summary-column" aria-label="Match summary">
        <MatchSummary />
        <EconomyPanel />
        <EventLog />
      </aside>
    </div>
  )
}

function ReplayViewer() {
  return (
    <section className="replay-shell" aria-label="Replay viewport placeholder">
      <div className="viewport-grid">
        <div className="bot-token bot-red">RED</div>
        <div className="bot-token bot-blue">BLUE</div>
        <div className="hazard hazard-center">SAW</div>
        <div className="viewport-label">
          <span>Renderer shell</span>
          <strong>Replay viewport placeholder</strong>
          <small>{mockPublicSession.arena.name}</small>
        </div>
      </div>
      <div className="replay-controls" aria-label="Replay controls">
        <button type="button">Play</button>
        <button type="button">1x</button>
        <button type="button">Wide camera</button>
        <button type="button">Next event</button>
      </div>
      <ol className="timeline-list" aria-label="Replay event timeline">
        {mockReplay.events.map((event, index) => (
          <li key={`${event.t}-${event.type}-${index}`}>
            <span>{event.t}s</span>
            <strong>{formatEvent(event.type)}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AwardPanel({ awards }: { awards: AwardOption[] }) {
  return (
    <section className="award-panel" aria-labelledby="awards-heading">
      <SectionHeader
        kicker="Referee awards"
        title="Pick up to 2"
        aside="Max 1 per team, applied next round"
        id="awards-heading"
      />
      <div className="award-grid">
        {awards.map((award) => (
          <article className="award-card" key={award.id}>
            <div>
              <span className={`team-dot ${award.suggestedTeam}`} />
              <h3>{award.title}</h3>
            </div>
            <p>{award.description}</p>
            <footer>
              <strong>+{award.gold} gold</strong>
              <span>{capitalize(award.suggestedTeam)} lean</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}

function MatchSummary() {
  const result = mockPublicSession.lastResult

  return (
    <section className="panel">
      <SectionHeader kicker="Match" title="Status" aside="Mock state" />
      <dl className="status-list">
        <div>
          <dt>Phase</dt>
          <dd>{formatPhase(mockPublicSession.phase)}</dd>
        </div>
        <div>
          <dt>Replay</dt>
          <dd>{mockPublicSession.replayAvailable ? 'Ready' : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Winner</dt>
          <dd>{result ? capitalize(result.winner) : 'Pending'}</dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd>{result?.reason ?? 'Awaiting combat'}</dd>
        </div>
      </dl>
    </section>
  )
}

function EconomyPanel() {
  return (
    <section className="panel">
      <SectionHeader kicker="Teams" title="Economy" aside="Round 4 preview" />
      <div className="team-table">
        <TeamEconomy role="red" gold={68} wins={2} streak={0} damage={64} />
        <TeamEconomy role="blue" gold={92} wins={1} streak={1} damage={31} />
      </div>
    </section>
  )
}

function TeamEconomy({
  role,
  gold,
  wins,
  streak,
  damage,
}: {
  role: TeamRole
  gold: number
  wins: number
  streak: number
  damage: number
}) {
  return (
    <div className={`team-row ${role}`}>
      <strong>{capitalize(role)}</strong>
      <span>{gold}g</span>
      <span>{wins} wins</span>
      <span>{streak} streak</span>
      <span>{damage} dmg</span>
    </div>
  )
}

function EventLog() {
  return (
    <section className="panel">
      <SectionHeader kicker="Log" title="Session events" aside="Latest first" />
      <ol className="event-log">
        {[...mockPublicSession.eventLog].reverse().map((event) => (
          <li key={`${event.at}-${event.type}`}>
            <span>{event.at}</span>
            <p>{event.message}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AgentCockpit({
  roleState,
  selectedRole,
  onSelectedRoleChange,
}: {
  roleState: RolePrivateState
  selectedRole: TeamRole
  onSelectedRoleChange: (role: TeamRole) => void
}) {
  return (
    <div className="agent-grid">
      <section className="agent-overview">
        <SectionHeader
          kicker="Agent cockpit"
          title={`${capitalize(roleState.role)} role state`}
          aside="Read-only mock"
        />
        <div className="role-tabs" aria-label="Mock role selector">
          {(['red', 'blue'] as TeamRole[]).map((role) => (
            <button
              className={selectedRole === role ? 'active' : ''}
              key={role}
              type="button"
              onClick={() => onSelectedRoleChange(role)}
            >
              {capitalize(role)}
            </button>
          ))}
        </div>
        <dl className="cockpit-stats">
          <div>
            <dt>Phase</dt>
            <dd>{formatPhase(roleState.phase)}</dd>
          </div>
          <div>
            <dt>Gold</dt>
            <dd>{roleState.gold}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{roleState.submitted ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Opponent</dt>
            <dd>
              {capitalize(roleState.opponent.role)}{' '}
              {roleState.opponent.submitted ? 'locked' : 'waiting'}
            </dd>
          </div>
        </dl>
        <ControlsPanel roleState={roleState} />
      </section>
      <InventoryPanel roleState={roleState} />
      <SubmissionPanel roleState={roleState} />
      <PartCatalog />
    </div>
  )
}

function ControlsPanel({ roleState }: { roleState: RolePrivateState }) {
  const controls = roleState.controls

  return (
    <section className="compact-panel">
      <h2>Available controls</h2>
      <div className="control-groups">
        <ControlGroup label="Movement" values={controls?.movement ?? []} />
        <ControlGroup label="Weapon A" values={controls?.weaponA ?? []} />
        <ControlGroup label="Utility" values={controls?.utility ?? []} />
      </div>
    </section>
  )
}

function ControlGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span>{label}</span>
      <p>{values.length > 0 ? values.join(', ') : 'None'}</p>
    </div>
  )
}

function InventoryPanel({ roleState }: { roleState: RolePrivateState }) {
  return (
    <section className="panel inventory-panel">
      <SectionHeader kicker="Private" title="Inventory" aside="Owned parts" />
      <div className="inventory-list">
        {roleState.inventory.map((item) => {
          const part = getPart(item.partId)

          return (
            <div className="inventory-row" key={item.partId}>
              <strong>{part?.displayName ?? item.partId}</strong>
              <span>x{item.quantity}</span>
              <span>{part ? part.category : 'unknown'}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SubmissionPanel({ roleState }: { roleState: RolePrivateState }) {
  const submission = roleState.ownSubmission

  return (
    <section className="panel submission-panel">
      <SectionHeader kicker="Round plan" title="Last submission" aside="Locked" />
      {submission ? (
        <div className="submission-body">
          <dl className="status-list">
            <div>
              <dt>Bot</dt>
              <dd>{submission.blueprint.name}</dd>
            </div>
            <div>
              <dt>Purchases</dt>
              <dd>{submission.purchases.length}</dd>
            </div>
            <div>
              <dt>Commands</dt>
              <dd>{submission.turnPlan.commands.length}</dd>
            </div>
          </dl>
          <pre>{JSON.stringify(submission.turnPlan.commands, null, 2)}</pre>
        </div>
      ) : (
        <p className="empty-state">No submission for this role.</p>
      )}
    </section>
  )
}

function PartCatalog() {
  const categoryCounts = useMemo(() => {
    return orderedCategories.map((category) => ({
      category,
      count: visibleCatalogParts.filter((part) => part.category === category)
        .length,
    }))
  }, [])

  return (
    <section className="panel catalog-panel">
      <SectionHeader
        kicker="Catalog"
        title="Available parts"
        aside={`${visibleCatalogParts.length} total`}
      />
      <div className="category-strip">
        {categoryCounts.map((item) => (
          <span key={item.category}>
            {item.category} {item.count}
          </span>
        ))}
      </div>
      <div className="catalog-table" role="table" aria-label="Part catalog">
        <div className="catalog-head" role="row">
          <span>Name</span>
          <span>Type</span>
          <span>Cost</span>
          <span>Stats</span>
        </div>
        {visibleCatalogParts.slice(0, 18).map((part) => (
          <CatalogRow key={part.id} part={part} />
        ))}
      </div>
    </section>
  )
}

function CatalogRow({ part }: { part: PartDefinition }) {
  const stats = Object.entries(part.stats).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )

  return (
    <div className="catalog-row" role="row">
      <strong>{part.displayName}</strong>
      <span>{part.category}</span>
      <span>{part.cost}g</span>
      <span>{stats.length > 0 ? stats.slice(0, 3).map(formatStat).join(' ') : '-'}</span>
    </div>
  )
}

function SectionHeader({
  kicker,
  title,
  aside,
  id,
}: {
  kicker: string
  title: string
  aside?: string
  id?: string
}) {
  return (
    <div className="section-header">
      <div>
        <span>{kicker}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {aside ? <p>{aside}</p> : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatPhase(phase: string) {
  return phase
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

function formatEvent(eventType: string) {
  return formatPhase(eventType)
}

function formatStat([name, value]: [string, number]) {
  return `${name}+${value}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function isAgentPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/agent' || normalized.endsWith('/agent')
}
