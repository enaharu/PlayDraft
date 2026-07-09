import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  children?: ReactNode
}

function IconButton({
  icon: Icon,
  label,
  children,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={cn('icon-button', className)}
    >
      <Icon aria-hidden="true" size={18} />
      {children}
    </button>
  )
}

export default IconButton
