import type {
  OpeningScript,
  TurnCommand,
} from '../../schemas/src/index.js'

export type OpeningScriptIndex = {
  commandByTick: ReadonlyMap<number, TurnCommand>
}

export function createOpeningScriptIndex(openingScript: OpeningScript): OpeningScriptIndex {
  const commandByTick = new Map<number, TurnCommand>()

  for (const command of openingScript.commands) {
    if (!commandByTick.has(command.tick)) {
      commandByTick.set(command.tick, command)
    }
  }

  return { commandByTick }
}

export function getOpeningScriptCommand(
  openingScriptIndex: OpeningScriptIndex,
  tick: number,
): TurnCommand | undefined {
  return openingScriptIndex.commandByTick.get(tick)
}
