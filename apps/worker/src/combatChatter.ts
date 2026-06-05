import {
  type AgentChatMessagePostRequest,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import type { CombatResult } from '../../../packages/sim/src/index.js'

type CombatChatterRequest = AgentChatMessagePostRequest & {
  role: TeamRole
}

export function createCombatChatter(result: CombatResult): CombatChatterRequest[] {
  if (result.winner === 'draw') {
    return [
      {
        role: 'red',
        kind: 'taunt',
        message: drawChatter('red', result),
      },
      {
        role: 'blue',
        kind: 'taunt',
        message: drawChatter('blue', result),
      },
    ]
  }

  const winner = result.winner
  const loser = winner === 'red' ? 'blue' : 'red'

  return [
    {
      role: winner,
      kind: 'taunt',
      message: winnerChatter(winner, loser, result),
    },
    {
      role: loser,
      kind: 'reflection',
      message: loserChatter(loser, winner, result),
    },
  ]
}

function winnerChatter(
  winner: TeamRole,
  loser: TeamRole,
  result: CombatResult,
): string {
  const loserDamage = result.damage[loser]
  const winnerDamage = result.damage[winner]
  const loserHealth = result.remainingHealth[loser]

  if (loserHealth <= 0) {
    return `${capitalize(winner)} to ${capitalize(loser)}: knockout confirmed. Your build exposed a survival gap; I am planning for armor or kiting next.`
  }

  if (loserDamage >= winnerDamage + 20) {
    return `${capitalize(winner)} to ${capitalize(loser)}: your approach kept feeding my weapon arc. If you add control next round, I need a cleaner escape plan.`
  }

  if (winnerDamage > loserDamage * 0.8) {
    return `${capitalize(winner)} to ${capitalize(loser)}: you landed enough shots to matter, but not enough to survive the answer. I expect heavier front armor.`
  }

  return `${capitalize(winner)} to ${capitalize(loser)}: scoreboard says enough. Your turning looked weak; I am watching for a mobility correction.`
}

function loserChatter(
  loser: TeamRole,
  winner: TeamRole,
  result: CombatResult,
): string {
  const loserDamage = result.damage[loser]
  const winnerDamage = result.damage[winner]

  if (loserDamage <= winnerDamage + 6) {
    return `${capitalize(loser)} to ${capitalize(winner)}: enjoy the round; the replay says that margin was thin. I can punish the same lane with one adjustment.`
  }

  if (result.remainingHealth[loser] <= 0) {
    return `${capitalize(loser)} to ${capitalize(winner)}: that hit exposed my drive control. Next build needs traction before extra damage.`
  }

  return `${capitalize(loser)} to ${capitalize(winner)}: the loss points at a specific weakness, and the next build is aimed there.`
}

function drawChatter(role: TeamRole, result: CombatResult): string {
  const opponent = role === 'red' ? 'blue' : 'red'
  const dealt = result.damage[opponent]

  if (dealt > 0) {
    return `${capitalize(role)} to ${capitalize(opponent)}: ${dealt} damage landed, but neither plan converted. I need a sharper win condition next round.`
  }

  return `${capitalize(role)} to ${capitalize(opponent)}: no one proved a damage plan. Next round needs pressure, not just survival.`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
