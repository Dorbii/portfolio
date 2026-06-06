import type {
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from 'react'

export { Button } from './Button'
export type { ButtonVariant } from './Button'

type ClassNameProps = {
  className?: string
}

type PanelProps = HTMLAttributes<HTMLElement>

export function Panel({ className, ...props }: PanelProps) {
  return <section className={joinClasses('ui-panel', className)} {...props} />
}

type SectionHeadingProps = ClassNameProps & {
  aside?: ReactNode
  id?: string
  kicker?: string
  level?: 2 | 3
  title: string
}

export function SectionHeading({
  aside,
  className,
  id,
  kicker,
  level = 2,
  title,
}: SectionHeadingProps) {
  const heading = level === 3 ? <h3 id={id}>{title}</h3> : <h2 id={id}>{title}</h2>

  return (
    <div className={joinClasses('ui-section-heading', className)}>
      <div>
        {kicker ? <span className="ui-section-kicker">{kicker}</span> : null}
        {heading}
      </div>
      {aside ? <p>{aside}</p> : null}
    </div>
  )
}

export function SubsectionTitle({
  className,
  id,
  title,
}: ClassNameProps & {
  id: string
  title: string
}) {
  return <h2 className={joinClasses('ui-subsection-title', className)} id={id}>{title}</h2>
}

export function MetricGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDListElement>) {
  return <dl className={joinClasses('ui-metric-grid', className)} {...props} />
}

export function MetricRow({
  className,
  label,
  value,
}: ClassNameProps & {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div className={joinClasses('ui-metric-row', className)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function ActionGroup({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses('ui-action-group', className)} {...props} />
}

export function FormField({
  children,
  className,
  label,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode
}) {
  return (
    <label className={joinClasses('ui-form-field', className)} {...props}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export type StatusTone = 'neutral' | 'ok' | 'warning' | 'danger' | 'red' | 'blue'

export function StatusBadge({
  children,
  className,
  tone = 'neutral',
}: ClassNameProps & {
  children: ReactNode
  tone?: StatusTone
}) {
  return (
    <span className={joinClasses('ui-status-badge', `tone-${tone}`, className)}>
      {children}
    </span>
  )
}

export function RoleBadge({
  children,
  className,
  role,
}: ClassNameProps & {
  children: ReactNode
  role: 'red' | 'blue'
}) {
  return (
    <span className={joinClasses('ui-role-badge', role, className)}>
      {children}
    </span>
  )
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}
