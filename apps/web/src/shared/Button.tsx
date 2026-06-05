import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({
  className,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  const classes = ['ui-button', `ui-button-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} type={type} {...props} />
}
