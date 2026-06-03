import type { ReactNode } from 'react'

type WindowMode = 'open' | 'minimized' | 'maximized'

type DesktopWindowProps = {
  appId: string
  title: string
  glyph: string
  mode: WindowMode
  isActive: boolean
  zIndex: number
  children: ReactNode
  onClose: () => void
  onFocus: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
}

export default function DesktopWindow({
  appId,
  title,
  glyph,
  mode,
  isActive,
  zIndex,
  children,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
}: DesktopWindowProps) {
  const titleId = `${appId}-window-title`

  return (
    <section
      className={`desktop-window ${mode}${isActive ? ' active' : ''}`}
      style={{ zIndex }}
      hidden={mode === 'minimized'}
      role="dialog"
      aria-labelledby={titleId}
      onMouseDown={onFocus}
    >
      <header className="window-titlebar">
        <div className="window-title" id={titleId}>
          <span aria-hidden="true">{glyph}</span>
          <strong>{title}</strong>
        </div>
        <div className="window-controls" aria-label={`${title} window controls`}>
          <button type="button" onClick={onMinimize} aria-label="Minimize">
            <span aria-hidden="true">-</span>
          </button>
          <button
            type="button"
            onClick={onToggleMaximize}
            aria-label={mode === 'maximized' ? 'Restore' : 'Maximize'}
          >
            <span aria-hidden="true">{mode === 'maximized' ? '[]' : '[ ]'}</span>
          </button>
          <button type="button" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      </header>
      <div className="window-content">{children}</div>
    </section>
  )
}
