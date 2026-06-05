import { MOVEMENT_COMMANDS } from '../../../../packages/schemas/src/index.js'
import type {
  MovementCommand,
  UtilityCommand,
  WeaponCommand,
} from '../../../../packages/schemas/src/index.js'
import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'

export function RoundPlanTurnPlanSection({
  setSubmissionDraft,
  submissionDraft,
}: RoundPlanEditorSectionProps) {
  return (
    <section className="plan-section turn-plan-editor" aria-labelledby="turn-plan-heading">
      <div className="plan-section-header">
        <h3 id="turn-plan-heading">Turn plan commands</h3>
        <button
          type="button"
          onClick={() =>
            setSubmissionDraft((draft) => ({
              ...draft,
              turnCommands: [
                ...draft.turnCommands,
                {
                  tick: String(draft.turnCommands.length + 1),
                  move: '',
                  weaponA: '',
                  weaponB: '',
                  utility: '',
                },
              ],
            }))
          }
        >
          Add command
        </button>
      </div>
      <div className="turn-command-list">
        {submissionDraft.turnCommands.map((command, index) => (
          <div className="turn-command-row" key={`command-${index}`}>
            <label>
              <span>Tick</span>
              <input
                type="number"
                min={1}
                value={command.tick}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    turnCommands: draft.turnCommands.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, tick: event.target.value } : item,
                    ),
                  }))
                }
              />
            </label>
            <label>
              <span>Move</span>
              <select
                value={command.move}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    turnCommands: draft.turnCommands.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, move: event.target.value as '' | MovementCommand }
                        : item,
                    ),
                  }))
                }
              >
                <option value="">-</option>
                {MOVEMENT_COMMANDS.map((move) => (
                  <option key={move} value={move}>
                    {move}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Weapon A</span>
              <select
                value={command.weaponA}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    turnCommands: draft.turnCommands.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, weaponA: event.target.value as '' | WeaponCommand }
                        : item,
                    ),
                  }))
                }
              >
                <option value="">-</option>
                <option value="fire">fire</option>
                <option value="hold">hold</option>
              </select>
            </label>
            <label>
              <span>Weapon B</span>
              <select
                value={command.weaponB}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    turnCommands: draft.turnCommands.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, weaponB: event.target.value as '' | WeaponCommand }
                        : item,
                    ),
                  }))
                }
              >
                <option value="">-</option>
                <option value="fire">fire</option>
                <option value="hold">hold</option>
              </select>
            </label>
            <label>
              <span>Utility</span>
              <select
                value={command.utility}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    turnCommands: draft.turnCommands.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, utility: event.target.value as '' | UtilityCommand }
                        : item,
                    ),
                  }))
                }
              >
                <option value="">-</option>
                <option value="activate">activate</option>
                <option value="hold">hold</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                setSubmissionDraft((draft) => ({
                  ...draft,
                  turnCommands: draft.turnCommands.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
