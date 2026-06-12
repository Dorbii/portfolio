import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readSource(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

const appSource = readSource('apps/web/src/App.tsx')
const arenaPreviewSceneSource = readSource('apps/web/src/replay/arena/ArenaPreviewScene.tsx')
const liveArenaFrameSource = readSource('apps/web/src/replay/arena/liveArenaFrame.ts')
const liveArenaStageSource = readSource('apps/web/src/referee/liveArenaStage.ts')
const refereeConsoleSource = readSource('apps/web/src/referee/RefereeConsole.tsx')
const refereePanelsSource = readSource('apps/web/src/referee/RefereeConsolePanels.tsx')
const refereeControllerSource = readSource('apps/web/src/referee/useRefereeConsoleController.ts')
const replayPreviewSource = readSource('apps/web/src/replay/ReplayPreview.tsx')
const replayViewerSource = readSource('apps/web/src/replay/ReplayViewer.tsx')
const mockSessionSource = readSource('apps/web/src/mockSession.ts')
const mockSessionStateSource = readSource('apps/web/src/mockSessionState.ts')
const workerBootstrapSources = [
  'apps/worker/src/index.ts',
  'apps/worker/src/session.ts',
  'apps/worker/src/sessionBootstrapValidation.ts',
].map(readSource).join('\n')
const agentCockpitSource = [
  'apps/web/src/agent/LiveAgentCockpit.tsx',
  'apps/web/src/agent/AgentCockpitShell.tsx',
  'apps/web/src/agent/AgentCockpitSidebar.tsx',
  'apps/web/src/agent/AgentInsightWorkbench.tsx',
  'apps/web/src/agent/AgentCockpitPanels.tsx',
  'apps/web/src/agent/useLiveAgentCockpitController.ts',
].map(readSource).join('\n')

test('app route gates cover current web entry points', () => {
  assert.ok(appSource.includes("import('./agent/LiveAgentCockpit')"))
  assert.ok(appSource.includes("import('./replay/ReplayPreview')"))
  assert.ok(appSource.includes("import('./replay/catalog/PartCatalogPage')"))

  assert.ok(appSource.includes('function isAgentPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/agent'"))
  assert.ok(appSource.includes("normalized.endsWith('/agent')"))

  assert.ok(appSource.includes('function isPartCatalogPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/part-catalog'"))
  assert.ok(appSource.includes("normalized.endsWith('/part-catalog')"))

  assert.ok(appSource.includes('function isReplayPreviewPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/replay-preview'"))
  assert.ok(appSource.includes("normalized.endsWith('/replay-preview')"))

  assert.ok(appSource.includes('function isPrivacyPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/privacy'"))
  assert.ok(appSource.includes("normalized === '/clash-of-clankers/privacy'"))
})

test('referee console links to the current part catalog route', () => {
  assert.ok(refereePanelsSource.includes('href={partCatalogHref()}'))
  assert.ok(refereePanelsSource.includes('function partCatalogHref(): string'))
  assert.ok(refereePanelsSource.includes('`/part-catalog${window.location.search}`'))
  assert.ok(refereePanelsSource.includes('Part Catalog'))
  assert.equal(refereePanelsSource.includes('/qa/part-catalog'), false)
})

test('referee console renders live combat bots before replay payloads are available', () => {
  assert.ok(refereeConsoleSource.includes('createLiveArenaStageState(roleStates)'))
  assert.ok(refereeConsoleSource.includes('liveBots={liveArenaStage}'))
  assert.ok(liveArenaStageSource.includes('combat?.snapshot'))
  assert.ok(liveArenaStageSource.includes('ownLoadout'))
  assert.ok(arenaPreviewSceneSource.includes('buildLiveArenaFrame(currentLiveBots, time)'))
  assert.ok(arenaPreviewSceneSource.includes('updateBots(resources.bots, frame)'))
  assert.ok(liveArenaFrameSource.includes('function createLiveIdleMotion'))
  assert.ok(liveArenaFrameSource.includes('ReplayVisualFrame'))
})

test('referee resolved replay starts playback when the replay payload arrives', () => {
  assert.ok(refereeConsoleSource.includes('autoPlay'))
  assert.ok(replayViewerSource.includes('autoPlay = false'))
  assert.ok(replayViewerSource.includes('data-replay-autoplay'))
  assert.ok(replayViewerSource.includes('setPlaying(autoPlay && nextTime < timeline.duration)'))
  assert.ok(replayViewerSource.includes('MAX_REPLAY_FRAME_DELTA_SECONDS'))
  assert.ok(replayPreviewSource.includes('autoPlay={Boolean(previewOptions.proof)}'))
})

test('session completion UI omits dead save continue quit controls', () => {
  const completionSource = `${refereePanelsSource}\n${refereeControllerSource}`

  for (const staleSurface of [
    'data-can-save',
    'data-can-continue',
    'data-can-quit',
    'canSave',
    'canContinue',
    'canQuit',
    'onSave',
    'onContinue',
    'onQuit',
    'session-completion-actions',
    'Champion Record',
    'Challenger Bonus',
    'Save Status',
  ]) {
    assert.equal(completionSource.includes(staleSurface), false, staleSurface)
  }
})

test('agent cockpit stays off obsolete plan routes and editor surfaces', () => {
  for (const staleSurface of [
    '/round-plan',
    '/turn-command',
    'RoundPlanWorkbench',
    'useRoundPlanSubmission',
    'submissionDraft',
    'submitRoundPlan',
    'bot-editor',
    'agent-arena-brief',
    'externalAgentBriefScript',
    'createExternalAgentBrief',
  ]) {
    assert.equal(agentCockpitSource.includes(staleSurface), false, staleSurface)
  }
})

test('referee console omits the removed copy handoff brief control', () => {
  const refereeSource = `${refereePanelsSource}\n${refereeControllerSource}`

  for (const staleSurface of [
    'Copy handoff',
    'agentBrief',
    'onCopyBrief',
    'copyAgentBrief',
    'refereeAgentBriefs',
  ]) {
    assert.equal(refereeSource.includes(staleSurface), false, staleSurface)
  }
})

test('replay preview mocks omit stale dashboard session fixtures', () => {
  const mockSources = `${mockSessionSource}\n${mockSessionStateSource}`

  for (const staleExport of [
    'mockPublicSession',
    'mockRoleStates',
    'mockTeamEconomy',
    'TeamEconomySnapshot',
    'mockGameMasterPackets',
    'privateChatLogByRole',
  ]) {
    assert.equal(mockSources.includes(staleExport), false, staleExport)
  }

  assert.ok(mockSources.includes('mockBotBlueprints'))
  assert.ok(mockSources.includes('mockTeamIdentities'))
  assert.ok(mockSources.includes('arenaConfig'))
})

test('worker bootstrap validation uses current naming', () => {
  for (const staleName of [
    'sessionBootstrapLegacy',
    'validateLegacyAgentBootstrapRequestShape',
    'LEGACY_BOOTSTRAP_AGENT_NAME',
    'legacy-bootstrap',
  ]) {
    assert.equal(workerBootstrapSources.includes(staleName), false, staleName)
  }

  assert.ok(workerBootstrapSources.includes('sessionBootstrapValidation'))
  assert.ok(workerBootstrapSources.includes('validateAgentBootstrapPatchRequestShape'))
})
