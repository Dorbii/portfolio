import type { SessionPhase } from '../../../../packages/schemas/src/index.js'

export const TERMINAL_PHASES = new Set<SessionPhase>(['session_complete', 'expired'])
