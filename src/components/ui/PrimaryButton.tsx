'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'pink' | 'blue' | 'yellow' | 'green' | 'purple' | 'black' | 'white'

const toneClass: Record<Tone, string> = {
  pink: 'bg-[#ff4c93] text-white shadow-[#c71c63]',
  blue: 'bg-[#1788e8] text-white shadow-[#075da8]',
  yellow: 'bg-[#ffd33f] text-[#201600] shadow-[#d5a900]',
  green: 'bg-[#4fd27d] text-[#102416] shadow-[#27a455]',
  purple: 'bg-[#8e65ff] text-white shadow-[#613bd2]',
  black: 'bg-[#15111c] text-white shadow-[#51485d]',
  white: 'bg-white text-[#15111c] shadow-black/20 border-2 border-black/10',
}

export function PrimaryButton({
  children,
  className,
  tone = 'pink',
  showArrow = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  tone?: Tone
  showArrow?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] px-5 py-3 text-center text-base font-black transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45',
        'shadow-[0_6px_0]',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {showArrow && <ArrowRight aria-hidden="true" size={20} />}
    </button>
  )
}
