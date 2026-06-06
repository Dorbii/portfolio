import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'
import { PartSelect } from './PartSelect'

export function RoundPlanBlueprintSection({
  setSubmissionDraft,
  submissionDraft,
}: RoundPlanEditorSectionProps) {
  return (
    <section className="plan-section blueprint-editor" aria-labelledby="blueprint-heading">
      <div className="plan-section-header">
        <h3 id="blueprint-heading">Blueprint</h3>
        <button
          type="button"
          onClick={() =>
            setSubmissionDraft((draft) => ({
              ...draft,
              blueprintBlocks: [
                ...draft.blueprintBlocks,
                {
                  id: `block-${draft.blueprintBlocks.length + 1}`,
                  partId: '',
                  label: '',
                  positionX: '0',
                  positionY: '0',
                  positionZ: '0',
                  rotationX: '0',
                  rotationY: '0',
                  rotationZ: '0',
                },
              ],
            }))
          }
        >
          Add block
        </button>
      </div>
      <label className="blueprint-name-field">
        <span>Name</span>
        <input
          value={submissionDraft.blueprintName}
          onChange={(event) =>
            setSubmissionDraft((draft) => ({
              ...draft,
              blueprintName: event.target.value,
            }))
          }
        />
      </label>
      <div className="blueprint-block-list">
        {submissionDraft.blueprintBlocks.map((block, index) => (
          <div className="blueprint-block-row" key={`block-${index}`}>
            <label>
              <span>Block ID</span>
              <input
                value={block.id}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, id: event.target.value } : item,
                    ),
                  }))
                }
              />
            </label>
            <label>
              <span>Part</span>
              <PartSelect
                value={block.partId}
                onChange={(partId) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, partId }
                        : item,
                    ),
                  }))
                }
              />
            </label>
            <label>
              <span>Label</span>
              <input
                value={block.label}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item,
                    ),
                  }))
                }
              />
            </label>
            <fieldset>
              <legend>Position</legend>
              <input
                aria-label={`${block.id || 'block'} position x`}
                type="number"
                step="0.25"
                value={block.positionX}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, positionX: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <input
                aria-label={`${block.id || 'block'} position y`}
                type="number"
                step="0.25"
                value={block.positionY}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, positionY: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <input
                aria-label={`${block.id || 'block'} position z`}
                type="number"
                step="0.25"
                value={block.positionZ}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, positionZ: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
            </fieldset>
            <fieldset>
              <legend>Rotation</legend>
              <input
                aria-label={`${block.id || 'block'} rotation x`}
                type="number"
                step="0.25"
                value={block.rotationX}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, rotationX: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <input
                aria-label={`${block.id || 'block'} rotation y`}
                type="number"
                step="0.25"
                value={block.rotationY}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, rotationY: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <input
                aria-label={`${block.id || 'block'} rotation z`}
                type="number"
                step="0.25"
                value={block.rotationZ}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, rotationZ: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
            </fieldset>
            <button
              type="button"
              onClick={() =>
                setSubmissionDraft((draft) => ({
                  ...draft,
                  blueprintBlocks: draft.blueprintBlocks.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
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
