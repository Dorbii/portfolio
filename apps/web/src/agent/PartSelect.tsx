import { PART_CATALOG } from '../../../../packages/catalog/src/index.js'

export function PartSelect({
  onChange,
  value,
}: {
  onChange: (partId: string) => void
  value: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select part</option>
      {PART_CATALOG.map((part) => (
        <option key={part.id} value={part.id}>
          {part.displayName}
        </option>
      ))}
    </select>
  )
}
