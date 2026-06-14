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
const refereePacingHudSource = readSource('apps/web/src/referee/RefereePacingHud.tsx')
const refereePacingStateSource = readSource('apps/web/src/referee/refereePacingState.ts')
const refereePanelsSource = readSource('apps/web/src/referee/RefereeConsolePanels.tsx')
const refereeControllerSource = readSource('apps/web/src/referee/useRefereeConsoleController.ts')
const refereeRoundAdvanceSource = readSource('apps/web/src/referee/useRefereeRoundAdvance.ts')
const refereeRoleStatesSource = readSource('apps/web/src/referee/useRefereeRoleStates.ts')
const refereeReplayProofSource = readSource('apps/web/src/referee/refereeReplayProof.ts')
const babylonReplaySceneSource = readSource('apps/web/src/replay/scene/BabylonReplayScene.tsx')
const replayPreviewSource = readSource('apps/web/src/replay/ReplayPreview.tsx')
const replayViewerSource = readSource('apps/web/src/replay/ReplayViewer.tsx')
const mockSessionSource = readSource('apps/web/src/mockSession.ts')
const mockSessionStateSource = readSource('apps/web/src/mockSessionState.ts')
const webHeadersSource = readSource('apps/web/public/_headers')
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

  assert.ok(appSource.includes('function isArenaEmbedPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/embed'"))
  assert.ok(appSource.includes("normalized.endsWith('/embed')"))
  assert.ok(appSource.includes('<ReplayPreview defaultProof="machine" />'))

  assert.ok(appSource.includes('function isPrivacyPathname(pathname: string)'))
  assert.ok(appSource.includes("normalized === '/privacy'"))
  assert.ok(appSource.includes("normalized === '/clash-of-clankers/privacy'"))
})

test('portfolio home launches the production arena app in a desktop window', () => {
  assert.ok(appSource.includes('function shouldRenderPortfolioHome(pathname: string, hostname: string)'))
  assert.ok(appSource.includes("host === 'dorbii.github.io'"))
  assert.ok(appSource.includes("host === 'dorbii.net'"))
  assert.ok(appSource.includes("host === 'www.dorbii.net'"))
  assert.ok(appSource.includes("normalized === '/portfolio'"))
  assert.ok(appSource.includes("normalized === '/clash-of-clankers'"))
  assert.ok(appSource.includes("const ARENA_SITE_ORIGIN = 'https://arena.dorbii.net'"))
  assert.ok(appSource.includes("const ARENA_APP_SRC = `${ARENA_SITE_ORIGIN}/`"))
  assert.ok(appSource.includes('function resolveArenaAppSrc()'))
  assert.ok(appSource.includes('return `${window.location.origin}/`'))
  assert.ok(appSource.includes("return 'Dorbii Portfolio'"))
  assert.ok(appSource.includes("return 'Clash of Clankers Embed'"))
  assert.ok(appSource.includes('const [arenaWindowOpen, setArenaWindowOpen] = useState(false)'))
  assert.ok(appSource.includes('className="portfolio-desktop-icon"'))
  assert.ok(appSource.includes('setArenaWindowOpen(true)'))
  assert.ok(appSource.includes('setArenaWindowOpen(false)'))
  assert.ok(appSource.includes('className="portfolio-app-window"'))
  assert.ok(appSource.includes('src={arenaAppSrc}'))
  assert.ok(appSource.includes('title="Clash of Clankers arena"'))
})

test('arena frame routes detach global iframe deny headers before allowlisting portfolio origins', () => {
  assert.match(webHeadersSource, /^\/\r?\n  ! Content-Security-Policy/m)
  assert.ok(webHeadersSource.includes('/embed*'))
  assert.ok(webHeadersSource.includes('! Content-Security-Policy'))
  assert.ok(webHeadersSource.includes('! X-Frame-Options'))
  assert.ok(webHeadersSource.includes("frame-ancestors 'self' https://dorbii.github.io"))
  assert.ok(webHeadersSource.includes('https://dorbii.net'))
  assert.ok(webHeadersSource.includes('https://www.dorbii.net'))
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
  assert.ok(refereeCockpitStripSource.includes('pacingState.statusLine'))
  assert.equal(refereeCockpitStripSource.includes('Live observer state.'), false)
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

test('referee console exposes pacing HUD and optional auto advance gate', () => {
  assert.ok(refereeConsoleSource.includes('RefereePacingHud'))
  assert.ok(refereeConsoleSource.includes('buildRefereePacingState'))
  assert.ok(refereePacingHudSource.includes('data-active-blocker'))
  assert.ok(refereePacingHudSource.includes('data-auto-advance-ready'))
  assert.ok(refereePacingHudSource.includes('Auto advance rounds'))
  assert.ok(refereePacingStateSource.includes('Waiting for referee round advance'))
  assert.ok(refereePacingStateSource.includes('Waiting for shared debrief'))
  assert.ok(refereeControllerSource.includes('resolveRefereeAutoAdvanceGate(publicSession, roleStates)'))
  assert.ok(refereeControllerSource.includes('pollIntervalMs,'))
  assert.ok(refereeRoundAdvanceSource.includes('autoAdvanceEnabled'))
  assert.ok(refereeRoundAdvanceSource.includes('void submitRoundAdvance()'))
  assert.ok(refereeRoleStatesSource.includes('pollIntervalMs = POLL_INTERVAL_MS'))
  assert.ok(refereeRoleStatesSource.includes('window.setInterval'))
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
  assert.ok(replayPreviewSource.includes('defaultProof = null'))
  assert.ok(replayPreviewSource.includes("document.body.style.overflow = 'hidden'"))
  assert.ok(replayPreviewSource.includes("document.documentElement.style.overflow = 'hidden'"))
  assert.ok(replayPreviewSource.includes("previewOptions.proof === 'stress64'"))
  assert.ok(replayPreviewSource.includes('stress64Replay'))
  assert.ok(replayPreviewSource.includes('stress64MachineDesigns'))
  assert.ok(replayPreviewSource.includes('stress64BotBlueprints'))
  assert.ok(replayPreviewSource.includes('const botBlueprints = previewOptions.proof === \'stress64\''))
  assert.ok(replayPreviewSource.includes('botBlueprints={botBlueprints}'))
  assert.ok(replayPreviewSource.includes("const normalizedProof = proof === 'ability' || proof === 'machine' || proof === 'stress64'"))
  assert.ok(replayPreviewSource.includes('proof: normalizedProof'))
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
