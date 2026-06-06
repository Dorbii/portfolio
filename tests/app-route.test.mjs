import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
const cockpitSource = readFileSync(
  new URL('../apps/web/src/agent/LiveAgentCockpit.tsx', import.meta.url),
  'utf8',
)
const cockpitShellSource = readFileSync(
  new URL('../apps/web/src/agent/AgentCockpitShell.tsx', import.meta.url),
  'utf8',
)
const cockpitSidebarSource = readFileSync(
  new URL('../apps/web/src/agent/AgentCockpitSidebar.tsx', import.meta.url),
  'utf8',
)
const cockpitControllerSource = readFileSync(
  new URL('../apps/web/src/agent/useLiveAgentCockpitController.ts', import.meta.url),
  'utf8',
)
const agentRoleSessionSource = readFileSync(
  new URL('../apps/web/src/agent/useAgentRoleSession.ts', import.meta.url),
  'utf8',
)
const agentRoutePreflightSource = readFileSync(
  new URL('../apps/web/src/agent/AgentRoutePreflight.tsx', import.meta.url),
  'utf8',
)
const agentRoleApiInstallerSource = readFileSync(
  new URL('../apps/web/src/agent/agentRoleApiInstaller.ts', import.meta.url),
  'utf8',
)
const agentRolePollingSource = readFileSync(
  new URL('../apps/web/src/agent/agentRolePolling.ts', import.meta.url),
  'utf8',
)
const cockpitViewStateSource = readFileSync(
  new URL('../apps/web/src/agent/agentCockpitViewState.ts', import.meta.url),
  'utf8',
)
const cockpitPanelsSource = readFileSync(
  new URL('../apps/web/src/agent/AgentCockpitPanels.tsx', import.meta.url),
  'utf8',
)
const agentInsightSource = readFileSync(
  new URL('../apps/web/src/agent/AgentInsightWorkbench.tsx', import.meta.url),
  'utf8',
)
const sharedUiSource = readFileSync(
  new URL('../apps/web/src/shared/ui.tsx', import.meta.url),
  'utf8',
)
const teamVisualsSource = readFileSync(
  new URL('../apps/web/src/shared/teamVisuals.ts', import.meta.url),
  'utf8',
)
const replayViewerSource = readFileSync(
  new URL('../apps/web/src/replay/ReplayViewer.tsx', import.meta.url),
  'utf8',
)
const replayPreviewSource = readFileSync(
  new URL('../apps/web/src/replay/ReplayPreview.tsx', import.meta.url),
  'utf8',
)
const arenaPreviewSceneSource = readFileSync(
  new URL('../apps/web/src/replay/ArenaPreviewScene.tsx', import.meta.url),
  'utf8',
)
const replayCameraPresetsSource = readFileSync(
  new URL('../apps/web/src/replay/replayCameraPresets.ts', import.meta.url),
  'utf8',
)
const refereePanelsSource = readFileSync(
  new URL('../apps/web/src/referee/RefereeConsolePanels.tsx', import.meta.url),
  'utf8',
)
const refereeConsoleSource = readFileSync(
  new URL('../apps/web/src/referee/RefereeConsole.tsx', import.meta.url),
  'utf8',
)
const refereeConsoleControllerSource = readFileSync(
  new URL('../apps/web/src/referee/useRefereeConsoleController.ts', import.meta.url),
  'utf8',
)
const refereeReplayPayloadSource = readFileSync(
  new URL('../apps/web/src/referee/useRefereeReplayPayload.ts', import.meta.url),
  'utf8',
)
const refereeRoundAdvanceSource = readFileSync(
  new URL('../apps/web/src/referee/useRefereeRoundAdvance.ts', import.meta.url),
  'utf8',
)
const refereeAgentBriefsSource = readFileSync(
  new URL('../apps/web/src/referee/refereeAgentBriefs.ts', import.meta.url),
  'utf8',
)
const babylonReplaySceneSource = readFileSync(
  new URL('../apps/web/src/replay/BabylonReplayScene.tsx', import.meta.url),
  'utf8',
)
const babylonRendererKitSource = readFileSync(
  new URL('../apps/web/src/replay/babylonRendererKit.ts', import.meta.url),
  'utf8',
)
const babylonRendererBudgetsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonRendererBudgets.ts', import.meta.url),
  'utf8',
)
const babylonArenaSource = readFileSync(
  new URL('../apps/web/src/replay/babylonArena.ts', import.meta.url),
  'utf8',
)
const babylonMaterialsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonMaterials.ts', import.meta.url),
  'utf8',
)
const babylonSurfaceTexturesSource = readFileSync(
  new URL('../apps/web/src/replay/babylonSurfaceTextures.ts', import.meta.url),
  'utf8',
)
const babylonPartDetailsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonPartDetails.ts', import.meta.url),
  'utf8',
)
const babylonReplayEffectsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonReplayEffects.ts', import.meta.url),
  'utf8',
)
const babylonSceneUtilsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonSceneUtils.ts', import.meta.url),
  'utf8',
)
const babylonWeaponPartsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonWeaponParts.ts', import.meta.url),
  'utf8',
)
const botAssemblyRendererSource = readFileSync(
  new URL('../apps/web/src/agent/botAssemblyRenderer.ts', import.meta.url),
  'utf8',
)
const botAssemblyAnimationSource = readFileSync(
  new URL('../apps/web/src/agent/botAssemblyAnimation.ts', import.meta.url),
  'utf8',
)
const botAssemblySceneSource = readFileSync(
  new URL('../apps/web/src/agent/BotAssemblyScene.tsx', import.meta.url),
  'utf8',
)
const actualPartCaptureToolSource = readFileSync(
  new URL('../tools/capture-actual-part-renders.mjs', import.meta.url),
  'utf8',
)
const catalogAstToolSource = readFileSync(
  new URL('../tools/lib/catalogAst.mjs', import.meta.url),
  'utf8',
)
const rendererBudgetToolSource = readFileSync(
  new URL('../tools/check-babylon-renderer-budget.mjs', import.meta.url),
  'utf8',
)
const deadExportScannerSource = readFileSync(
  new URL('../tools/scan-dead-exports.mjs', import.meta.url),
  'utf8',
)
const packageSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8')

function functionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`)
  const next = source.indexOf('\nfunction ', start + 1)

  assert.notEqual(start, -1)

  return next === -1 ? source.slice(start) : source.slice(start, next)
}

test('app keeps a dedicated /agent route gate tolerant of nested paths', () => {
  assert.match(appSource, /function isAgentPathname\(/)
  assert.match(appSource, /const normalized = pathname\.replace\(/)
  assert.match(appSource, /normalized === '\/agent'/)
  assert.match(appSource, /normalized\.endsWith\('\/agent'\)/)
})

test('root console is wired to live referee session helpers', () => {
  const refereeConsoleFunctionSource = functionSource(refereeConsoleSource, 'RefereeConsole')
  const refereeRuntimeSource = [
    refereeConsoleSource,
    refereeConsoleControllerSource,
    refereeReplayPayloadSource,
    refereeRoundAdvanceSource,
    refereeAgentBriefsSource,
  ].join('\n')

  assert.equal(refereeRuntimeSource.includes('mockPublicSession'), false)
  assert.equal(refereeRuntimeSource.includes('mockRoleStates'), false)
  assert.ok(appSource.includes('./referee/RefereeConsole'))
  assert.ok(refereeConsoleFunctionSource.includes('useRefereeConsoleController'))
  assert.ok(refereeRuntimeSource.includes('./refereeClient'))
  assert.ok(refereeRuntimeSource.includes('createSession'))
  assert.ok(refereeRuntimeSource.includes('loadPublicSession'))
  assert.ok(refereeRuntimeSource.includes('loadReplayPayload'))
  assert.ok(refereeConsoleSource.includes('ReplayViewer'))
  assert.ok(refereeConsoleSource.includes("import('../replay/ReplayViewer')"))
  assert.ok(refereeConsoleSource.includes('PublicChatLog'))
  assert.ok(refereeConsoleSource.includes('Fight Comms'))
  assert.ok(refereeConsoleSource.includes('ArenaImpactDashboard'))
  assert.ok(refereeConsoleSource.indexOf('fight-comms-panel') < refereeConsoleSource.indexOf('key-stats-panel'))
  assert.ok(refereeRuntimeSource.includes('advanceRound'))
  assert.equal(refereeRuntimeSource.includes('Create capability token'), false)
  assert.equal(refereeConsoleSource.includes('Referee capability token'), false)
  assert.ok(refereeRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(refereeConsoleSource.includes('roleHandoffs'))
  assert.ok(refereeConsoleSource.includes('sessionControl'))
  assert.ok(refereePanelsSource.includes('scoreboard-session-actions'))
  assert.ok(refereePanelsSource.includes('Refresh Session'))
  assert.ok(refereePanelsSource.includes('scoreboard-handoff-actions'))
  assert.ok(refereePanelsSource.includes('scoreboard-team-status'))
  assert.ok(refereePanelsSource.includes('ArenaImpactDashboard'))
  assert.ok(refereePanelsSource.includes('Hazard Damage Taken'))
  assert.ok(refereePanelsSource.includes('summarizeArenaImpact'))
  assert.ok(refereePanelsSource.includes('No message body supplied.'))
  assert.ok(refereePanelsSource.includes('View cockpit'))
  assert.ok(refereePanelsSource.includes('Copy handoff'))
  assert.equal(refereePanelsSource.includes('team-status-facts'), false)
  assert.equal(refereePanelsSource.includes('StatusFact'), false)
  assert.equal(refereeConsoleSource.includes('TeamStatusDashboard'), false)
  assert.equal(refereeConsoleSource.includes('RoundSummaryDashboard'), false)
  assert.equal(refereeConsoleSource.includes('match-ops-dock'), false)
  assert.equal(refereeConsoleSource.includes('referee-message'), false)
  assert.equal(refereeRuntimeSource.includes('Public session state loaded.'), false)
  assert.equal(refereeRuntimeSource.includes('handoff copied'), false)
  assert.ok(refereeConsoleControllerSource.includes('writeStoredSession(window.sessionStorage'))
  assert.ok(refereeConsoleControllerSource.includes('refreshStoredSession'))
  assert.equal(refereeConsoleSource.includes('FormField'), false)
  assert.equal(refereeConsoleSource.includes('Session ID'), false)
  assert.equal(refereePanelsSource.includes('label="Claim"'), false)
  assert.equal(refereePanelsSource.includes('label="Submission"'), false)
  assert.equal(refereeRuntimeSource.includes(['wake', 'brief', 'copied'].join(' ')), false)
  assert.equal(refereeRuntimeSource.includes(['Refresh', 'claim'].join(' ')), false)
})

test('agent cockpit renders reliability and debug hooks', () => {
  const cockpitRuntimeSource = [
    cockpitSource,
    cockpitShellSource,
    cockpitSidebarSource,
    cockpitControllerSource,
    agentRoleSessionSource,
    agentRoutePreflightSource,
    agentRoleApiInstallerSource,
    agentRolePollingSource,
    agentInsightSource,
    cockpitViewStateSource,
  ].join('\n')

  assert.match(cockpitRuntimeSource, /window\.AgentArenaRole/)
  assert.ok(appSource.includes('AgentRoutePreflight'))
  assert.ok(appSource.includes('Browser helper is available as window.AgentArenaRole'))
  assert.ok(appSource.includes('RouteErrorBoundary'))
  assert.ok(appSource.includes('Agent cockpit failed to load. Browser helper is available as window.AgentArenaRole.'))
  assert.ok(agentRoutePreflightSource.includes('installAgentArenaRoleApi'))
  assert.ok(agentRoleSessionSource.includes('installAgentArenaRoleApi'))
  assert.ok(agentRoleApiInstallerSource.includes('window.AgentArenaRole = api'))
  assert.ok(agentRoleApiInstallerSource.includes('bootstrapRole: async'))
  assert.ok(agentRoleApiInstallerSource.includes('waitForNextAction: async'))
  assert.ok(agentRolePollingSource.includes('startAgentRoleStatePolling'))
  assert.ok(cockpitRuntimeSource.includes('agent-empty'))
  assert.ok(cockpitPanelsSource.includes('agent-connection'))
  assert.ok(cockpitRuntimeSource.includes('Connection'))
  assert.ok(cockpitViewStateSource.includes('createAgentConnectionGuidance'))
  assert.ok(cockpitViewStateSource.includes('await window.AgentArenaRole.bootstrapRole({'))
  assert.ok(cockpitViewStateSource.includes('teamIdentity: {'))
  assert.ok(cockpitViewStateSource.includes('waitForNextAction({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })'))
  assert.ok(cockpitViewStateSource.includes('Submit exactly one legal round plan for this round.'))
  assert.ok(cockpitViewStateSource.includes('combat.decision'))
  assert.ok(cockpitViewStateSource.includes('decision.movementOptions.recommended[0]'))
  assert.ok(cockpitRuntimeSource.includes('Table Talk'))
  assert.ok(agentInsightSource.includes('Assembly bay'))
  assert.ok(agentInsightSource.includes('BotAssemblyScene'))
  assert.ok(botAssemblySceneSource.includes('const blueprintRef = useRef(blueprint)'))
  assert.ok(botAssemblySceneSource.includes('attachBlueprint(activeResources, blueprintRef.current)'))
  assert.ok(botAssemblySceneSource.includes('data-assembly-bot-attached'))
  assert.ok(botAssemblyRendererSource.includes('createBotMaterialSet'))
  assert.ok(botAssemblyAnimationSource.includes('resources.materials'))
  assert.equal(botAssemblyAnimationSource.includes('createTeamMaterials'), false)
  assert.ok(cockpitRuntimeSource.includes('Agent Journal'))
  assert.ok(cockpitRuntimeSource.includes('privateChatLog'))
  assert.ok(cockpitRuntimeSource.includes('agent-arena-state'))
  assert.ok(cockpitRuntimeSource.includes('agent-arena-brief'))
  assert.ok(cockpitRuntimeSource.includes('claimButtonLabel'))
  assert.ok(cockpitRuntimeSource.includes('Clear player key'))
  assert.equal(cockpitRuntimeSource.includes('Last validation error'), false)
  assert.equal(cockpitRuntimeSource.includes('Match log'), false)
  assert.equal(cockpitRuntimeSource.includes('agent-chat-form'), false)
  assert.equal(cockpitRuntimeSource.includes('External agent brief'), false)
})

test('agent cockpit is a read-only insight surface instead of a bot editor', () => {
  const cockpitRuntimeSource = [
    cockpitSource,
    cockpitShellSource,
    cockpitSidebarSource,
    cockpitControllerSource,
    agentInsightSource,
  ].join('\n')

  assert.ok(cockpitSource.includes('AgentInsightWorkbench'))
  assert.ok(agentInsightSource.includes('Agent insight'))
  assert.ok(agentInsightSource.includes('Plan read'))
  assert.ok(agentInsightSource.includes('Combat decision'))
  assert.ok(agentInsightSource.includes('NoRoleStatePanel'))
  assert.ok(agentInsightSource.includes('roleState?.ownSubmission'))
  assert.ok(agentInsightSource.includes('tacticalCues'))
  assert.ok(agentInsightSource.includes('movementOptions.recommended'))
  assert.equal(agentInsightSource.includes('Opening script'), false)
  assert.equal(agentInsightSource.includes('opening-read-heading'), false)
  assert.equal(cockpitRuntimeSource.includes('RoundPlanWorkbench'), false)
  assert.equal(cockpitRuntimeSource.includes('useRoundPlanSubmission'), false)
  assert.equal(cockpitRuntimeSource.includes('setSubmissionDraft'), false)
  assert.equal(cockpitRuntimeSource.includes('Advanced JSON mode'), false)
  assert.equal(cockpitRuntimeSource.includes('PartSelect'), false)
})

test('agent cockpit prioritizes active task workflow over secondary panels', () => {
  assert.ok(cockpitViewStateSource.includes('createAgentCockpitWorkflow'))
  assert.ok(cockpitViewStateSource.includes("'connect' | 'build' | 'turn' | 'review'"))
  assert.ok(cockpitViewStateSource.includes('Unclaimed'))
  assert.ok(cockpitViewStateSource.includes('Claimed'))
  assert.ok(cockpitViewStateSource.includes('Submitted'))
  assert.ok(cockpitViewStateSource.includes('Waiting'))
  assert.ok(cockpitViewStateSource.includes('Review'))
  const cockpitSurfaceSource = [
    cockpitSource,
    cockpitShellSource,
    cockpitSidebarSource,
  ].join('\n')

  assert.ok(cockpitSurfaceSource.includes('AgentTaskPanel'))
  assert.ok(cockpitSurfaceSource.includes('agent-task-panel'))
  assert.ok(cockpitSource.includes('cockpit-primary-column'))
  assert.ok(cockpitSurfaceSource.includes('cockpit-secondary-stack'))
  assert.ok(cockpitSource.indexOf('<AgentTaskPanel') < cockpitSource.indexOf('<AgentInsightWorkbench'))
})

test('Agent Arena operational surfaces use shared UI primitives', () => {
  const requiredPrimitiveExports = [
    'Panel',
    'SectionHeading',
    'MetricGrid',
    'MetricRow',
    'ActionGroup',
    'FormField',
    'StatusBadge',
    'RoleBadge',
  ]

  for (const primitive of requiredPrimitiveExports) {
    assert.ok(sharedUiSource.includes(`function ${primitive}`), primitive)
  }

  assert.ok(refereeConsoleSource.includes("from '../shared/ui'"))
  const cockpitSurfaceSource = [
    cockpitSource,
    cockpitShellSource,
    cockpitSidebarSource,
    agentInsightSource,
  ].join('\n')

  assert.ok(cockpitSurfaceSource.includes("from '../shared/ui'"))
  assert.ok(replayViewerSource.includes("from '../shared/ui'"))
  assert.ok(refereeConsoleSource.includes('<Panel className="panel'))
  assert.ok(refereePanelsSource.includes('<ActionGroup className="scoreboard-session-actions"'))
  assert.ok(refereePanelsSource.includes('function ScoreboardPlanTimer'))
  assert.ok(refereePanelsSource.includes("publicSession?.phase === 'submission_phase'"))
  assert.ok(refereePanelsSource.includes('data-plan-timer-state'))
  assert.ok(refereePanelsSource.includes('formatCountdown'))
  assert.ok(refereePanelsSource.includes('<SectionHeading'))
  assert.ok(cockpitSurfaceSource.includes('<Panel className="agent-live-panel cockpit-secondary-panel'))
  assert.ok(cockpitSurfaceSource.includes('StatusBadge'))
  assert.ok(replayViewerSource.includes('<ActionGroup className="replay-controls"'))
  assert.ok(replayViewerSource.includes('<FormField label="Camera">'))
  assert.ok(refereeConsoleSource.includes("import('../replay/ArenaPreviewScene')"))
  assert.ok(refereeConsoleSource.includes('const visibleArena = publicSession?.arena ?? DEFAULT_ARENA_CONFIG'))
  assert.ok(refereeConsoleSource.includes('ReplayStatusOverlay'))
  assert.ok(refereeConsoleSource.includes('replayError'))
  assert.ok(refereeConsoleSource.includes('replayLoadState'))
  assert.ok(refereeConsoleSource.indexOf('<section className="match-stage-card"') < refereeConsoleSource.indexOf('<MatchScoreboard'))
  assert.ok(arenaPreviewSceneSource.includes('createArena(scene, sceneArena)'))
  assert.ok(arenaPreviewSceneSource.includes('updateHazardsAtTime(resources.hazards, time)'))
  assert.equal(arenaPreviewSceneSource.includes('createCenterSpinner(scene)'), false)
  assert.ok(arenaPreviewSceneSource.includes('data-arena-preview-state'))
  assert.ok(refereeConsoleSource.includes('showDamageSchematic={false}'))
  assert.equal(refereeConsoleSource.includes('replayControls'), false)
  assert.equal(refereeConsoleSource.includes('proofMode={!'), false)
  assert.ok(replayViewerSource.includes('data-replay-playing'))
  assert.ok(replayViewerSource.includes('const togglePlayback = () =>'))
  assert.ok(replayViewerSource.includes('findFirstReplayActionTime'))
})

test('agent cockpit exposes submitted truth without editable draft state', () => {
  const cockpitRuntimeSource = [
    cockpitSource,
    cockpitControllerSource,
    agentInsightSource,
  ].join('\n')

  assert.ok(agentInsightSource.includes('const submission = roleState?.ownSubmission ?? null'))
  assert.ok(agentInsightSource.includes('BotAssemblyScene blueprint={blueprint} identity={teamIdentity}'))
  assert.ok(agentInsightSource.includes('DecisionReadiness'))
  assert.ok(agentInsightSource.includes('NoRoleStatePanel'))
  assert.ok(agentInsightSource.includes('No accepted plan is available yet.'))
  assert.equal(cockpitRuntimeSource.includes('hasLocalDraftEdits'), false)
  assert.equal(cockpitRuntimeSource.includes('submissionDraft'), false)
  assert.equal(cockpitRuntimeSource.includes('submitRoundPlan'), false)
})

test('replay viewer does not render future event timeline markers', () => {
  assert.ok(replayViewerSource.includes('findActiveEvent'))
  assert.equal(replayViewerSource.includes('timeline.events.map'), false)
  assert.equal(replayViewerSource.includes('key-event-list'), false)
  assert.equal(replayViewerSource.includes('event-marker'), false)
})

test('ability proof preview can render a clean canvas without replay overlays', () => {
  assert.ok(appSource.includes("import('./replay/ReplayPreview')"))
  assert.ok(replayPreviewSource.includes('proofMode={previewOptions.proofMode}'))
  assert.ok(replayViewerSource.includes('proofMode?: boolean'))
  assert.ok(replayViewerSource.includes("proofMode ? ' replay-shell-proof' : ''"))
  assert.ok(replayViewerSource.includes('immediateCamera={proofMode}'))
  assert.ok(replayViewerSource.includes('{proofMode ? null : ('))
  assert.ok(replayViewerSource.includes('replay-controls'))
  assert.ok(replayViewerSource.includes('replay-status-strip'))
  assert.ok(replayViewerSource.includes('replay-damage-schematic'))
})

test('replay camera controls expose only approved presets and normalize legacy aliases', () => {
  assert.ok(replayCameraPresetsSource.includes("['broadcast', 'red', 'blue'] as const"))
  assert.ok(replayViewerSource.includes('CAMERA_PRESET_OPTIONS.map'))
  assert.ok(replayPreviewSource.includes('normalizeCameraPreset(params.get'))
  assert.ok(replayCameraPresetsSource.includes("normalized === 'red_follow'"))
  assert.ok(replayCameraPresetsSource.includes("normalized === 'blue_follow'"))
  assert.equal(replayViewerSource.includes("value: 'wide'"), false)
  assert.equal(replayViewerSource.includes("value: 'red_follow'"), false)
  assert.equal(replayViewerSource.includes("value: 'blue_follow'"), false)
  assert.equal(replayViewerSource.includes("value: 'impact'"), false)
  assert.equal(replayViewerSource.includes("value: 'cinematic'"), false)
})

test('Babylon replay scene has render definitions for accepted replay cue kinds', () => {
  const requiredEffectKinds = [
    'weapon_fire',
    'control_net',
    'drone_swarm',
    'part_detach',
    'impact',
    'damage_marker',
    'hazard',
  ]

  for (const kind of requiredEffectKinds) {
    assert.ok(babylonReplayEffectsSource.includes(`${kind}: {`), kind)
  }

  assert.ok(babylonReplaySceneSource.includes('createEffectPool(scene)'))
  assert.ok(babylonReplaySceneSource.includes('updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)'))
  assert.ok(babylonReplayEffectsSource.includes('Object.entries(EFFECT_POOL_DEFINITIONS)'))
  assert.ok(babylonReplayEffectsSource.includes('EFFECT_POOL_DEFINITIONS[effect.kind]'))
  assert.ok(babylonReplayEffectsSource.includes('definition.update({ bots, effect, mesh, profiles })'))
})

test('Babylon renderer surfaces share lifecycle, lighting, and stats helpers', () => {
  assert.ok(babylonRendererKitSource.includes('function createBabylonRendererCore'))
  assert.ok(babylonRendererKitSource.includes('function createReplayLightingPreset'))
  assert.ok(babylonRendererKitSource.includes('function createAssemblyLightingPreset'))
  assert.ok(babylonRendererKitSource.includes('function createCaptureLightingPreset'))
  assert.ok(babylonRendererKitSource.includes('function createRendererStats'))
  assert.ok(babylonRendererKitSource.includes('function createRendererBox'))
  assert.ok(babylonRendererKitSource.includes('function disposeBabylonRendererCore'))
  assert.ok(babylonReplaySceneSource.includes('createBabylonRendererCore'))
  assert.ok(babylonReplaySceneSource.includes('createReplayLightingPreset'))
  assert.ok(babylonReplaySceneSource.includes('createRendererStats'))
  assert.ok(babylonReplaySceneSource.includes('disposeBabylonRendererCore'))
  assert.ok(botAssemblyRendererSource.includes('createBabylonRendererCore'))
  assert.ok(botAssemblyRendererSource.includes('createAssemblyLightingPreset'))
  assert.ok(botAssemblyRendererSource.includes('createRendererBox'))
  assert.ok(actualPartCaptureToolSource.includes('createBabylonRendererCore'))
  assert.ok(actualPartCaptureToolSource.includes('createCaptureLightingPreset'))
  assert.equal(babylonReplaySceneSource.includes('new Engine('), false)
  assert.equal(babylonReplaySceneSource.includes('new Scene('), false)
  assert.equal(botAssemblyRendererSource.includes('new Engine('), false)
  assert.equal(botAssemblyRendererSource.includes('new Scene('), false)
  assert.equal(actualPartCaptureToolSource.includes('new Engine('), false)
  assert.equal(actualPartCaptureToolSource.includes('new Scene('), false)
  assert.ok(babylonReplaySceneSource.includes('data-renderer-total-vertices'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-total-vertices'))
})

test('Babylon renderer exposes source-owned resource and chunk budgets', () => {
  assert.ok(babylonRendererBudgetsSource.includes('BABYLON_RENDERER_BUDGETS'))
  assert.ok(babylonRendererBudgetsSource.includes('BABYLON_RENDERER_CHUNK_GZIP_BUDGET_BYTES'))
  assert.ok(babylonRendererBudgetsSource.includes('BABYLON_RENDERER_AGGREGATE_GZIP_BUDGET_BYTES'))
  assert.ok(babylonRendererBudgetsSource.includes('function createBabylonRendererBudgetState'))
  assert.ok(babylonReplaySceneSource.includes('data-renderer-budget-state'))
  assert.ok(babylonReplaySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-state'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(rendererBudgetToolSource.includes('chunkGzipBudgetBytes = 560 * 1024'))
  assert.ok(rendererBudgetToolSource.includes('aggregateGzipBudgetBytes = 720 * 1024'))
  assert.ok(rendererBudgetToolSource.includes('totalGzipBytes'))
  assert.ok(rendererBudgetToolSource.includes('withinAggregateBudget'))
  assert.ok(rendererBudgetToolSource.includes("chunk.fileName.startsWith('babylonRendererKit-')"))
  assert.ok(rendererBudgetToolSource.includes('npm.cmd run build'))
  assert.ok(packageSource.includes('"check:renderer-budget"'))
})

test('tooling consolidates catalog AST extraction and dead-export audit paths', () => {
  assert.ok(catalogAstToolSource.includes('function extractCatalogParts'))
  assert.ok(catalogAstToolSource.includes('PART_CATALOG'))
  assert.ok(actualPartCaptureToolSource.includes('./lib/catalogAst.mjs'))
  assert.ok(actualPartCaptureToolSource.includes('extractCatalogParts(catalogPath)'))
  assert.ok(rendererBudgetToolSource.includes('dist/assets'))
  assert.ok(deadExportScannerSource.includes('localReexports'))
  assert.ok(deadExportScannerSource.includes('starReexports'))
  assert.ok(deadExportScannerSource.includes('--fail-on-candidates'))
  assert.ok(packageSource.includes('"scan:dead-exports"'))
})

test('Babylon material and part-language surfaces use PBR tokens and catalog-backed dispatch', () => {
  assert.ok(babylonSceneUtilsSource.includes('PBRMetallicRoughnessMaterial'))
  assert.ok(babylonSceneUtilsSource.includes('function createPbrSceneMaterial'))
  assert.ok(babylonMaterialsSource.includes('PBRMetallicRoughnessMaterial'))
  assert.ok(babylonMaterialsSource.includes('type CombatTeamPalette'))
  assert.ok(babylonMaterialsSource.includes('DEFAULT_TEAM_PALETTES'))
  assert.equal(babylonMaterialsSource.includes('paletteOverrides'), false)
  assert.ok(babylonMaterialsSource.includes('function createCombatTeamPalette'))
  assert.ok(babylonMaterialsSource.includes('resolveTeamAccentHex'))
  assert.ok(teamVisualsSource.includes('function createTeamAccentCssVars'))
  assert.ok(refereePanelsSource.includes('teamAccentRgb(role, identity)'))
  assert.equal(refereePanelsSource.includes('findBlueprintAccent'), false)
  assert.ok(babylonMaterialsSource.includes('function createBotMaterialSet'))
  assert.ok(babylonMaterialsSource.includes('type DamageMaterialSet'))
  assert.ok(babylonMaterialsSource.includes('function damageTierForSeverity'))
  assert.ok(babylonMaterialsSource.includes('DAMAGE_MEDIUM_THRESHOLD'))
  assert.ok(babylonMaterialsSource.includes('DAMAGE_CRITICAL_THRESHOLD'))
  assert.ok(babylonMaterialsSource.includes('createPbrSurfaceTextures'))
  assert.ok(babylonSurfaceTexturesSource.includes('type SurfacePattern'))
  assert.ok(babylonSurfaceTexturesSource.includes(" | 'arena_floor'"))
  assert.ok(babylonSurfaceTexturesSource.includes(" | 'damage_critical'"))
  assert.ok(babylonArenaSource.includes('createPbrSceneMaterial'))
  assert.ok(babylonArenaSource.includes("'arena_floor'"))
  assert.ok(babylonRendererKitSource.includes('function applyRendererEnvironment'))
  assert.ok(babylonRendererKitSource.includes('createDefaultEnvironment'))
  assert.ok(babylonWeaponPartsSource.includes('WEAPON_RENDERERS_BY_VISUAL_FAMILY'))
  assert.ok(babylonWeaponPartsSource.includes('getPart(partId)?.visual.visualFamily'))
  assert.equal(babylonWeaponPartsSource.includes('partId.includes'), false)
  assert.ok(babylonPartDetailsSource.includes('function createFastenerRow'))
  assert.ok(babylonPartDetailsSource.includes('function createVentSlats'))
  assert.ok(babylonPartDetailsSource.includes('function createPanelSeam'))
})
