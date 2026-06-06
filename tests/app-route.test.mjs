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
const agentChatFormsSource = readFileSync(
  new URL('../apps/web/src/agent/useAgentChatForms.ts', import.meta.url),
  'utf8',
)
const roundPlanSubmissionSource = readFileSync(
  new URL('../apps/web/src/agent/useRoundPlanSubmission.ts', import.meta.url),
  'utf8',
)
const roundPlanDraftSource = readFileSync(
  new URL('../apps/web/src/agent/roundPlanDraft.ts', import.meta.url),
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
const roundPlanWorkbenchSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanWorkbench.tsx', import.meta.url),
  'utf8',
)
const sharedUiSource = readFileSync(
  new URL('../apps/web/src/shared/ui.tsx', import.meta.url),
  'utf8',
)
const roundPlanStructuredEditorSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanStructuredEditor.tsx', import.meta.url),
  'utf8',
)
const roundPlanPurchaseSectionSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanPurchaseSection.tsx', import.meta.url),
  'utf8',
)
const roundPlanBlueprintSectionSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanBlueprintSection.tsx', import.meta.url),
  'utf8',
)
const partSelectSource = readFileSync(
  new URL('../apps/web/src/agent/PartSelect.tsx', import.meta.url),
  'utf8',
)
const roundPlanTurnPlanSectionSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanTurnPlanSection.tsx', import.meta.url),
  'utf8',
)
const roundPlanRationaleSectionSource = readFileSync(
  new URL('../apps/web/src/agent/RoundPlanRationaleSection.tsx', import.meta.url),
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
  assert.ok(refereeConsoleSource.includes('ReplayOutcome'))
  assert.ok(refereeConsoleSource.includes('PublicChatLog'))
  assert.ok(refereeConsoleSource.includes('Fight comms'))
  assert.ok(refereeRuntimeSource.includes('advanceRound'))
  assert.ok(refereeRuntimeSource.includes('resetRoleClaim'))
  assert.equal(refereeRuntimeSource.includes('Create capability token'), false)
  assert.ok(refereeConsoleSource.includes('Referee capability token'))
  assert.ok(refereeRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(refereePanelsSource.includes('getInvitePanelMode'))
  assert.ok(refereePanelsSource.includes("panelMode === 'claimed'"))
  assert.ok(refereePanelsSource.includes('Copy handoff'))
  assert.ok(refereePanelsSource.includes('Reset agent claim'))
  assert.ok(refereeRuntimeSource.includes('handoff copied'))
  assert.ok(refereeRuntimeSource.includes('resetAgentClaim'))
  assert.equal(refereeRuntimeSource.includes(['wake', 'brief', 'copied'].join(' ')), false)
  assert.equal(refereeRuntimeSource.includes(['Refresh', 'claim'].join(' ')), false)
  assert.ok(refereeRuntimeSource.includes('replaceInvite'))
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
    agentChatFormsSource,
    roundPlanSubmissionSource,
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
  assert.ok(cockpitPanelsSource.includes('agent-empty'))
  assert.ok(cockpitPanelsSource.includes('agent-connection'))
  assert.ok(cockpitRuntimeSource.includes('Connection'))
  assert.ok(cockpitViewStateSource.includes('createAgentConnectionGuidance'))
  assert.ok(cockpitViewStateSource.includes("await window.AgentArenaRole.bootstrapRole({ agentName: '${invite.role}-agent' })"))
  assert.ok(cockpitViewStateSource.includes('waitForNextAction({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })'))
  assert.ok(cockpitViewStateSource.includes('Submit exactly one legal round plan for this round.'))
  assert.ok(cockpitRuntimeSource.includes('Last validation error'))
  assert.ok(cockpitRuntimeSource.includes('Match log'))
  assert.ok(cockpitRuntimeSource.includes('Table Talk'))
  assert.ok(roundPlanWorkbenchSource.includes('Assembly bay'))
  assert.ok(roundPlanWorkbenchSource.includes('BotAssemblyScene'))
  assert.ok(cockpitRuntimeSource.includes('Agent Journal'))
  assert.ok(cockpitRuntimeSource.includes('No hidden chain-of-thought'))
  assert.ok(agentChatFormsSource.includes('Table Talk posted.'))
  assert.ok(agentChatFormsSource.includes('Agent Journal entry saved.'))
  assert.ok(cockpitRuntimeSource.includes('agent-chat-form'))
  assert.ok(cockpitRuntimeSource.includes('submitChatMessage'))
  assert.ok(cockpitRuntimeSource.includes('submitPrivateChatMessage'))
  assert.ok(cockpitRuntimeSource.includes('privateChatLog'))
  assert.ok(cockpitRuntimeSource.includes('agent-arena-state'))
  assert.ok(cockpitRuntimeSource.includes('agent-arena-brief'))
  assert.ok(cockpitRuntimeSource.includes('External agent brief'))
  assert.ok(cockpitRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(cockpitRuntimeSource.includes('stateVersion'))
  assert.ok(cockpitRuntimeSource.includes('claimButtonLabel'))
  assert.ok(cockpitRuntimeSource.includes('Clear player key'))
})

test('agent cockpit includes structured plan editor section labels and advanced JSON mode', () => {
  const roundPlanEditorSource = [
    roundPlanWorkbenchSource,
    roundPlanStructuredEditorSource,
    roundPlanPurchaseSectionSource,
    roundPlanBlueprintSectionSource,
    roundPlanTurnPlanSectionSource,
    roundPlanRationaleSectionSource,
    partSelectSource,
  ].join('\n')

  assert.ok(cockpitSource.includes('RoundPlanWorkbench'))
  assert.ok(roundPlanWorkbenchSource.includes('RoundPlanStructuredEditor'))
  assert.ok(roundPlanEditorSource.includes('purchases-heading'))
  assert.ok(roundPlanEditorSource.includes('Purchases'))
  assert.ok(roundPlanEditorSource.includes('blueprint-heading'))
  assert.ok(roundPlanEditorSource.includes('Blueprint'))
  assert.ok(roundPlanEditorSource.includes('turn-plan-heading'))
  assert.ok(roundPlanEditorSource.includes('Turn plan commands'))
  assert.ok(roundPlanEditorSource.includes('Rationale'))
  assert.ok(roundPlanWorkbenchSource.includes('Advanced JSON mode'))
  assert.ok(roundPlanEditorSource.includes('function PartSelect'))
  assert.ok(roundPlanPurchaseSectionSource.includes('PartSelect'))
  assert.ok(roundPlanBlueprintSectionSource.includes('PartSelect'))
})

test('agent cockpit prioritizes active task workflow over secondary panels', () => {
  assert.ok(cockpitViewStateSource.includes('createAgentCockpitWorkflow'))
  assert.ok(cockpitViewStateSource.includes("'connect' | 'build' | 'submit' | 'review'"))
  assert.ok(cockpitViewStateSource.includes('Unclaimed'))
  assert.ok(cockpitViewStateSource.includes('Claimed'))
  assert.ok(cockpitViewStateSource.includes('Draft'))
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
  assert.ok(cockpitSource.indexOf('<AgentTaskPanel') < cockpitSource.indexOf('<RoundPlanWorkbench'))
  assert.ok(roundPlanWorkbenchSource.indexOf('submit-dock') < roundPlanWorkbenchSource.indexOf('assembly-bay-panel'))
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
  ].join('\n')

  assert.ok(cockpitSurfaceSource.includes("from '../shared/ui'"))
  assert.ok(replayViewerSource.includes("from '../shared/ui'"))
  assert.ok(refereeConsoleSource.includes('<Panel className="panel'))
  assert.ok(refereeConsoleSource.includes('<MetricGrid className="session-metrics">'))
  assert.ok(refereePanelsSource.includes('<SectionHeading'))
  assert.ok(cockpitSurfaceSource.includes('<Panel className="agent-live-panel cockpit-secondary-panel'))
  assert.ok(cockpitSurfaceSource.includes('<MetricGrid className="agent-facts">'))
  assert.ok(replayViewerSource.includes('<ActionGroup className="replay-controls"'))
  assert.ok(replayViewerSource.includes('<FormField label="Camera">'))
})

test('agent cockpit separates submitted truth from editable round plan draft', () => {
  assert.ok(roundPlanSubmissionSource.includes('roleState?.ownSubmission'))
  assert.ok(roundPlanSubmissionSource.includes('createEmptySubmission()'))
  assert.ok(roundPlanSubmissionSource.includes('hasLocalDraftEdits'))
  assert.ok(roundPlanSubmissionSource.includes('if (hasLocalDraftEdits)'))
  assert.ok(roundPlanDraftSource.includes('function createEmptySubmission'))
  assert.ok(roundPlanWorkbenchSource.includes('const submittedSubmission = roleState?.ownSubmission ?? null'))
  assert.ok(roundPlanWorkbenchSource.includes('const previewSubmission = submittedSubmission ?? draftSubmission'))
  assert.ok(roundPlanWorkbenchSource.includes('blueprint={previewBlueprint}'))
  assert.ok(roundPlanWorkbenchSource.includes('Submitted bot'))
  assert.ok(roundPlanWorkbenchSource.includes('Local draft'))
  assert.ok(roundPlanWorkbenchSource.includes('Sample draft'))
  assert.ok(roundPlanWorkbenchSource.includes('Draft seeded from submitted bot'))
  assert.ok(roundPlanWorkbenchSource.includes('No submitted bot or local draft blueprint loaded.'))
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
  assert.ok(babylonRendererBudgetsSource.includes('function createBabylonRendererBudgetState'))
  assert.ok(babylonReplaySceneSource.includes('data-renderer-budget-state'))
  assert.ok(babylonReplaySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-state'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(rendererBudgetToolSource.includes('chunkGzipBudgetBytes = 380 * 1024'))
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
  assert.ok(babylonArenaSource.includes('createPbrSceneMaterial'))
  assert.ok(babylonRendererKitSource.includes('function applyRendererEnvironment'))
  assert.ok(babylonRendererKitSource.includes('createDefaultEnvironment'))
  assert.ok(babylonWeaponPartsSource.includes('WEAPON_RENDERERS_BY_VISUAL_FAMILY'))
  assert.ok(babylonWeaponPartsSource.includes('getPart(partId)?.visual.visualFamily'))
  assert.equal(babylonWeaponPartsSource.includes('partId.includes'), false)
  assert.ok(babylonPartDetailsSource.includes('function createFastenerRow'))
  assert.ok(babylonPartDetailsSource.includes('function createVentSlats'))
  assert.ok(babylonPartDetailsSource.includes('function createPanelSeam'))
})
