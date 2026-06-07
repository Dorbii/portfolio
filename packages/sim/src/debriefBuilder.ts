import type {
  DebriefEvidence,
  FightDossier,
  PostFightAgentReflection,
  SharedDebrief,
  TeamRole,
  WeaponUseStats,
} from '../../schemas/src/index.js'

export type DebriefReflectionInput = {
  status: 'private_pending' | 'consumed_into_shared_debrief'
  submittedAt: string
  reflection: PostFightAgentReflection
}

export type BuildSharedDebriefInput = {
  sourceSessionId: string
  dossier?: FightDossier
  fightDossier?: FightDossier
  reflections?: DebriefReflectionInput[]
  debriefId?: string
}

export function buildSharedDebrief(input: BuildSharedDebriefInput): SharedDebrief {
  const dossier = input.dossier ?? input.fightDossier
  const fight = dossier?.fights[dossier.fights.length - 1]

  if (!fight) {
    return {
      debriefId: input.debriefId ?? `${input.sourceSessionId}:debrief:empty`,
      sourceSessionId: input.sourceSessionId,
      fightIds: [],
      summary: 'No completed fight data is available for debrief.',
      championImprovementHints: ['Complete a fight before trusting continuation guidance.'],
      challengerCounterplayHints: ['Complete a fight before trusting counterplay guidance.'],
      evidence: [
        {
          type: 'no_completed_fight',
          summary: 'Debrief builder received no fight dossier entries.',
          source: 'fight_dossier',
        },
      ],
    }
  }

  const winner = fight.winner
  const loser = winner === 'draw' ? undefined : oppositeRole(winner)
  const championDamage = winner === 'draw' ? 0 : fight.stats.damageDealt[winner]
  const challengerDamage = loser ? fight.stats.damageDealt[loser] : 0
  const strongestDamageRole = fight.stats.damageDealt.red >= fight.stats.damageDealt.blue
    ? 'red'
    : 'blue'
  const primaryWeapon = strongestWeapon(fight.stats.weaponUse)
  const reflectionConflict = findReflectionConflict(
    input.reflections ?? [],
    fight.stats.weaponUse,
    primaryWeapon,
    winner,
  )
  const evidence: DebriefEvidence[] = [
    {
      type: 'result',
      summary: fight.reason,
      value: winner,
      source: 'combat_result',
    },
    {
      type: 'damage_dealt',
      summary: `Red dealt ${fight.stats.damageDealt.red} damage; blue dealt ${fight.stats.damageDealt.blue}.`,
      value: `${fight.stats.damageDealt.red}:${fight.stats.damageDealt.blue}`,
      source: 'fight_dossier.stats.damageDealt',
    },
    {
      type: 'remaining_health',
      summary: `Red ended with ${fight.bots.red.combat.health} health; blue ended with ${fight.bots.blue.combat.health}.`,
      value: `${fight.bots.red.combat.health}:${fight.bots.blue.combat.health}`,
      source: 'fight_dossier.bots.combat',
    },
    ...(primaryWeapon
      ? [
          {
            type: 'primary_weapon',
            summary: `${primaryWeapon.weapon.weaponId} produced the strongest measured weapon damage.`,
            value: primaryWeapon.weapon.damage,
            source: 'fight_dossier.stats.weaponUse',
          },
        ]
      : []),
    ...(reflectionConflict
      ? [
          {
            type: 'reflection_conflict',
            summary: reflectionConflict.summary,
            source: 'fight_dossier.stats.weaponUse',
          },
        ]
      : []),
    ...reflectionEvidence(input.reflections ?? []),
  ]

  return {
    debriefId: input.debriefId ?? `${input.sourceSessionId}:debrief:${fight.fightId}`,
    sourceSessionId: input.sourceSessionId,
    fightIds: dossier.fights.map((entry) => entry.fightId),
    summary: summaryForFight({
      winner,
      reason: fight.reason,
      championDamage,
      challengerDamage,
      strongestDamageRole,
      primaryWeapon,
      reflectionConflict,
    }),
    championImprovementHints: championHints(winner, fight.stats.disabledParts[winner === 'draw' ? 'red' : winner]),
    challengerCounterplayHints: challengerHints(winner, strongestDamageRole),
    evidence,
  }
}

function reflectionEvidence(reflections: DebriefReflectionInput[]): DebriefEvidence[] {
  if (reflections.length === 0) {
    return []
  }

  return [
    {
      type: 'private_reflection_count',
      summary: `${reflections.length} private post-fight reflection(s) were considered without exposing raw claims.`,
      value: reflections.length,
      source: 'private_reflections',
    },
    {
      type: 'data_authority',
      summary: 'Replay and bot-state evidence override any conflicting private reflection claims.',
      value: true,
      source: 'fight_dossier',
    },
  ]
}

function summaryForFight(input: {
  winner: TeamRole | 'draw'
  reason: string
  championDamage: number
  challengerDamage: number
  strongestDamageRole: TeamRole
  primaryWeapon?: RoleWeaponImpact
  reflectionConflict?: ReflectionConflict
}): string {
  const primaryWeaponSummary = input.primaryWeapon
    ? ` ${input.primaryWeapon.weapon.weaponId} was the top measured weapon contributor at ${input.primaryWeapon.weapon.damage} damage.`
    : ''
  const conflictSummary = input.reflectionConflict
    ? ` ${input.reflectionConflict.summary}`
    : ''

  if (input.winner === 'draw') {
    return `The fight ended in a draw. Evidence shows red dealt ${input.championDamage} damage and blue dealt ${input.challengerDamage} damage. ${input.reason}${primaryWeaponSummary}${conflictSummary}`
  }

  return `${input.winner} won on measured fight data. ${input.winner} dealt ${input.championDamage} damage while ${oppositeRole(input.winner)} dealt ${input.challengerDamage}. ${input.reason} ${input.strongestDamageRole} produced the stronger damage profile.${primaryWeaponSummary}${conflictSummary}`
}

function championHints(
  winner: TeamRole | 'draw',
  disabledParts: string[],
): string[] {
  if (winner === 'draw') {
    return ['Improve finishing pressure; neither bot converted the fight into a clean win.']
  }

  return disabledParts.length > 0
    ? [
        'Repair or reinforce disabled parts before carrying the design forward.',
        'Preserve the damage pattern that decided the fight while improving survivability.',
      ]
    : [
        'Preserve the winning damage pattern.',
        'Upgrade side armor or drive stability before the next challenger adapts.',
      ]
}

function challengerHints(
  winner: TeamRole | 'draw',
  strongestDamageRole: TeamRole,
): string[] {
  if (winner === 'draw') {
    return ['Build for cleaner weapon uptime; the previous fight did not produce a decisive damage edge.']
  }

  return [
    `Avoid trading directly into ${winner}'s strongest damage line.`,
    `Counter the ${strongestDamageRole} damage profile with mobility, spacing, or armor placement.`,
  ]
}

function oppositeRole(role: TeamRole): TeamRole {
  return role === 'red' ? 'blue' : 'red'
}

type RoleWeaponImpact = {
  role: TeamRole
  weapon: WeaponUseStats
}

type ReflectionConflict = {
  lowImpactWeapon?: WeaponUseStats
  primaryWeapon?: WeaponUseStats
  summary: string
}

function strongestWeapon(
  weaponUse: Record<TeamRole, WeaponUseStats[]>,
): RoleWeaponImpact | undefined {
  let strongest: RoleWeaponImpact | undefined

  for (const role of ['red', 'blue'] as const) {
    for (const weapon of weaponUse[role]) {
      if (!strongest || weapon.damage > strongest.weapon.damage) {
        strongest = { role, weapon }
      }
    }
  }

  return strongest && strongest.weapon.damage > 0 ? strongest : undefined
}

function findReflectionConflict(
  reflections: DebriefReflectionInput[],
  weaponUse: Record<TeamRole, WeaponUseStats[]>,
  primary: RoleWeaponImpact | undefined,
  winner: TeamRole | 'draw',
): ReflectionConflict | undefined {
  if (winner !== 'draw') {
    const losingClaim = reflections.find(
      (entry) =>
        entry.reflection.role !== winner &&
        typeof entry.reflection.claims.perceivedWinReason === 'string' &&
        entry.reflection.claims.perceivedWinReason.trim() !== '',
    )

    if (losingClaim) {
      return {
        summary: `Private reflection claimed ${losingClaim.reflection.role} as winner, but fight data records ${winner} as winner.`,
      }
    }
  }

  if (!primary || primary.weapon.damage <= 0) {
    return undefined
  }

  const text = reflections
    .flatMap((entry) => [
      entry.reflection.claims.perceivedWinReason,
      entry.reflection.claims.perceivedLossReason,
      ...entry.reflection.claims.ownWeaknesses,
      ...entry.reflection.claims.opponentThreats,
      ...entry.reflection.claims.suggestedDesignChanges,
      ...entry.reflection.claims.suggestedTacticalChanges,
    ])
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.toLowerCase())
    .join(' ')

  if (!text) {
    return undefined
  }

  for (const role of ['red', 'blue'] as const) {
    for (const weapon of weaponUse[role]) {
      if (weapon.weaponId === primary.weapon.weaponId || weapon.damage > 0) {
        continue
      }

      if (text.includes(weaponToken(weapon.weaponId))) {
        return {
          lowImpactWeapon: weapon,
          primaryWeapon: primary.weapon,
          summary: `Private reflection over-attributed ${weapon.weaponId}. ${weapon.weaponId} had low measurable impact; ${primary.weapon.weaponId} damage decided the fight data.`,
        }
      }
    }
  }

  return undefined
}

function weaponToken(weaponId: string): string {
  return weaponId
    .replace(/^weapon[_-]/i, '')
    .replaceAll(/[_-]+/g, ' ')
    .toLowerCase()
}
