export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

export function formatMsInterval(intervalMs: number): string {
  if (intervalMs >= 1_000) {
    return `${intervalMs / 1_000}s`
  }

  return `${intervalMs}ms`
}

export function formatClockTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function formatDurationSeconds(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}s`
}
