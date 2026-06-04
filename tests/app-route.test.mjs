import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
const cockpitSource = readFileSync(
  new URL('../apps/web/src/agent/LiveAgentCockpit.tsx', import.meta.url),
  'utf8',
)

test('app keeps a dedicated /agent route gate tolerant of nested paths', () => {
  assert.match(appSource, /function isAgentPath\(/)
  assert.match(appSource, /const normalized = pathname\.replace\(/)
  assert.match(appSource, /normalized === '\/agent'/)
  assert.match(appSource, /normalized\.endsWith\('\/agent'\)/)
})

test('agent cockpit renders reliability and debug hooks', () => {
  assert.match(cockpitSource, /window\.AgentArenaRole/)
  assert.ok(cockpitSource.includes('agent-empty'))
  assert.ok(cockpitSource.includes('Last validation error'))
  assert.ok(cockpitSource.includes('Match log'))
  assert.ok(cockpitSource.includes('agent-arena-state'))
  assert.ok(cockpitSource.includes('claimButtonLabel'))
  assert.ok(cockpitSource.includes('Clear role token'))
})
