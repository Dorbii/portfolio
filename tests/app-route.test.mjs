import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
const cockpitSource = readFileSync(
  new URL('../apps/web/src/agent/LiveAgentCockpit.tsx', import.meta.url),
  'utf8',
)

test('app keeps a dedicated /agent route gate tolerant of nested paths', () => {
  assert.match(appSource, /function isAgentPathname\(/)
  assert.match(appSource, /const normalized = pathname\.replace\(/)
  assert.match(appSource, /normalized === '\/agent'/)
  assert.match(appSource, /normalized\.endsWith\('\/agent'\)/)
})

test('root console is wired to live referee session helpers', () => {
  assert.equal(appSource.includes('./mockSession'), false)
  assert.ok(appSource.includes('./referee/refereeClient'))
  assert.ok(appSource.includes('createSession'))
  assert.ok(appSource.includes('loadPublicSession'))
  assert.ok(appSource.includes('loadReplayPayload'))
  assert.ok(appSource.includes('ReplayViewer'))
  assert.ok(appSource.includes('ReplayOutcome'))
  assert.ok(appSource.includes('submitRefereeAwards'))
  assert.ok(appSource.includes('resetRoleClaim'))
  assert.ok(appSource.includes('Referee capability token'))
  assert.ok(appSource.includes('createExternalAgentBriefMarkdown'))
  assert.ok(appSource.includes('Copy brief'))
  assert.ok(appSource.includes('Refresh claim'))
  assert.ok(appSource.includes('replaceInvite'))
})

test('agent cockpit renders reliability and debug hooks', () => {
  assert.match(cockpitSource, /window\.AgentArenaRole/)
  assert.ok(cockpitSource.includes('agent-empty'))
  assert.ok(cockpitSource.includes('Last validation error'))
  assert.ok(cockpitSource.includes('Match log'))
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
