import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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
const mockReplayTimelinesSource = readFileSync(
  new URL('../apps/web/src/mockReplayTimelines.ts', import.meta.url),
  'utf8',
)
const partCatalogPageSource = readFileSync(
  new URL('../apps/web/src/replay/catalog/PartCatalogPage.tsx', import.meta.url),
  'utf8',
)
const catalogSceneSource = readFileSync(
  new URL('../apps/web/src/replay/catalog/BabylonPartCatalogScene.tsx', import.meta.url),
  'utf8',
)
const arenaPreviewSceneSource = readFileSync(
  new URL('../apps/web/src/replay/arena/ArenaPreviewScene.tsx', import.meta.url),
  'utf8',
)
const replayCameraPresetsSource = readFileSync(
  new URL('../apps/web/src/replay/camera/presets.ts', import.meta.url),
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
const refereeCockpitStripSource = readFileSync(
  new URL('../apps/web/src/referee/RefereeCockpitStrip.tsx', import.meta.url),
  'utf8',
)
const refereeRoleStatesSource = readFileSync(
  new URL('../apps/web/src/referee/useRefereeRoleStates.ts', import.meta.url),
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
const refereeClientSource = readFileSync(
  new URL('../apps/web/src/referee/refereeClient.ts', import.meta.url),
  'utf8',
)
const replaySceneSource = readFileSync(
  new URL('../apps/web/src/replay/scene/BabylonReplayScene.tsx', import.meta.url),
  'utf8',
)
const rendererKitSource = readFileSync(
  new URL('../apps/web/src/replay/rendering/rendererKit.ts', import.meta.url),
  'utf8',
)
const rendererBudgetsSource = readFileSync(
  new URL('../apps/web/src/replay/rendering/rendererBudgets.ts', import.meta.url),
  'utf8',
)
const arenaRendererSource = readFileSync(
  new URL('../apps/web/src/replay/arena/index.ts', import.meta.url),
  'utf8',
)
const rendererMaterialsSource = readFileSync(
  new URL('../apps/web/src/replay/rendering/materials.ts', import.meta.url),
  'utf8',
)
const surfaceTexturesSource = readFileSync(
  new URL('../apps/web/src/replay/rendering/surfaceTextures.ts', import.meta.url),
  'utf8',
)
const partDetailsSource = readFileSync(
  new URL('../apps/web/src/replay/parts/details.ts', import.meta.url),
  'utf8',
)
const partMotionSource = readFileSync(
  new URL('../apps/web/src/replay/parts/motion.ts', import.meta.url),
  'utf8',
)
const partVisualProfilesSource = readFileSync(
  new URL('../apps/web/src/replay/parts/visualProfiles.ts', import.meta.url),
  'utf8',
)
const partRendererSource = readFileSync(
  new URL('../apps/web/src/replay/parts/index.ts', import.meta.url),
  'utf8',
)
const botPlaybackSource = readFileSync(
  new URL('../apps/web/src/replay/bots/playback.ts', import.meta.url),
  'utf8',
)

function readReplayPartSources(paths) {
  return paths
    .map((path) => readFileSync(new URL(`../apps/web/src/replay/parts/${path}`, import.meta.url), 'utf8'))
    .join('\n')
}
const defensePartsSource = readReplayPartSources([
  'defense/index.ts',
  'defense/specialArmorParts.ts',
])
const treadPartsSource = readReplayPartSources([
  'mobility/treadParts.ts',
  'mobility/standardTreadPart.ts',
  'mobility/tankTrackPart.ts',
  'mobility/trackGeometry.ts',
])
const utilityPartsSource = readReplayPartSources([
  'utility/index.ts',
  'utility/genericUtilityPart.ts',
  'utility/anchorClampPart.ts',
  'utility/aiModulePart.ts',
  'utility/batteryPart.ts',
  'utility/boosterPart.ts',
  'utility/droneControllerPart.ts',
  'utility/energyCorePart.ts',
  'utility/gyroStabilizerPart.ts',
  'utility/industrialUtilityParts.ts',
  'utility/magnetPart.ts',
  'utility/repairKitPart.ts',
  'utility/sensorPart.ts',
  'utility/smokePart.ts',
  'utility/utilityFrame.ts',
])
const meleeWeaponPartsSource = readReplayPartSources([
  'weapon/chainWhipWeaponPart.ts',
  'weapon/meleeWeaponParts.ts',
  'weapon/drillWeaponPart.ts',
  'weapon/flailWeaponPart.ts',
  'weapon/flipperWeaponPart.ts',
  'weapon/grabberWeaponPart.ts',
  'weapon/hammerWeaponPart.ts',
  'weapon/ramWeaponPart.ts',
  'weapon/spearWeaponPart.ts',
])
const replayEffectsSource = readFileSync(
  new URL('../apps/web/src/replay/effects/replayEffects.ts', import.meta.url),
  'utf8',
)
const sceneUtilsSource = readFileSync(
  new URL('../apps/web/src/replay/rendering/sceneUtils.ts', import.meta.url),
  'utf8',
)
const weaponPartsSource = readFileSync(
  new URL('../apps/web/src/replay/parts/weapon/index.ts', import.meta.url),
  'utf8',
)
const spinnerWeaponPartSource = readFileSync(
  new URL('../apps/web/src/replay/parts/weapon/spinnerWeaponPart.ts', import.meta.url),
  'utf8',
)
const shredderWeaponPartSource = readFileSync(
  new URL('../apps/web/src/replay/parts/weapon/shredderWeaponPart.ts', import.meta.url),
  'utf8',
)
const turretWeaponPartSource = readFileSync(
  new URL('../apps/web/src/replay/parts/weapon/turretWeaponPart.ts', import.meta.url),
  'utf8',
)
const netWeaponPartSource = readFileSync(
  new URL('../apps/web/src/replay/parts/weapon/netWeaponPart.ts', import.meta.url),
  'utf8',
)
const wheelPartsSource = readReplayPartSources([
  'mobility/wheelParts.ts',
  'mobility/omniWheelPart.ts',
  'mobility/mecanumWheelPart.ts',
  'mobility/spikedWheelPart.ts',
  'mobility/wheelGeometry.ts',
])
const stylePartsSource = readReplayPartSources([
  'style/index.ts',
  'style/accessoryParts.ts',
  'style/crownPart.ts',
  'style/dragonHeadPart.ts',
  'style/flagPart.ts',
  'style/plateGeometry.ts',
  'style/wingAssemblyPart.ts',
])
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
const schemaTypesSource = readFileSync(new URL('../packages/schemas/src/types.ts', import.meta.url), 'utf8')
const catalogIndexSource = readFileSync(new URL('../packages/catalog/src/index.ts', import.meta.url), 'utf8')
const catalogPartsSource = readFileSync(new URL('../packages/catalog/src/parts.ts', import.meta.url), 'utf8')
const visualReferencesSource = readFileSync(
  new URL('../packages/catalog/src/visualReferences.ts', import.meta.url),
  'utf8',
)

function functionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`)
  const next = source.indexOf('\nfunction ', start + 1)
  assert.notEqual(start, -1)
  return next === -1 ? source.slice(start) : source.slice(start, next)
}

function sourceFilesUnder(relativeRoot) {
  const root = new URL(`../${relativeRoot}/`, import.meta.url)
  const files = []

  function visit(directoryUrl) {
    for (const entry of readdirSync(directoryUrl, { withFileTypes: true })) {
      const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl)

      if (entry.isDirectory()) {
        visit(childUrl)
      } else if (/\.(mjs|ts|tsx)$/.test(entry.name)) {
        files.push(childUrl)
      }
    }
  }

  visit(root)

  return files
}

test('app keeps a dedicated /agent route gate tolerant of nested paths', () => {
  assert.match(appSource, /function isAgentPathname\(/)
  assert.match(appSource, /const normalized = pathname\.replace\(/)
  assert.match(appSource, /normalized === '\/agent'/)
  assert.match(appSource, /normalized\.endsWith\('\/agent'\)/)
})

test('app exposes a first-class part catalog route from the main console', () => {
  assert.ok(appSource.includes("import('./replay/catalog/PartCatalogPage')"))
  assert.match(appSource, /function isPartCatalogPathname\(/)
  assert.match(appSource, /normalized === '\/part-catalog'/)
  assert.match(appSource, /normalized\.endsWith\('\/part-catalog'\)/)
  assert.equal(appSource.includes('/qa/part-catalog'), false)
  assert.ok(refereePanelsSource.includes('href={partCatalogHref()}'))
  assert.ok(refereePanelsSource.includes('`/part-catalog${window.location.search}`'))
  assert.ok(refereePanelsSource.includes('Part Catalog'))
  assert.ok(partCatalogPageSource.includes('PART_CATALOG'))
  assert.ok(partCatalogPageSource.includes('buildPartCatalogDisplay'))
  assert.ok(partCatalogPageSource.includes('part-catalog-back'))
  assert.ok(partCatalogPageSource.includes('BabylonPartCatalogScene'))
  assert.ok(partCatalogPageSource.includes("'Wheel_Omni'"))
  assert.ok(partCatalogPageSource.includes('Part catalog'))
  assert.ok(catalogSceneSource.includes('createCatalogPartNode'))
  assert.ok(catalogSceneSource.includes('BABYLON_RENDERER_BUDGETS.partCatalog'))
  assert.ok(catalogSceneSource.includes('damageMaterialForRoleAndSeverity'))
  assert.ok(catalogSceneSource.includes('resolvePreviewMaterialRole'))
})

test('part catalog UI stays source-driven through shared display helpers', () => {
  assert.ok(partCatalogPageSource.includes('PART_CATALOG'))
  assert.ok(partCatalogPageSource.includes('getPart('))
  assert.ok(partCatalogPageSource.includes('buildPartCatalogDisplay(selectedPart)'))
  assert.ok(partCatalogPageSource.includes('selectedPartDisplay.summaryRows.map'))
  assert.ok(partCatalogPageSource.includes('selectedPartDisplay.sections.map'))
  assert.ok(partCatalogPageSource.includes('section.rows.map'))
  assert.ok(partCatalogPageSource.includes('part-catalog-back'))
  assert.equal(partCatalogPageSource.includes('JSON.stringify'), false)
  assert.equal(partCatalogPageSource.includes('mechanicalParams'), false)
  assert.equal(partCatalogPageSource.includes('catalogMetadata'), false)
  assert.equal(partCatalogPageSource.includes('metadataTable'), false)
  assert.ok(catalogSceneSource.includes('damageMaterialForRoleAndSeverity'))
  assert.ok(catalogSceneSource.includes('DAMAGE_PREVIEW_SEVERITY'))
  assert.ok(catalogSceneSource.includes('light: 0.35'))
  assert.ok(catalogSceneSource.includes('medium: 0.68'))
  assert.ok(catalogSceneSource.includes('critical: 1'))
})

test('runtime source does not import ignored local part references', () => {
  const localDocsImportPattern = /\b(?:import[\s\S]{0,240}\bfrom\s*|import\s*\(|require\s*\()\s*['"][^'"]*local_docs/

  for (const sourceFile of [
    ...sourceFilesUnder('apps'),
    ...sourceFilesUnder('packages'),
  ]) {
    const source = readFileSync(sourceFile, 'utf8')

    assert.equal(
      localDocsImportPattern.test(source),
      false,
      `${sourceFile.pathname} must not import local_docs`,
    )
  }

  assert.ok(visualReferencesSource.includes('local_docs/part_references/'))
  assert.equal(visualReferencesSource.includes('readFile'), false)
  assert.equal(visualReferencesSource.includes('existsSync'), false)
  assert.equal(visualReferencesSource.includes('readdirSync'), false)
})

test('root console is wired to live referee session helpers', () => {
  const refereeConsoleFunctionSource = functionSource(refereeConsoleSource, 'RefereeConsole')
  const refereeRuntimeSource = [
    refereeConsoleSource,
    refereeConsoleControllerSource,
    refereeReplayPayloadSource,
    refereeRoundAdvanceSource,
    refereeAgentBriefsSource,
    refereeClientSource,
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
  assert.equal(refereeRuntimeSource.includes('saveCompletedSession'), false)
  assert.equal(refereeRuntimeSource.includes('continueChampionSession'), false)
  assert.equal(refereeRuntimeSource.includes('quitCompletedSession'), false)
  assert.equal(refereeClientSource.includes('/save'), false)
  assert.equal(refereeClientSource.includes('/continue'), false)
  assert.equal(refereeClientSource.includes('/quit'), false)
  assert.equal(refereeRuntimeSource.includes('Create capability token'), false)
  assert.equal(refereeConsoleSource.includes('Referee capability token'), false)
  assert.ok(refereeRuntimeSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(refereeConsoleSource.includes('roleHandoffs'))
  assert.ok(refereeConsoleSource.includes('sessionControl'))
  assert.ok(refereeConsoleSource.includes("publicSession?.phase === 'session_complete'"))
  assert.ok(refereeConsoleSource.includes('shouldShowSessionCompletion'))
  assert.ok(refereeConsoleSource.includes('Session end'))
  assert.ok(refereePanelsSource.includes('scoreboard-session-actions'))
  assert.ok(refereePanelsSource.includes('SessionCompletionPanel'))
  assert.ok(refereePanelsSource.includes('data-has-shared-debrief'))
  assert.ok(refereePanelsSource.includes('Completed Fights'))
  assert.ok(refereePanelsSource.includes('Shared Debrief'))
  assert.ok(refereePanelsSource.includes('data-can-save'))
  assert.ok(refereePanelsSource.includes('data-can-continue'))
  assert.ok(refereePanelsSource.includes('data-can-quit'))
  assert.ok(refereePanelsSource.includes('Champion Record'))
  assert.ok(refereePanelsSource.includes('Challenger Bonus'))
  assert.ok(refereePanelsSource.includes('Save Status'))
  assert.ok(refereePanelsSource.includes('session-completion-actions'))
  assert.ok(refereeConsoleControllerSource.includes('canSave'))
  assert.ok(refereeConsoleControllerSource.includes('canContinue'))
  assert.ok(refereeConsoleControllerSource.includes('canQuit'))
  assert.equal(refereeConsoleControllerSource.includes('submitSaveCompletedSession'), false)
  assert.equal(refereeConsoleControllerSource.includes('submitContinueChampionSession'), false)
  assert.equal(refereeConsoleControllerSource.includes('submitQuitCompletedSession'), false)
  assert.equal(refereeConsoleSource.includes('Champion Loop'), false)
  assert.ok(refereeConsoleSource.includes('Shared Debrief'))
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
  assert.ok(refereePanelsSource.includes('href={partCatalogHref()}'))
  assert.ok(refereePanelsSource.includes('window.location.search'))
  assert.ok(partCatalogPageSource.includes('REFEREE_ROUTE_PARAMS'))
  assert.ok(partCatalogPageSource.includes('buildRefereeBackHref'))
  assert.ok(partCatalogPageSource.includes('href={refereeBackHref}'))
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
  assert.ok(agentRoleApiInstallerSource.includes('waitForGameMasterPacket: async'))
  assert.ok(agentRolePollingSource.includes('startAgentRoleStatePolling'))
  assert.ok(cockpitRuntimeSource.includes('agent-empty'))
  assert.ok(cockpitPanelsSource.includes('agent-connection'))
  assert.ok(cockpitRuntimeSource.includes('Connection'))
  assert.ok(cockpitViewStateSource.includes('createAgentConnectionGuidance'))
  assert.ok(cockpitViewStateSource.includes('await window.AgentArenaRole.bootstrapRole({'))
  assert.ok(cockpitViewStateSource.includes('getTeamIdentityFromYourAgentState'))
  assert.equal(cockpitViewStateSource.includes('const teamIdentity = {'), false)
  assert.ok(cockpitViewStateSource.includes('waitForGameMasterPacket({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })'))
  assert.ok(cockpitViewStateSource.includes('Inspect gameMaster.legalActions parameterSchema'))
  assert.ok(cockpitViewStateSource.includes('packet.blockedActions'))
  assert.ok(cockpitViewStateSource.includes('parameters only when that action asks for them'))
  assert.ok(cockpitViewStateSource.includes('submitAction({'))
  assert.ok(cockpitViewStateSource.includes('submit_game_action'))
  assert.ok(cockpitRuntimeSource.includes('Public Chat'))
  assert.ok(agentInsightSource.includes('Assembly bay'))
  assert.ok(agentInsightSource.includes('BotAssemblyScene'))
  assert.ok(botAssemblySceneSource.includes('const blueprintRef = useRef(blueprint)'))
  assert.ok(botAssemblySceneSource.includes('attachBlueprint('))
  assert.ok(botAssemblySceneSource.includes('initialMachineDesign'))
  assert.ok(botAssemblySceneSource.includes("data-assembly-visual-authority={machineDesign ? 'machine:v1' : 'legacy-bot-blueprint'}"))
  assert.ok(botAssemblyAnimationSource.includes('createBotNode(resources.scene, blueprint, role, resources.materials, machineDesign)'))
  assert.ok(botAssemblySceneSource.includes('data-assembly-bot-attached'))
  assert.ok(botAssemblyRendererSource.includes('createBotMaterialSet'))
  assert.ok(botAssemblyAnimationSource.includes('resources.materials'))
  assert.equal(botAssemblyAnimationSource.includes('createTeamMaterials'), false)
  assert.ok(cockpitRuntimeSource.includes('Private Reflection'))
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
  assert.ok(agentInsightSource.includes('Loadout read'))
  assert.ok(agentInsightSource.includes('Combat decision'))
  assert.ok(agentInsightSource.includes('NoRoleStatePanel'))
  assert.ok(agentInsightSource.includes('roleState?.ownLoadout'))
  assert.ok(agentInsightSource.includes('tacticalCues'))
  assert.ok(agentInsightSource.includes('Legal actions'))
  assert.ok(agentInsightSource.includes('gameMaster?.legalActions'))
  assert.ok(agentInsightSource.includes('inspect parameterSchema and include parameters'))
  assert.ok(agentInsightSource.includes('Machine legality'))
  assert.ok(agentInsightSource.includes('validation, shop, and budget rules'))
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
  assert.equal(refereePanelsSource.includes('function ScoreboardPlanTimer'), false)
  assert.equal(refereePanelsSource.includes('data-plan-timer-state'), false)
  assert.equal(refereePanelsSource.includes('formatCountdown'), false)
  assert.ok(refereePanelsSource.includes('<SectionHeading'))
  assert.ok(cockpitSurfaceSource.includes('<Panel className="agent-live-panel cockpit-secondary-panel'))
  assert.ok(cockpitSurfaceSource.includes('StatusBadge'))
  assert.ok(replayViewerSource.includes('<ActionGroup className="replay-controls"'))
  assert.ok(replayViewerSource.includes('<FormField label="Camera">'))
  assert.ok(refereeConsoleSource.includes("import('../replay/arena/ArenaPreviewScene')"))
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

  assert.ok(agentInsightSource.includes('const loadout = roleState?.ownLoadout ?? null'))
  assert.ok(agentInsightSource.includes('BotAssemblyScene'))
  assert.ok(agentInsightSource.includes('blueprint={blueprint}'))
  assert.ok(agentInsightSource.includes('identity={teamIdentity}'))
  assert.ok(agentInsightSource.includes('machineDesign={loadout.machineDesign}'))
  assert.ok(cockpitSource.includes('createTeamAccentCssVars(invite.role, cockpit.roleState?.identity)'))
  assert.ok(botAssemblySceneSource.includes('data-assembly-team-color={identity.primaryColor}'))
  assert.ok(botAssemblyRendererSource.includes('createCombatTeamPalette(role, identity)'))
  assert.ok(refereePanelsSource.includes('style={getScoreboardAccentStyle(team.accentRgb)}'))
  assert.ok(refereePanelsSource.includes('teamAccentRgb(role, identity)'))
  assert.ok(agentInsightSource.includes('DecisionReadiness'))
  assert.ok(agentInsightSource.includes('NoRoleStatePanel'))
  assert.ok(agentInsightSource.includes('No confirmed loadout is available yet.'))
  assert.equal(cockpitRuntimeSource.includes('agent-identity-editor'), false)
  assert.equal(cockpitRuntimeSource.includes('setTeamName'), false)
  assert.equal(cockpitRuntimeSource.includes('setLogoMark'), false)
  assert.equal(cockpitRuntimeSource.includes('hasLocalDraftEdits'), false)
  assert.equal(cockpitRuntimeSource.includes('submissionDraft'), false)
  assert.equal(cockpitRuntimeSource.includes('submitRoundPlan'), false)
  assert.equal(cockpitRuntimeSource.includes('submitTurnCommand'), false)
  assert.equal(cockpitRuntimeSource.includes('movementOptions.recommended'), false)
  assert.equal(cockpitRuntimeSource.includes('/round-plan'), false)
  assert.equal(cockpitRuntimeSource.includes('/turn-command'), false)
})

test('referee dashboard embeds observer cockpits with machine-authority garage renders', () => {
  assert.ok(refereeConsoleSource.includes('RefereeCockpitStrip'))
  assert.ok(refereeConsoleControllerSource.includes('useRefereeRoleStates'))
  assert.ok(refereeConsoleControllerSource.includes('roleStates'))
  assert.ok(refereeRoleStatesSource.includes('invite.observerToken'))
  assert.ok(refereeRoleStatesSource.includes('loadRoleState(apiBase, activeSessionId, invite.observerToken)'))
  assert.ok(refereeCockpitStripSource.includes('Garage and Combat Decisions'))
  assert.ok(refereeCockpitStripSource.includes('BotAssemblyScene'))
  assert.ok(refereeCockpitStripSource.includes('machineDesign={loadout.machineDesign}'))
  assert.ok(refereeCockpitStripSource.includes('roleState?.combat?.decision'))
  assert.equal(refereeCockpitStripSource.includes('AgentTaskPanel'), false)
})

test('replay viewer does not render future event timeline markers', () => {
  assert.ok(replayViewerSource.includes('findActiveEvent'))
  assert.equal(replayViewerSource.includes('timeline.events.map'), false)
  assert.equal(replayViewerSource.includes('key-event-list'), false)
  assert.equal(replayViewerSource.includes('event-marker'), false)
})

test('ability proof preview can render a clean canvas without replay overlays', () => {
  assert.ok(appSource.includes("import('./replay/ReplayPreview')"))
  assert.ok(replayPreviewSource.includes("previewOptions.proof === 'ability'"))
  assert.ok(replayPreviewSource.includes("previewOptions.proof === 'machine'"))
  assert.ok(replayPreviewSource.includes('machineDesigns={machineDesigns}'))
  assert.ok(replayPreviewSource.includes('proofMode={Boolean(previewOptions.proof)}'))
  assert.ok(replayViewerSource.includes('proofMode?: boolean'))
  assert.ok(replayViewerSource.includes("proofMode ? ' replay-shell-proof' : ''"))
  assert.ok(replayViewerSource.includes('immediateCamera={proofMode}'))
  assert.ok(replayViewerSource.includes('{proofMode ? null : ('))
  assert.ok(replayViewerSource.includes('replay-controls'))
  assert.ok(replayViewerSource.includes('replay-status-strip'))
  assert.ok(replayViewerSource.includes('replay-damage-schematic'))
})

test('machine proof preview requires red and blue machine-native fixtures', () => {
  const fixtureStart = mockReplayTimelinesSource.indexOf(
    'export const machineProofMachineDesigns: Record<TeamRole, MachineDesign>',
  )
  const fixtureEnd = mockReplayTimelinesSource.indexOf(
    'export const machineProofReplay',
    fixtureStart,
  )
  const fixtureSource = mockReplayTimelinesSource.slice(fixtureStart, fixtureEnd)

  assert.ok(fixtureStart >= 0)
  assert.ok(fixtureEnd > fixtureStart)
  assert.ok(fixtureSource.includes('red: {'))
  assert.ok(fixtureSource.includes('blue: {'))
  assert.ok(fixtureSource.includes('blue-core'))
  assert.ok(fixtureSource.includes('catalog:Weapon_Turret'))
  assert.ok(replayPreviewSource.includes('machineDesigns={machineDesigns}'))
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
    assert.ok(replayEffectsSource.includes(`${kind}: {`), kind)
  }
  assert.ok(replaySceneSource.includes('createEffectPool(scene)'))
  assert.ok(replaySceneSource.includes('updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)'))
  assert.ok(replayEffectsSource.includes('Object.entries(EFFECT_POOL_DEFINITIONS)'))
  assert.ok(replayEffectsSource.includes('EFFECT_POOL_DEFINITIONS[effect.kind]'))
  assert.ok(replayEffectsSource.includes('definition.update({ bots, effect, mesh, profiles })'))
})

test('Babylon renderer surfaces share lifecycle, lighting, and stats helpers', () => {
  assert.ok(rendererKitSource.includes('function createBabylonRendererCore'))
  assert.ok(rendererKitSource.includes('function createReplayLightingPreset'))
  assert.ok(rendererKitSource.includes('function createAssemblyLightingPreset'))
  assert.ok(rendererKitSource.includes('function createCaptureLightingPreset'))
  assert.ok(rendererKitSource.includes('function createRendererStats'))
  assert.ok(rendererKitSource.includes('function createRendererBox'))
  assert.ok(rendererKitSource.includes('function disposeBabylonRendererCore'))
  assert.ok(replaySceneSource.includes('createBabylonRendererCore'))
  assert.ok(replaySceneSource.includes('createReplayLightingPreset'))
  assert.ok(replaySceneSource.includes('createRendererStats'))
  assert.ok(replaySceneSource.includes('disposeBabylonRendererCore'))
  assert.ok(catalogSceneSource.includes('createBabylonRendererCore'))
  assert.ok(catalogSceneSource.includes('createCaptureLightingPreset'))
  assert.ok(catalogSceneSource.includes('createRendererStats'))
  assert.ok(catalogSceneSource.includes('disposeBabylonRendererCore'))
  assert.ok(botAssemblyRendererSource.includes('createBabylonRendererCore'))
  assert.ok(botAssemblyRendererSource.includes('createAssemblyLightingPreset'))
  assert.ok(botAssemblyRendererSource.includes('createRendererBox'))
  assert.ok(actualPartCaptureToolSource.includes('createBabylonRendererCore'))
  assert.ok(actualPartCaptureToolSource.includes('createCaptureLightingPreset'))
  assert.equal(replaySceneSource.includes('new Engine('), false)
  assert.equal(replaySceneSource.includes('new Scene('), false)
  assert.equal(catalogSceneSource.includes('new Engine('), false)
  assert.equal(catalogSceneSource.includes('new Scene('), false)
  assert.equal(botAssemblyRendererSource.includes('new Engine('), false)
  assert.equal(botAssemblyRendererSource.includes('new Scene('), false)
  assert.equal(actualPartCaptureToolSource.includes('new Engine('), false)
  assert.equal(actualPartCaptureToolSource.includes('new Scene('), false)
  assert.ok(replaySceneSource.includes('data-renderer-total-vertices'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-total-vertices'))
})

test('Babylon renderer exposes source-owned resource and chunk budgets', () => {
  assert.ok(rendererBudgetsSource.includes('BABYLON_RENDERER_BUDGETS'))
  assert.ok(rendererBudgetsSource.includes('BABYLON_RENDERER_CHUNK_GZIP_BUDGET_BYTES'))
  assert.ok(rendererBudgetsSource.includes('BABYLON_RENDERER_AGGREGATE_GZIP_BUDGET_BYTES'))
  assert.ok(rendererBudgetsSource.includes('partCatalog'))
  assert.ok(rendererBudgetsSource.includes('function createBabylonRendererBudgetState'))
  assert.ok(replaySceneSource.includes('data-renderer-budget-state'))
  assert.ok(replaySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(catalogSceneSource.includes('data-renderer-budget-state'))
  assert.ok(catalogSceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-state'))
  assert.ok(botAssemblySceneSource.includes('data-renderer-budget-total-vertices'))
  assert.ok(rendererBudgetToolSource.includes('chunkGzipBudgetBytes = 560 * 1024'))
  assert.ok(rendererBudgetToolSource.includes('aggregateGzipBudgetBytes = 720 * 1024'))
  assert.ok(rendererBudgetToolSource.includes('totalGzipBytes'))
  assert.ok(rendererBudgetToolSource.includes('withinAggregateBudget'))
  assert.ok(rendererBudgetToolSource.includes('rendererChunkFilePrefixes'))
  assert.ok(rendererBudgetToolSource.includes("'rendererKit-'"))
  assert.ok(rendererBudgetToolSource.includes('rendererChunkSourceMarkers'))
  assert.ok(rendererBudgetToolSource.includes('npm.cmd run build'))
  assert.ok(packageSource.includes('"check:renderer-budget"'))
})

test('Babylon part renderers are organized by part category', () => {
  for (const legacyPartFile of [
    'babylonBodyParts.ts',
    'babylonDefaultWeaponPart.ts',
    'babylonDefenseParts.ts',
    'babylonMeleeWeaponParts.ts',
    'babylonMobilityPartTypes.ts',
    'babylonMobilityParts.ts',
    'babylonNetWeaponPart.ts',
    'babylonPartVisuals.ts',
    'babylonSpecialMobilityParts.ts',
    'babylonSpinnerWeaponPart.ts',
    'babylonStyleParts.ts',
    'babylonTreadParts.ts',
    'babylonTurretWeaponPart.ts',
    'babylonUtilityParts.ts',
    'babylonWeaponPartTypes.ts',
    'babylonWeaponParts.ts',
    'babylonWheelParts.ts',
  ]) {
    assert.equal(
      existsSync(new URL(`../apps/web/src/replay/${legacyPartFile}`, import.meta.url)),
      false,
      `${legacyPartFile} should live under apps/web/src/replay/parts`,
    )
  }
  assert.ok(partRendererSource.includes("from './body'"))
  assert.ok(partRendererSource.includes("from './defense'"))
  assert.ok(partRendererSource.includes("from './mobility'"))
  assert.ok(partRendererSource.includes("from './style'"))
  assert.ok(partRendererSource.includes("from './utility'"))
  assert.ok(partRendererSource.includes("from './weapon'"))
  for (const partOwnedModule of [
    'body/rectangleLongPart.ts',
    'body/lightFramePart.ts',
    'body/techDetails.ts',
    'defense/cageArmorPart.ts',
    'defense/reactiveArmorPart.ts',
    'defense/specialArmorParts.ts',
    'mobility/mecanumWheelPart.ts',
    'mobility/omniWheelPart.ts',
    'mobility/tankTrackPart.ts',
    'mobility/trackGeometry.ts',
    'style/dragonHeadPart.ts',
    'style/accessoryParts.ts',
    'style/plateGeometry.ts',
    'utility/boosterPart.ts',
    'utility/industrialUtilityParts.ts',
    'utility/repairKitPart.ts',
    'utility/utilityFrame.ts',
    'weapon/chainWhipWeaponPart.ts',
    'weapon/drillWeaponPart.ts',
    'weapon/flailWeaponPart.ts',
    'weapon/hammerWeaponPart.ts',
  ]) {
    assert.equal(
      existsSync(new URL(`../apps/web/src/replay/parts/${partOwnedModule}`, import.meta.url)),
      true,
      `${partOwnedModule} should own its renderer instead of hiding in a category monolith`,
    )
  }
})

test('shared part visual profile foundation is catalog-backed', () => {
  for (const fieldName of [
    'renderProfile',
    'textureProfile',
    'damageProfile',
    'animationProfile',
    'referenceIds',
    'qualityStatus',
  ]) {
    assert.ok(schemaTypesSource.includes(fieldName), `schema visual descriptor should expose ${fieldName}`)
    assert.ok(catalogPartsSource.includes(fieldName), `catalog inference should populate ${fieldName}`)
  }

  assert.ok(catalogIndexSource.includes("export * from './visualReferences.js'"))
  assert.ok(catalogPartsSource.includes('function completeVisualDescriptor'))
  assert.ok(catalogPartsSource.includes('PART_VISUAL_REFERENCE_IDS'))
  assert.ok(visualReferencesSource.includes('export const PART_VISUAL_REFERENCES'))
  assert.ok(visualReferencesSource.includes('approvedForRuntimeAsset: false'))

  for (const profileId of [
    'painted_chipped_armor',
    'brushed_weapon_steel',
    'scuffed_rubber',
    'dirty_electrical_casing',
    'emissive_led_glass',
    'burnt_critical_metal',
    'scraped_style_shell',
  ]) {
    assert.ok(partVisualProfilesSource.includes(profileId), `profile resolver missing ${profileId}`)
    assert.ok(rendererMaterialsSource.includes(profileId), `materials missing ${profileId}`)
    assert.ok(surfaceTexturesSource.includes(profileId), `surface textures missing ${profileId}`)
  }

  assert.ok(partVisualProfilesSource.includes('function resolvePartVisualProfile'))
  assert.ok(partVisualProfilesSource.includes('function resolvePartTextureProfile'))
  assert.ok(partVisualProfilesSource.includes('function resolvePartDamageProfile'))
  assert.ok(partRendererSource.includes('resolvePartVisualProfile'))
  assert.ok(partRendererSource.includes('materialForTextureProfile'))
  assert.ok(partRendererSource.includes('visualProfile'))
  assert.ok(partRendererSource.includes('roleMaterialNames'))
})

test('Babylon render scenes and helpers are organized by ownership folder', () => {
  for (const legacyRendererFile of [
    'ArenaPreviewScene.tsx',
    'BabylonPartCatalogScene.tsx',
    'BabylonReplayScene.tsx',
    'PartCatalogPreview.tsx',
    'babylonAbilityEffects.ts',
    'babylonArena.ts',
    'babylonArenaDecor.ts',
    'babylonArenaFloor.ts',
    'babylonArenaMarkings.ts',
    'babylonArenaPerimeter.ts',
    'babylonArenaStructures.ts',
    'babylonBladeGeometry.ts',
    'babylonBotFoundation.ts',
    'babylonBotGeometry.ts',
    'babylonBotPlayback.ts',
    'babylonEffectPalette.ts',
    'babylonGenericReplayEffects.ts',
    'babylonHazards.ts',
    'babylonMaterials.ts',
    'babylonMeshHelpers.ts',
    'babylonPartDetails.ts',
    'babylonPartMotion.ts',
    'babylonPartRenderer.ts',
    'babylonRendererBudgets.ts',
    'babylonRendererKit.ts',
    'babylonReplayCamera.ts',
    'babylonReplayEffectTypes.ts',
    'babylonReplayEffects.ts',
    'babylonSceneUtils.ts',
    'babylonSurfaceTextures.ts',
    'replayCameraFraming.ts',
    'replayCameraPresets.ts',
    'replayEffectMapping.ts',
  ]) {
    assert.equal(
      existsSync(new URL(`../apps/web/src/replay/${legacyRendererFile}`, import.meta.url)),
      false,
      `${legacyRendererFile} should live under an ownership folder in apps/web/src/replay`,
    )
  }
  assert.ok(replayViewerSource.includes("from './scene/BabylonReplayScene'"))
  assert.ok(replaySceneSource.includes("from '../arena'"))
  assert.ok(replaySceneSource.includes("from '../effects/replayEffects'"))
  assert.ok(catalogSceneSource.includes("from '../parts'"))
  assert.ok(catalogSceneSource.includes("from '../rendering/rendererKit'"))
  assert.ok(arenaPreviewSceneSource.includes("from '../rendering/rendererKit'"))
  assert.ok(botAssemblyRendererSource.includes("../replay/rendering/rendererKit"))
  assert.ok(actualPartCaptureToolSource.includes('./replay/parts'))
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

test('actual part render capture emits nested clean and damage-state images', () => {
  assert.ok(actualPartCaptureToolSource.includes("const damageStates = ['clean', 'light', 'medium', 'critical']"))
  assert.ok(actualPartCaptureToolSource.includes("type CaptureDamageState = 'clean' | 'critical' | 'light' | 'medium'"))
  assert.ok(actualPartCaptureToolSource.includes("const DAMAGE_STATES: CaptureDamageState[] = ['clean', 'light', 'medium', 'critical']"))
  assert.ok(actualPartCaptureToolSource.includes('const partImageDir = path.join(imageDir, part.id)'))
  assert.ok(actualPartCaptureToolSource.includes('const outputPath = path.join(partImageDir, `${damageState}.png`)'))
  assert.equal(actualPartCaptureToolSource.includes('path.join(imageDir, `${part.id}.png`)'), false)
  assert.ok(actualPartCaptureToolSource.includes('part-renders/${part.id}/${state}.png'))
  assert.ok(actualPartCaptureToolSource.includes('damage=${damageState}'))
})

test('actual part render capture harness uses role-aware damage materials', () => {
  assert.ok(actualPartCaptureToolSource.includes('damageMaterialForRoleAndSeverity'))
  assert.ok(actualPartCaptureToolSource.includes('isBotPartChildMaterialRole'))
  assert.ok(actualPartCaptureToolSource.includes('applyCaptureDamagePreview(bot, damageState)'))
  assert.ok(actualPartCaptureToolSource.includes("if (damageState === 'clean')"))
  assert.ok(actualPartCaptureToolSource.includes('resolveCaptureMaterialRole(mesh, metadata)'))
  assert.ok(actualPartCaptureToolSource.includes('metadata.damageMaterials'))
  assert.ok(actualPartCaptureToolSource.includes('metadata.roleMaterialNames'))
  assert.ok(actualPartCaptureToolSource.includes('metadata.visualProfile.damageProfile'))
  assert.ok(actualPartCaptureToolSource.includes("if (damageProfile === 'scuffed_rubber') return 'rubber'"))
  assert.ok(actualPartCaptureToolSource.includes("if (damageProfile === 'emissive_led_glass') return 'glass'"))
  assert.equal(actualPartCaptureToolSource.includes('uniform dark'), false)
})

test('Babylon material and part-language surfaces use PBR tokens and catalog-backed dispatch', () => {
  assert.ok(sceneUtilsSource.includes('PBRMetallicRoughnessMaterial'))
  assert.ok(sceneUtilsSource.includes('function createPbrSceneMaterial'))
  assert.ok(rendererMaterialsSource.includes('PBRMetallicRoughnessMaterial'))
  assert.ok(rendererMaterialsSource.includes('type CombatTeamPalette'))
  assert.ok(rendererMaterialsSource.includes('DEFAULT_TEAM_PALETTES'))
  assert.equal(rendererMaterialsSource.includes('paletteOverrides'), false)
  assert.ok(rendererMaterialsSource.includes('function createCombatTeamPalette'))
  assert.ok(rendererMaterialsSource.includes('resolveTeamAccentHex'))
  assert.equal(rendererMaterialsSource.includes("weapon: '#b49a62'"), false)
  assert.equal(rendererMaterialsSource.includes("'#6f3a22'"), false)
  assert.ok(rendererMaterialsSource.includes("weapon: mixHexColors(base.weapon, accent"))
  assert.ok(rendererMaterialsSource.includes("utility: mixHexColors(base.utility, accent"))
  assert.ok(teamVisualsSource.includes('function createTeamAccentCssVars'))
  assert.ok(refereePanelsSource.includes('teamAccentRgb(role, identity)'))
  assert.equal(refereePanelsSource.includes('findBlueprintAccent'), false)
  assert.ok(rendererMaterialsSource.includes('function createBotMaterialSet'))
  assert.ok(rendererMaterialsSource.includes('type DamageMaterialSet'))
  assert.ok(rendererMaterialsSource.includes('type DamageMaterialByRole'))
  assert.ok(rendererMaterialsSource.includes('BOT_PART_CHILD_MATERIAL_ROLES'))
  assert.ok(rendererMaterialsSource.includes('function materialForTextureProfile'))
  assert.ok(rendererMaterialsSource.includes('function damageMaterialForRoleAndSeverity'))
  assert.ok(rendererMaterialsSource.includes('function tagPartChildMaterialRole'))
  assert.ok(rendererMaterialsSource.includes('function damageTierForSeverity'))
  assert.ok(rendererMaterialsSource.includes('DAMAGE_MEDIUM_THRESHOLD'))
  assert.ok(rendererMaterialsSource.includes('DAMAGE_CRITICAL_THRESHOLD'))
  assert.ok(rendererMaterialsSource.includes('createPbrSurfaceTextures'))
  assert.ok(surfaceTexturesSource.includes('type SurfacePattern'))
  assert.ok(surfaceTexturesSource.includes(" | 'arena_floor'"))
  assert.ok(surfaceTexturesSource.includes(" | 'damage_critical'"))
  assert.ok(surfaceTexturesSource.includes('function drawWeaponTexture'))
  assert.ok(surfaceTexturesSource.includes('function isCoolMetalPattern'))
  assert.equal(surfaceTexturesSource.includes("pattern === 'warning' || pattern === 'weapon'"), false)
  assert.ok(surfaceTexturesSource.includes("pattern === 'weapon'"))
  assert.ok(arenaRendererSource.includes('createPbrSceneMaterial'))
  assert.ok(arenaRendererSource.includes("'arena_floor'"))
  assert.ok(rendererKitSource.includes('function applyRendererEnvironment'))
  assert.ok(rendererKitSource.includes('createDefaultEnvironment'))
  assert.ok(weaponPartsSource.includes('WEAPON_RENDERERS_BY_VISUAL_FAMILY'))
  assert.ok(weaponPartsSource.includes('getPart(partId)?.visual.visualFamily'))
  assert.equal(weaponPartsSource.includes('partId.includes'), false)
  assert.ok(partMotionSource.includes("export type PartMotionAxis = 'x' | 'y' | 'z'"))
  assert.ok(partMotionSource.includes('PART_ANIMATION_PROFILES'))
  for (const animationProfile of [
    'wheel_spin',
    'tread_scroll',
    'spinner_spin',
    'hammer_swing',
    'flipper_snap',
    'grabber_clamp',
    'turret_track',
    'wing_buffet',
    'dragon_breath_idle',
    'neon_pulse',
    'none',
  ]) {
    assert.ok(partMotionSource.includes(animationProfile), `part motion missing ${animationProfile}`)
  }
  assert.ok(partMotionSource.includes('function motionMetadataForAnimationProfile'))
  assert.ok(partMotionSource.includes('function applyRotaryMotion'))
  assert.equal(partMotionSource.includes('metadata.axis ??'), false)
  assert.ok(replaySceneSource.includes('updateBots(resources.bots, frame)'))
  assert.ok(catalogSceneSource.includes('applyPartMotion(node, elapsedSeconds'))
  assert.ok(botPlaybackSource.includes('damageMaterialForRoleAndSeverity'))
  assert.ok(botPlaybackSource.includes('resolveChildMaterialRole'))
  assert.ok(botPlaybackSource.includes('primaryDamageRole'))
  assert.ok(catalogSceneSource.includes('damageMaterialForRoleAndSeverity'))
  assert.ok(catalogSceneSource.includes('resolvePreviewMaterialRole'))
  assert.ok(botAssemblyAnimationSource.includes('applyPartMotion(mesh, elapsed'))
  assert.equal(
    catalogSceneSource.includes("metadata?.kind === 'pulse' || metadata?.kind === 'roll' || metadata?.kind === 'spin'"),
    false,
  )
  assert.equal(botAssemblyAnimationSource.includes("mesh.rotation.y += (metadata.speed ?? 0.06)"), false)
  assert.ok(weaponPartsSource.includes('attachMesh(mountRing, parent, materials.steel)'))
  assert.ok(spinnerWeaponPartSource.includes('saw-blade-motion-root'))
  assert.ok(spinnerWeaponPartSource.includes("bladeRoot.metadata = { kind: 'spin', axis: 'x'"))
  assert.ok(spinnerWeaponPartSource.includes('spinner-motion-root'))
  assert.ok(spinnerWeaponPartSource.includes("spinnerRoot.metadata = { kind: 'spin', axis: 'x'"))
  assert.ok(spinnerWeaponPartSource.includes('attachWeaponEdgeMesh(bar, spinnerRoot, materials.steel)'))
  assert.ok(turretWeaponPartSource.includes('turret-barrel-cluster-motion-root'))
  assert.ok(turretWeaponPartSource.includes("barrelRoot.metadata = { kind: 'spin', axis: 'z'"))
  assert.ok(turretWeaponPartSource.includes('turret-rotary-barrel'))
  assert.ok(turretWeaponPartSource.includes('turret-muzzle-brake'))
  assert.ok(turretWeaponPartSource.includes('turret-bolted-turntable'))
  assert.ok(turretWeaponPartSource.includes('turret-traverse-gear-ring'))
  assert.equal(turretWeaponPartSource.includes('turret-side-pod'), false)
  assert.equal(turretWeaponPartSource.includes('turret-eye'), false)
  assert.ok(netWeaponPartSource.includes('net-folded-cartridge'))
  assert.ok(netWeaponPartSource.includes('net-pressure-chamber'))
  assert.ok(netWeaponPartSource.includes('net-muzzle-bell'))
  assert.ok(netWeaponPartSource.includes('net-front-muzzle-ring'))
  assert.ok(netWeaponPartSource.includes('net-ribbed-cage-rail'))
  assert.ok(netWeaponPartSource.includes('net-ribbed-cage-band'))
  assert.ok(netWeaponPartSource.includes('net-side-pressure-bottle'))
  assert.ok(netWeaponPartSource.includes('net-pressure-vial'))
  assert.equal(netWeaponPartSource.includes('net-hoop'), false)
  assert.equal(netWeaponPartSource.includes('net-vertical'), false)
  assert.equal(netWeaponPartSource.includes('net-horizontal'), false)
  assert.equal(netWeaponPartSource.includes('net-corner-node'), false)
  assert.ok(weaponPartsSource.includes("['chain_whip', createChainWhipWeaponPart]"))
  assert.ok(weaponPartsSource.includes("['shredder', createShredderWeaponPart]"))
  assert.ok(meleeWeaponPartsSource.includes('chain-whip-horizontal-sweep-root'))
  assert.ok(meleeWeaponPartsSource.includes("chainRoot.metadata = { kind: 'spin', axis: 'y'"))
  assert.ok(meleeWeaponPartsSource.includes('chain-whip-drive-cylinder'))
  assert.ok(meleeWeaponPartsSource.includes('chain-whip-single-lash-link'))
  assert.ok(meleeWeaponPartsSource.includes('chain-whip-hooked-impact-tip'))
  assert.equal(meleeWeaponPartsSource.includes('chain-whip-armored-spool-housing'), false)
  assert.equal(meleeWeaponPartsSource.includes('chain-whip-side-guard'), false)
  assert.ok(shredderWeaponPartSource.includes('shredder-drum-motion-root'))
  assert.ok(shredderWeaponPartSource.includes("drumRoot.metadata = { kind: 'spin', axis: 'z'"))
  assert.ok(shredderWeaponPartSource.includes('shredder-toothed-disc'))
  assert.ok(shredderWeaponPartSource.includes('shredder-armored-gearbox'))
  assert.ok(meleeWeaponPartsSource.includes('drill-bit-motion-root'))
  assert.ok(meleeWeaponPartsSource.includes("bitRoot.metadata = { kind: 'spin', axis: 'z'"))
  assert.ok(meleeWeaponPartsSource.includes('flail-chain-root'))
  assert.ok(meleeWeaponPartsSource.includes("chainRoot.metadata = { kind: 'spin', axis: 'x'"))
  assert.equal(meleeWeaponPartsSource.includes('drum.metadata'), false)
  assert.ok(wheelPartsSource.includes("wheel.metadata = { animationProfile: 'wheel_spin', kind: 'roll', axis: 'x'"))
  assert.ok(wheelPartsSource.includes("wheelRoot.metadata = { animationProfile: 'wheel_spin', kind: 'roll', axis: 'x'"))
  assert.ok(treadPartsSource.includes("wheelRoot.metadata = { kind: 'roll', axis: 'z'"))
  assert.equal(treadPartsSource.includes("wheel.metadata = { kind: 'roll', axis: 'z'"), false)
  assert.ok(treadPartsSource.includes('rollSpeed: visual.rollSpeed'))
  assert.ok(treadPartsSource.includes('createTrackReturnRoller'))
  assert.ok(utilityPartsSource.includes('createAiModulePart'))
  assert.ok(utilityPartsSource.includes('createAnchorClampPart'))
  assert.ok(utilityPartsSource.includes('createGyroStabilizerPart'))
  assert.ok(utilityPartsSource.includes('createEnergyCorePart'))
  assert.ok(utilityPartsSource.includes('createMagnetPart'))
  assert.ok(utilityPartsSource.includes('battery-hardcase-lid'))
  assert.ok(utilityPartsSource.includes('battery-lipo-cell'))
  assert.ok(utilityPartsSource.includes('booster-pressure-tank'))
  assert.ok(utilityPartsSource.includes('repair-case-lid'))
  assert.ok(utilityPartsSource.includes('radar-parabolic-dish'))
  assert.ok(utilityPartsSource.includes('radar-dish-rim'))
  assert.ok(utilityPartsSource.includes("blockLabel: 'coolant-tank'"))
  assert.ok(utilityPartsSource.includes("blockLabel: 'fuel-tank'"))
  assert.ok(utilityPartsSource.includes('${blockLabel}-pressure-cylinder'))
  assert.ok(utilityPartsSource.includes('fuel-tank-hazard-stripe'))
  assert.equal(utilityPartsSource.includes("createUtilityFrame(args, 'Radar')"), false)
  assert.equal(utilityPartsSource.includes("createUtilityFrame(args, 'CoolantTank')"), false)
  assert.equal(utilityPartsSource.includes("createUtilityFrame(args, 'FuelTank')"), false)
  assert.ok(utilityPartsSource.includes('sensor-pcb-board'))
  assert.ok(utilityPartsSource.includes('smoke-pressure-canister'))
  assert.ok(partDetailsSource.includes("category === 'mobility' || category === 'utility'"))
  assert.equal(partDetailsSource.includes("category === 'body' || category === 'utility'"), false)
  assert.ok(utilityPartsSource.includes('ai-module-bolted-card-frame'))
  assert.ok(utilityPartsSource.includes('ai-module-quantum-chip-package'))
  assert.ok(utilityPartsSource.includes('ai-module-gold-trace-fanout'))
  assert.ok(utilityPartsSource.includes('ai-module-glass-cryo-cap'))
  assert.ok(utilityPartsSource.includes('ai-module-cryo-standoff'))
  assert.ok(utilityPartsSource.includes('ai-module-team-status-strip'))
  assert.equal(utilityPartsSource.includes('ai-module-board'), false)
  assert.equal(utilityPartsSource.includes('ai-module-chip`'), false)
  assert.ok(utilityPartsSource.includes('energy-core-containment-vessel'))
  assert.ok(utilityPartsSource.includes('energy-core-pulse-column'))
  assert.ok(utilityPartsSource.includes('energy-core-induction-coil-ring'))
  assert.ok(utilityPartsSource.includes('energy-core-cage-corner-pillar'))
  assert.ok(utilityPartsSource.includes('energy-core-side-gear-ring'))
  assert.ok(utilityPartsSource.includes('energy-core-service-conduit'))
  assert.ok(utilityPartsSource.includes('energy-core-machined-brass-mat'))
  assert.ok(utilityPartsSource.includes('energy-core-wound-copper-mat'))
  assert.ok(utilityPartsSource.includes('energy-core-team-status-strip'))
  assert.equal(utilityPartsSource.includes('energy-core-chamber'), false)
  assert.equal(utilityPartsSource.includes('energy-core-top-cap'), false)
  assert.equal(utilityPartsSource.includes('energy-core-bottom-cap'), false)
  assert.equal(utilityPartsSource.includes('energy-core-team-accent-plate'), false)
  assert.ok(utilityPartsSource.includes('magnet-ceramic-solenoid-core'))
  assert.ok(utilityPartsSource.includes('magnet-copper-winding-ring'))
  assert.ok(utilityPartsSource.includes('magnet-laminated-side-yoke'))
  assert.ok(utilityPartsSource.includes('magnet-soft-iron-pole-shoe'))
  assert.ok(utilityPartsSource.includes('magnet-field-pulse-root'))
  assert.ok(utilityPartsSource.includes('magnet-team-status-strip'))
  assert.equal(utilityPartsSource.includes('magnet-hazard-band'), false)
  assert.equal(utilityPartsSource.includes('magnet-left-pole'), false)
  assert.equal(utilityPartsSource.includes('magnet-right-pole'), false)
  assert.ok(utilityPartsSource.includes('anchor-bolted-ballast-slab'))
  assert.ok(utilityPartsSource.includes('anchor-deployable-skid-rail'))
  assert.ok(utilityPartsSource.includes('anchor-locking-pin'))
  assert.ok(utilityPartsSource.includes('anchor-bite-foot'))
  assert.ok(utilityPartsSource.includes('anchor-floor-bite-tooth'))
  assert.ok(utilityPartsSource.includes('anchor-floor-lock-plunger-housing'))
  assert.ok(utilityPartsSource.includes('anchor-drop-spike'))
  assert.ok(utilityPartsSource.includes('anchor-plunger-guide-tower'))
  assert.ok(utilityPartsSource.includes('anchor-guide-tower-cross-pin'))
  assert.ok(utilityPartsSource.includes('anchor-removable-weight-plate'))
  assert.ok(utilityPartsSource.includes('anchor-removable-ballast-stack-layer'))
  assert.ok(utilityPartsSource.includes('anchor-outrigger-hinge-block'))
  assert.ok(utilityPartsSource.includes('anchor-serrated-bite-pad'))
  assert.ok(utilityPartsSource.includes('anchor-warning-stripe'))
  assert.ok(utilityPartsSource.includes('anchor-team-load-indicator'))
  assert.equal(utilityPartsSource.includes('anchor-ballast`'), false)
  assert.equal(utilityPartsSource.includes('anchor-claw'), false)
  assert.ok(utilityPartsSource.includes('gyro-outer-gimbal-ring'))
  assert.ok(utilityPartsSource.includes('gyro-equator-gimbal-ring'))
  assert.ok(utilityPartsSource.includes('gyro-inner-gimbal-ring'))
  assert.ok(utilityPartsSource.includes('gyro-vertical-pivot-axis'))
  assert.ok(utilityPartsSource.includes('gyro-upper-pivot-ball'))
  assert.ok(utilityPartsSource.includes('gyro-lower-pivot-ball'))
  assert.ok(utilityPartsSource.includes('gyro-pivot-saddle'))
  assert.ok(utilityPartsSource.includes('gyro-flywheel-motion-root'))
  assert.ok(utilityPartsSource.includes("rotorRoot.metadata = { kind: 'spin', axis: 'x'"))
  assert.equal(utilityPartsSource.includes('gyro-bearing-tower'), false)
  assert.equal(utilityPartsSource.includes('gyro-control-board'), false)
  assert.equal(utilityPartsSource.includes('gyro-control-cable-loop'), false)
  assert.equal(utilityPartsSource.includes('gyroRing.metadata'), false)
  assert.ok(utilityPartsSource.includes("rotor.metadata = { kind: 'spin', axis: 'z'"))
  assert.ok(defensePartsSource.includes('rail-armor-horizontal-tube'))
  assert.ok(defensePartsSource.includes('corner-guard-octagonal-bumper'))
  assert.ok(defensePartsSource.includes('flex-panel-rubberized-segment'))
  assert.ok(defensePartsSource.includes('heavy-wedge-sloped-armor'))
  assert.ok(stylePartsSource.includes('antenna-flexible-mast'))
  assert.ok(stylePartsSource.includes('blade-antenna-fin-mast'))
  assert.ok(stylePartsSource.includes('horns-swept-metal-horn'))
  assert.ok(stylePartsSource.includes('tail-armored-segment'))
  assert.ok(stylePartsSource.includes('top-hat-tall-crown'))
  assert.ok(stylePartsSource.includes('cowboy-hat-pinched-crown'))
  assert.equal(
    /kind: '(?:roll|spin)', speed/.test(
      [
        meleeWeaponPartsSource,
        spinnerWeaponPartSource,
        turretWeaponPartSource,
        treadPartsSource,
        utilityPartsSource,
        wheelPartsSource,
      ].join('\n'),
    ),
    false,
  )
  assert.ok(partRendererSource.includes('function createCatalogPartNode'))
  assert.ok(partRendererSource.includes("visualFamily !== 'ai_module'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'anchor'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'coolant_tank'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'energy_core'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'fuel_tank'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'gyro'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'magnet'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'turret'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'net'"))
  assert.ok(partRendererSource.includes("visualFamily !== 'radar'"))
  assert.equal(wheelPartsSource.includes('large-wheel-outer-band'), false)
  assert.ok(wheelPartsSource.includes('large-wheel-bead-plate'))
  assert.ok(wheelPartsSource.includes('large-wheel-sidewall-lug'))
  assert.equal(wheelPartsSource.includes('omni-outer-ring'), false)
  assert.ok(wheelPartsSource.includes('CreateCapsule'))
  assert.ok(wheelPartsSource.includes('omni-face-rim'))
  assert.ok(wheelPartsSource.includes('omni-face-window'))
  assert.ok(wheelPartsSource.includes('omni-roller-cheek'))
  assert.equal(wheelPartsSource.includes('mecanum-roller-cheek'), false)
  assert.equal(wheelPartsSource.includes('mecanum-side-bolt'), false)
  assert.ok(wheelPartsSource.includes('mecanum-side-plate'))
  assert.ok(wheelPartsSource.includes('mecanum-face-fastener'))
  assert.ok(wheelPartsSource.includes('mecanum-roller-cap'))
  assert.ok(wheelPartsSource.includes('mecanum-roller-bearing'))
  assert.ok(wheelPartsSource.includes('function createMecanumRollerAxis'))
  assert.equal(wheelPartsSource.includes('function createSpikedWheelRim'), false)
  assert.ok(wheelPartsSource.includes('function createSpikedWheelPart'))
  assert.ok(wheelPartsSource.includes('spiked-wheel-tooth'))
  assert.ok(wheelPartsSource.includes('spiked-wheel-bite-ring'))
  assert.equal(treadPartsSource.includes('tread-top-stripe'), false)
  assert.equal(treadPartsSource.includes('tread-drive-module'), false)
  assert.equal(treadPartsSource.includes('exposed-road-wheel'), false)
  assert.equal(treadPartsSource.includes('tread-shock-tower'), false)
  assert.equal(treadPartsSource.includes('standard-tread-service-hatch'), false)
  assert.ok(treadPartsSource.includes('function createStandardTreadPart'))
  assert.ok(treadPartsSource.includes('standard-tread-belt-top'))
  assert.ok(treadPartsSource.includes('standard-tread-front-idler'))
  assert.ok(treadPartsSource.includes('standard-tread-rear-sprocket'))
  assert.ok(treadPartsSource.includes('standard-tread-top-shoe'))
  assert.ok(stylePartsSource.includes('function createDragonHeadPart'))
  assert.ok(stylePartsSource.includes('dragon-armored-skull'))
  assert.ok(stylePartsSource.includes('dragon-tapered-snout'))
  assert.ok(stylePartsSource.includes('dragon-cyber-side-profile'))
  assert.ok(stylePartsSource.includes('dragon-open-lower-jaw-plate'))
  assert.ok(stylePartsSource.includes('dragon-glowing-eye-slit'))
  assert.ok(stylePartsSource.includes('dragon-swept-horn'))
  assert.ok(stylePartsSource.includes('dragon-side-gear-ring'))
  assert.ok(stylePartsSource.includes('function createWingAssemblyPart'))
  assert.ok(stylePartsSource.includes('swept-wing-panel'))
  assert.ok(stylePartsSource.includes('wing-root-hinge'))
  assert.ok(stylePartsSource.includes('wingtip-marker-light'))
  assert.ok(stylePartsSource.includes('function createCrownPart'))
  assert.ok(stylePartsSource.includes('crown-bolted-base-plate'))
  assert.ok(stylePartsSource.includes('crown-seated-tooth'))
  assert.ok(stylePartsSource.includes('crown-inset-jewel'))
  assert.ok(stylePartsSource.includes('function createExtrudedPlateFromOutline'))
  assert.ok(stylePartsSource.includes('function createExtrudedVerticalPlateFromOutline'))
  assert.equal(stylePartsSource.includes('wings-body'), false)
  assert.equal(stylePartsSource.includes('crown-jewel-${index}'), false)
  assert.ok(partDetailsSource.includes('function createFastenerRow'))
  assert.equal(partDetailsSource.includes('function createVentSlats'), false)
  assert.ok(partDetailsSource.includes('function createPanelSeam'))
})
