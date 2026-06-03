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
  mockBotBlueprints,
  mockPublicSession,
  mockReplay,
  mockRoleStates,
  mockTeamEconomy,
  visibleCatalogParts,
  type AwardOption,
} from './mockSession'
import { LiveAgentCockpit } from './agent/LiveAgentCockpit'
import { ReplayViewer } from './replay/ReplayViewer'

type ViewMode = 'human' | 'agent'
type AwardSelections = Partial<Record<string, TeamRole>>

const orderedCategories: PartCategory[] = [
  'body',
  'mobility',
  'weapon',
  'defense',
  'utility',
  'style',
]
const awardTeams: TeamRole[] = ['red', 'blue']
const maxVisibleAwards = 3
const maxSelectedAwards = 2

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
  const awards = useMemo(() => mockAwards.slice(0, maxVisibleAwards), [])
  const [selectedAwards, setSelectedAwards] = useState<AwardSelections>({})
  const [awardsConfirmed, setAwardsConfirmed] = useState(false)
  const awardBonuses = calculateAwardBonuses(awards, selectedAwards)

  const toggleAward = (awardId: string, team: TeamRole) => {
    const currentTeam = selectedAwards[awardId]

    if (currentTeam === team) {
      const nextSelections = { ...selectedAwards }

      delete nextSelections[awardId]
      setSelectedAwards(nextSelections)
      setAwardsConfirmed(false)
      return
    }

    const teamAlreadySelected = teamHasSelection(selectedAwards, team, awardId)
    const wouldAddSelection = !currentTeam
    const selectedCount = countAwardSelections(selectedAwards)

    if (
      teamAlreadySelected ||
      (wouldAddSelection && selectedCount >= maxSelectedAwards)
    ) {
      return
    }

    setSelectedAwards({
      ...selectedAwards,
      [awardId]: team,
    })
    setAwardsConfirmed(false)
  }

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
        <ReplayViewer
          arena={mockPublicSession.arena}
          botBlueprints={mockBotBlueprints}
          timeline={mockReplay}
        />
        <AwardPanel
          awards={awards}
          selections={selectedAwards}
          bonuses={awardBonuses}
          confirmed={awardsConfirmed}
          onToggleAward={toggleAward}
          onConfirmAwards={() => setAwardsConfirmed(true)}
        />
      </section>
      <aside className="summary-column" aria-label="Match summary">
        <MatchSummary />
        <EconomyPanel awardBonuses={awardBonuses} />
        <EventLog />
      </aside>
    </div>
  )
}

function AwardPanel({
  awards,
  selections,
  bonuses,
  confirmed,
  onToggleAward,
  onConfirmAwards,
}: {
  awards: AwardOption[]
  selections: AwardSelections
  bonuses: Record<TeamRole, number>
  confirmed: boolean
  onToggleAward: (awardId: string, team: TeamRole) => void
  onConfirmAwards: () => void
}) {
  const selectedCount = countAwardSelections(selections)

  return (
    <section className="award-panel" aria-labelledby="awards-heading">
      <SectionHeader
        kicker="Referee awards"
        title="Pick up to 2"
        aside="Max 1 per team. Applies next round."
        id="awards-heading"
      />
      <div className="award-grid">
        {awards.map((award) => {
          const selectedTeam = selections[award.id]

          return (
            <article
              className={selectedTeam ? 'award-card selected' : 'award-card'}
              key={award.id}
            >
              <div className="award-card-header">
                <h3>{award.title}</h3>
                <strong>+{award.gold}g</strong>
              </div>
              <p>{award.description}</p>
              <div
                className="award-team-actions"
                aria-label={`Select recipient for ${award.title}`}
              >
                {awardTeams.map((team) => {
                  const isSelected = selectedTeam === team
                  const isDisabled =
                    !isSelected &&
                    (teamHasSelection(selections, team, award.id) ||
                      (!selectedTeam && selectedCount >= maxSelectedAwards))

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`team-choice ${team}${isSelected ? ' selected' : ''}`}
                      disabled={isDisabled}
                      key={team}
                      type="button"
                      onClick={() => onToggleAward(award.id, team)}
                    >
                      Award {capitalize(team)}
                    </button>
                  )
                })}
              </div>
              <footer>
                <span>Next round bonus</span>
                <strong>
                  {selectedTeam ? `${capitalize(selectedTeam)} +${award.gold}g` : 'None'}
                </strong>
              </footer>
            </article>
          )
        })}
      </div>
      <div className="award-action-bar">
        <strong>
          {selectedCount} / {maxSelectedAwards} selected
        </strong>
        <span>{formatAwardBonusSummary(bonuses)}</span>
        <button
          type="button"
          disabled={confirmed}
          onClick={onConfirmAwards}
        >
          {confirmed ? 'Awards Confirmed' : 'Confirm Awards'}
        </button>
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

function EconomyPanel({
  awardBonuses,
}: {
  awardBonuses: Record<TeamRole, number>
}) {
  return (
    <section className="panel">
      <SectionHeader kicker="Teams" title="Economy" aside="Round 4 preview" />
      <div className="team-table">
        {awardTeams.map((role) => {
          const economy = mockTeamEconomy[role]

          return (
            <TeamEconomy
              key={role}
              role={role}
              gold={economy.gold}
              wins={economy.wins}
              streak={economy.streak}
              damage={economy.damage}
              baseIncome={economy.baseIncome}
              interestPreview={economy.interestPreview}
              awardBonus={awardBonuses[role]}
            />
          )
        })}
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
  baseIncome,
  interestPreview,
  awardBonus,
}: {
  role: TeamRole
  gold: number
  wins: number
  streak: number
  damage: number
  baseIncome: number
  interestPreview: number
  awardBonus: number
}) {
  return (
    <div className={`team-row ${role}`}>
      <strong>{capitalize(role)}</strong>
      <span>{gold}g</span>
      <span>{wins} wins</span>
      <span>{streak} streak</span>
      <span>{damage} dmg</span>
      <small>
        Next: +{baseIncome} income, +{interestPreview} interest, +{awardBonus}{' '}
        awards
      </small>
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

function formatStat([name, value]: [string, number]) {
  return `${name}+${value}`
}

function countAwardSelections(selections: AwardSelections) {
  return Object.keys(selections).length
}

function teamHasSelection(
  selections: AwardSelections,
  team: TeamRole,
  exceptAwardId?: string,
) {
  return Object.entries(selections).some(
    ([awardId, selectedTeam]) =>
      awardId !== exceptAwardId && selectedTeam === team,
  )
}

function calculateAwardBonuses(
  awards: AwardOption[],
  selections: AwardSelections,
): Record<TeamRole, number> {
  return awards.reduce<Record<TeamRole, number>>(
    (bonuses, award) => {
      const selectedTeam = selections[award.id]

      if (selectedTeam) {
        bonuses[selectedTeam] += award.gold
      }

      return bonuses
    },
    { red: 0, blue: 0 },
  )
}

function formatAwardBonusSummary(bonuses: Record<TeamRole, number>) {
  const summary = awardTeams
    .filter((team) => bonuses[team] > 0)
    .map((team) => `${capitalize(team)} +${bonuses[team]}g`)
    .join(', ')

  return summary ? `Next round: ${summary}` : 'Next round: no award bonus'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function isAgentPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/agent' || normalized.endsWith('/agent')
}
