import {
  purchaseCostLabel,
} from './roundPlanDraft'
import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'
import { PartSelect } from './PartSelect'

export function RoundPlanPurchaseSection({
  setSubmissionDraft,
  submissionDraft,
}: RoundPlanEditorSectionProps) {
  return (
    <section className="plan-section" aria-labelledby="purchases-heading">
      <div className="plan-section-header">
        <h3 id="purchases-heading">Purchases</h3>
        <button
          type="button"
          onClick={() =>
            setSubmissionDraft((draft) => ({
              ...draft,
              purchases: [...draft.purchases, { partId: '', quantity: '1' }],
            }))
          }
        >
          Add purchase
        </button>
      </div>
      <div className="purchase-list">
        {submissionDraft.purchases.map((purchase, index) => (
          <div className="purchase-row" key={`purchase-${index}`}>
            <label>
              <span>Part</span>
              <PartSelect
                value={purchase.partId}
                onChange={(partId) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    purchases: draft.purchases.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, partId } : item,
                    ),
                  }))
                }
              />
            </label>
            <label>
              <span>Qty</span>
              <input
                type="number"
                min={0}
                value={purchase.quantity}
                onChange={(event) =>
                  setSubmissionDraft((draft) => ({
                    ...draft,
                    purchases: draft.purchases.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
            </label>
            <strong>{purchaseCostLabel(purchase)}</strong>
            <button
              type="button"
              onClick={() =>
                setSubmissionDraft((draft) => ({
                  ...draft,
                  purchases: draft.purchases.filter((_, itemIndex) => itemIndex !== index),
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
