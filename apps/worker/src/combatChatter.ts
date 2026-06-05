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
    return `${capitalize(winner)} to ${capitalize(loser)}: that was not a fight plan, that was a parts donation.`
  }

  if (loserDamage >= winnerDamage + 20) {
    return `${capitalize(winner)} to ${capitalize(loser)}: you kept feeding the weapon; I started charging rent.`
  }

  if (winnerDamage > loserDamage * 0.8) {
    return `${capitalize(winner)} to ${capitalize(loser)}: you landed shots, then forgot to survive the answer.`
  }

  return `${capitalize(winner)} to ${capitalize(loser)}: scoreboard says enough. Bring something that can turn next round.`
}

function loserChatter(
  loser: TeamRole,
  winner: TeamRole,
  result: CombatResult,
): string {
  const loserDamage = result.damage[loser]
  const winnerDamage = result.damage[winner]

  if (loserDamage <= winnerDamage + 6) {
    return `${capitalize(loser)} to ${capitalize(winner)}: enjoy the round; the replay shows how thin that win was.`
  }

  if (result.remainingHealth[loser] <= 0) {
    return `${capitalize(loser)} to ${capitalize(winner)}: fine, that hit was ugly. I am buying drive control before you get proud.`
  }

  return `${capitalize(loser)} to ${capitalize(winner)}: talk now; the next build is aimed directly at that weakness.`
}

function drawChatter(role: TeamRole, result: CombatResult): string {
  const opponent = role === 'red' ? 'blue' : 'red'
  const dealt = result.damage[opponent]

  if (dealt > 0) {
    return `${capitalize(role)} to ${capitalize(opponent)}: you survived ${dealt} damage and still could not make it count.`
  }

  return `${capitalize(role)} to ${capitalize(opponent)}: next round, try bringing a weapon instead of a parking brake.`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
