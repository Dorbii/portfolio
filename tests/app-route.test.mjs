import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
const cockpitSource = readFileSync(
  new URL('../apps/web/src/agent/LiveAgentCockpit.tsx', import.meta.url),
  'utf8',
)
const replayViewerSource = readFileSync(
  new URL('../apps/web/src/replay/ReplayViewer.tsx', import.meta.url),
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
  const refereeConsoleSource = functionSource(appSource, 'RefereeConsole')

  assert.equal(refereeConsoleSource.includes('mockPublicSession'), false)
  assert.equal(refereeConsoleSource.includes('mockRoleStates'), false)
  assert.ok(appSource.includes('./referee/refereeClient'))
  assert.ok(appSource.includes('createSession'))
  assert.ok(appSource.includes('loadPublicSession'))
  assert.ok(appSource.includes('loadReplayPayload'))
  assert.ok(appSource.includes('ReplayViewer'))
  assert.ok(appSource.includes('ReplayOutcome'))
  assert.ok(appSource.includes('PublicChatLog'))
  assert.ok(appSource.includes('Fight comms'))
  assert.ok(appSource.includes('submitRefereeAwards'))
  assert.ok(appSource.includes('resetRoleClaim'))
  assert.equal(appSource.includes('Create capability token'), false)
  assert.ok(appSource.includes('Referee capability token'))
  assert.ok(appSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(appSource.includes('Wake {role} agent'))
  assert.ok(appSource.includes('wake brief copied'))
  assert.ok(appSource.includes('Refresh claim'))
  assert.ok(appSource.includes('replaceInvite'))
})

test('agent cockpit renders reliability and debug hooks', () => {
  assert.match(cockpitSource, /window\.AgentArenaRole/)
  assert.ok(cockpitSource.includes('agent-empty'))
  assert.ok(cockpitSource.includes('Last validation error'))
  assert.ok(cockpitSource.includes('Match log'))
  assert.ok(cockpitSource.includes('Bot chat'))
  assert.ok(cockpitSource.includes('Assembly bay'))
  assert.ok(cockpitSource.includes('BotAssemblyScene'))
  assert.ok(cockpitSource.includes('Private notes'))
  assert.ok(cockpitSource.includes('agent-chat-form'))
  assert.ok(cockpitSource.includes('submitChatMessage'))
  assert.ok(cockpitSource.includes('submitPrivateChatMessage'))
  assert.ok(cockpitSource.includes('privateChatLog'))
  assert.ok(cockpitSource.includes('agent-arena-state'))
  assert.ok(cockpitSource.includes('agent-arena-brief'))
  assert.ok(cockpitSource.includes('External agent brief'))
  assert.ok(cockpitSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(cockpitSource.includes('stateVersion'))
  assert.ok(cockpitSource.includes('claimButtonLabel'))
  assert.ok(cockpitSource.includes('Clear role token'))
})

test('agent cockpit includes structured plan editor section labels and advanced JSON mode', () => {
  assert.ok(cockpitSource.includes('purchases-heading'))
  assert.ok(cockpitSource.includes('Purchases'))
  assert.ok(cockpitSource.includes('blueprint-heading'))
  assert.ok(cockpitSource.includes('Blueprint'))
  assert.ok(cockpitSource.includes('turn-plan-heading'))
  assert.ok(cockpitSource.includes('Turn plan commands'))
  assert.ok(cockpitSource.includes('Rationale'))
  assert.ok(cockpitSource.includes('Advanced JSON mode'))
})

test('replay viewer does not render future event timeline markers', () => {
  assert.ok(replayViewerSource.includes('findActiveEvent'))
  assert.equal(replayViewerSource.includes('timeline.events.map'), false)
  assert.equal(replayViewerSource.includes('key-event-list'), false)
  assert.equal(replayViewerSource.includes('event-marker'), false)
})
