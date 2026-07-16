import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function ScreenShell({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-4 text-[#17111f]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-3 top-10 h-10 w-10 rotate-12 rounded-xl bg-[#ff4c93]" />
        <div className="absolute right-5 top-24 h-12 w-12 rotate-45 rounded-2xl bg-[#ffd33f]" />
        <div className="absolute bottom-24 left-4 h-12 w-12 -rotate-12 rounded-2xl bg-[#4fd27d]" />
        <div className="absolute bottom-8 right-7 h-9 w-9 rounded-full bg-[#1788e8]" />
      </div>
      <div className={cn('relative z-10 mx-auto', wide ? 'max-w-4xl' : 'max-w-[430px]')}>
        {children}
      </div>
    </main>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-[1.9rem] border-2 border-black/10 bg-white/90 p-5 shadow-[0_14px_0_rgba(0,0,0,0.08)] backdrop-blur',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function RoundHeader({
  round,
  role,
  handCount,
}: {
  round: number
  role: string
  handCount?: number
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="rounded-full bg-[#15111c] px-3 py-1 text-xs font-black text-white">
        Round {round}
      </span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
        {role}
        {typeof handCount === 'number' ? ` / 手札${handCount}枚` : ''}
      </span>
    </div>
  )
}
