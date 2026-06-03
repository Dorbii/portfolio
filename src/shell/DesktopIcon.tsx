type DesktopIconProps = {
  glyph: string
  title: string
  subtitle: string
  isActive: boolean
  onLaunch: () => void
}

export default function DesktopIcon({
  glyph,
  title,
  subtitle,
  isActive,
  onLaunch,
}: DesktopIconProps) {
  return (
    <button
      className={`desktop-icon${isActive ? ' active' : ''}`}
      type="button"
      onClick={onLaunch}
      aria-label={`Open ${title}`}
    >
      <span className="desktop-icon-glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="desktop-icon-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </button>
  )
}
