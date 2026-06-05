import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
const cockpitSource = readFileSync(
  new URL('../apps/web/src/agent/LiveAgentCockpit.tsx', import.meta.url),
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
const agentChatFormsSource = readFileSync(
  new URL('../apps/web/src/agent/useAgentChatForms.ts', import.meta.url),
  'utf8',
)
const roundPlanSubmissionSource = readFileSync(
  new URL('../apps/web/src/agent/useRoundPlanSubmission.ts', import.meta.url),
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
const refereeAwardsSource = readFileSync(
  new URL('../apps/web/src/referee/useRefereeAwards.ts', import.meta.url),
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
const babylonReplayEffectsSource = readFileSync(
  new URL('../apps/web/src/replay/babylonReplayEffects.ts', import.meta.url),
  'utf8',
)

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
    refereeAwardsSource,
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
  assert.ok(refereeRuntimeSource.includes('submitRefereeAwards'))
  assert.ok(refereeRuntimeSource.includes('resetRoleClaim'))
  assert.equal(refereeRuntimeSource.includes('Create capability token'), false)
  assert.ok(refereeConsoleSource.includes('Referee capability token'))
  assert.ok(refereeRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(refereePanelsSource.includes('Wake {role} agent'))
  assert.ok(refereeRuntimeSource.includes('wake brief copied'))
  assert.ok(refereePanelsSource.includes('Refresh claim'))
  assert.ok(refereeRuntimeSource.includes('replaceInvite'))
})

test('agent cockpit renders reliability and debug hooks', () => {
  const cockpitRuntimeSource = [
    cockpitSource,
    cockpitControllerSource,
    agentRoleSessionSource,
    agentChatFormsSource,
    roundPlanSubmissionSource,
    cockpitViewStateSource,
  ].join('\n')

  assert.match(cockpitRuntimeSource, /window\.AgentArenaRole/)
  assert.ok(cockpitPanelsSource.includes('agent-empty'))
  assert.ok(cockpitSource.includes('Last validation error'))
  assert.ok(cockpitSource.includes('Match log'))
  assert.ok(cockpitSource.includes('Bot chat'))
  assert.ok(roundPlanWorkbenchSource.includes('Assembly bay'))
  assert.ok(roundPlanWorkbenchSource.includes('BotAssemblyScene'))
  assert.ok(cockpitSource.includes('Private notes'))
  assert.ok(cockpitSource.includes('agent-chat-form'))
  assert.ok(cockpitRuntimeSource.includes('submitChatMessage'))
  assert.ok(cockpitRuntimeSource.includes('submitPrivateChatMessage'))
  assert.ok(cockpitRuntimeSource.includes('privateChatLog'))
  assert.ok(cockpitSource.includes('agent-arena-state'))
  assert.ok(cockpitSource.includes('agent-arena-brief'))
  assert.ok(cockpitSource.includes('External agent brief'))
  assert.ok(cockpitRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(cockpitRuntimeSource.includes('stateVersion'))
  assert.ok(cockpitRuntimeSource.includes('claimButtonLabel'))
  assert.ok(cockpitSource.includes('Clear role token'))
})

test('agent cockpit includes structured plan editor section labels and advanced JSON mode', () => {
  const roundPlanEditorSource = [
    roundPlanWorkbenchSource,
    roundPlanStructuredEditorSource,
    roundPlanPurchaseSectionSource,
    roundPlanBlueprintSectionSource,
    roundPlanTurnPlanSectionSource,
    roundPlanRationaleSectionSource,
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
  assert.ok(babylonReplaySceneSource.includes('updateEffects(resources.effectPool, frame.effects, resources.botProfiles)'))
  assert.ok(babylonReplayEffectsSource.includes('Object.entries(EFFECT_POOL_DEFINITIONS)'))
  assert.ok(babylonReplayEffectsSource.includes('EFFECT_POOL_DEFINITIONS[effect.kind]'))
  assert.ok(babylonReplayEffectsSource.includes('definition.update({ effect, mesh, profiles })'))
})
