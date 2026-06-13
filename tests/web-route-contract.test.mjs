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
const refereeCockpitStripSource = readSource('apps/web/src/referee/RefereeCockpitStrip.tsx')
const refereeConsoleSource = readSource('apps/web/src/referee/RefereeConsole.tsx')
const refereePanelsSource = readSource('apps/web/src/referee/RefereeConsolePanels.tsx')
const refereeControllerSource = readSource('apps/web/src/referee/useRefereeConsoleController.ts')
const refereeReplayProofSource = readSource('apps/web/src/referee/refereeReplayProof.ts')
const babylonReplaySceneSource = readSource('apps/web/src/replay/scene/BabylonReplayScene.tsx')
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

test('referee console keeps live combat bots visible while partial replay payloads stream', () => {
  assert.ok(refereeConsoleSource.includes('createLiveArenaStageState(displayRoleStates, displayLiveCombatFeed)'))
  assert.ok(refereeConsoleSource.includes('liveCombatTimeline={displayLiveCombatTimeline}'))
  assert.ok(refereeConsoleSource.includes('liveBots={liveArenaStage}'))
  assert.ok(refereeControllerSource.includes('useRefereeLiveCombatFeed'))
  assert.ok(refereeControllerSource.includes("enabled: publicSession?.phase === 'combat_turn'"))
  assert.ok(refereeControllerSource.includes('liveCombatTimeline'))
  assert.ok(refereeConsoleSource.includes('onLivePlaybackStatus={setLivePlaybackStatus}'))
  assert.ok(refereeCockpitStripSource.includes('formatLivePlaybackStatus'))
  assert.ok(liveArenaStageSource.includes('combat?.snapshot'))
  assert.ok(liveArenaStageSource.includes('ownLoadout'))
  assert.ok(arenaPreviewSceneSource.includes('advanceLivePlaybackBuffer'))
  assert.ok(arenaPreviewSceneSource.includes('buildLiveArenaFrame(currentLiveBots, time, currentTimeline, playbackStatus.playheadTime)'))
  assert.ok(arenaPreviewSceneSource.includes('data-live-playback-status'))
  assert.ok(arenaPreviewSceneSource.includes('createEffectPool(scene)'))
  assert.ok(arenaPreviewSceneSource.includes('updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)'))
  assert.ok(arenaPreviewSceneSource.includes('updateBots(resources.bots, frame)'))
  assert.ok(liveArenaFrameSource.includes('buildReplayFrame(liveCombatTimeline.timeline, timelineTime)'))
  assert.ok(liveArenaFrameSource.includes('function createLiveIdleMotion'))
  assert.ok(liveArenaFrameSource.includes('ReplayVisualFrame'))
})

test('referee invite links require confirmed public session state', () => {
  assert.ok(
    refereeControllerSource.includes(
      "const confirmedActiveSessionId = publicSession?.sessionId === activeSessionId ? activeSessionId : ''",
    ),
  )
  assert.ok(refereeControllerSource.includes('activeSessionId: confirmedActiveSessionId'))
  assert.ok(refereeControllerSource.includes('isSessionNotFoundError(loadError)'))
  assert.ok(refereeControllerSource.includes('setInvites([])'))
})

test('referee resolved replay starts playback when the replay payload arrives', () => {
  assert.ok(refereeConsoleSource.includes('autoPlay'))
  assert.ok(replayViewerSource.includes('autoPlay = false'))
  assert.ok(replayViewerSource.includes('data-replay-autoplay'))
  assert.ok(replayViewerSource.includes('data-replay-buffering'))
  assert.ok(replayViewerSource.includes('const playbackActive = playing && rendererReady'))
  assert.ok(replayViewerSource.includes('playing={playbackActive}'))
  assert.ok(replayViewerSource.includes('onPlaybackFrame={handlePlaybackFrame}'))
  assert.ok(replayViewerSource.includes('setPlaying(autoPlay && nextTime < compiledTimeline.duration)'))
  assert.ok(babylonReplaySceneSource.includes('MAX_REPLAY_FRAME_DELTA_SECONDS'))
  assert.ok(babylonReplaySceneSource.includes('REPLAY_SCENE_FRAME_INTERVAL_MS'))
  assert.ok(babylonReplaySceneSource.includes('REPLAY_UI_FRAME_INTERVAL_MS'))
  assert.ok(babylonReplaySceneSource.includes('const frame = buildReplayFrame(timelineRef.current'))
  assert.ok(babylonReplaySceneSource.includes('onRendererReadyRef.current?.()'))
  assert.ok(babylonReplaySceneSource.includes('pendingWarmupFrames = rendererWarmupFrames'))
  assert.ok(replayPreviewSource.includes('autoPlay={Boolean(previewOptions.proof)}'))
})

test('referee combat render waits before mounting and omits the human clock widget', () => {
  assert.ok(refereeConsoleSource.includes('FIGHT_RENDER_WARMUP_MS = 30_000'))
  assert.ok(refereeConsoleSource.includes('function useFightRenderWarmup'))
  assert.ok(refereeConsoleSource.includes('function getFightStartedAtMs'))
  assert.ok(refereeConsoleSource.includes('function isFightRenderPhase'))
  assert.ok(refereeConsoleSource.includes('localWarmupStartRef'))
  assert.ok(refereeConsoleSource.includes('forceVisible'))
  assert.ok(refereeConsoleSource.includes('showFightCockpitStage'))
  assert.ok(refereeConsoleSource.includes('showRenderedReplay'))
  assert.equal(refereeConsoleSource.includes('Preparing fight render'), false)
  assert.equal(refereePanelsSource.includes('ScoreboardPlanTimer'), false)
  assert.equal(refereePanelsSource.includes('scoreboard-plan-timer'), false)
  assert.equal(refereePanelsSource.includes('formatCountdown'), false)
})

test('referee root can render machine replay proof inside the match dashboard', () => {
  assert.ok(refereeConsoleSource.includes('resolveRefereeReplayProofMode(window.location.search)'))
  assert.ok(refereeConsoleSource.includes('displayPublicSession'))
  assert.ok(refereeConsoleSource.includes('displayReplayPayload'))
  assert.ok(refereeReplayProofSource.includes("params.get('proof') === 'machine'"))
  assert.ok(refereeReplayProofSource.includes('createRefereeReplayProof'))
  assert.ok(refereeReplayProofSource.includes('mockReplay'))
  assert.equal(refereeReplayProofSource.includes('machineProofMachineDesigns'), false)
})

test('replay preview routes stress64 proof to the capped high-density machine replay', () => {
  assert.ok(replayPreviewSource.includes("previewOptions.proof === 'stress64'"))
  assert.ok(replayPreviewSource.includes('stress64Replay'))
  assert.ok(replayPreviewSource.includes('stress64MachineDesigns'))
  assert.ok(replayPreviewSource.includes('stress64BotBlueprints'))
  assert.ok(replayPreviewSource.includes('const botBlueprints = previewOptions.proof === \'stress64\''))
  assert.ok(replayPreviewSource.includes('botBlueprints={botBlueprints}'))
  assert.ok(
    replayPreviewSource.includes("proof: proof === 'ability' || proof === 'machine' || proof === 'stress64' ? proof : null"),
  )
})

test('referee resolved replay does not restart the renderer for unchanged arena poll snapshots', () => {
  assert.ok(babylonReplaySceneSource.includes('const activeHazardsKey = arena.activeHazards.join'))
  assert.ok(babylonReplaySceneSource.includes('const sceneArena = useMemo<ArenaConfig>'))
  assert.ok(babylonReplaySceneSource.includes('[activeHazardsKey, arena.height, arena.name, arena.width]'))
  assert.equal(
    babylonReplaySceneSource.includes('}, [arena, botBlueprints, machineDesigns, teamIdentities])'),
    false,
  )
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
