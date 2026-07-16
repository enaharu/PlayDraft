'use client'

import { Check, Clock, MapPin, WalletCards } from 'lucide-react'
import type { AnonymousActionCard, ResultCardView } from '@/types/game'
import { cn } from '@/utils/cn'

export function ActionCardView({
  card,
  selected = false,
  onClick,
  compact = false,
  result,
}: {
  card: AnonymousActionCard | ResultCardView
  selected?: boolean
  onClick?: () => void
  compact?: boolean
  result?: boolean
}) {
  const isResult = 'authorName' in card
  const durationMinutes = card.durationMinutes ?? undefined
  const budgetPerPerson = card.budgetPerPerson ?? undefined

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'card-surface relative w-full overflow-hidden rounded-[1.4rem] border-2 p-4 text-left shadow-[0_7px_0_rgba(0,0,0,0.12)] transition',
        selected ? 'border-[#ff4c93] bg-[#fff2f7]' : 'border-black/10 bg-white',
        onClick && 'active:translate-y-1 active:shadow-none',
      )}
    >
      <div className="absolute right-3 top-3 rounded-full bg-[#fff0be] px-3 py-1 text-xs font-black">
        R{card.roundNumber}
      </div>
      <div className="pr-14">
        <p className={cn('font-black leading-snug', compact ? 'text-lg' : 'text-xl')}>
          {card.title}
        </p>
        {card.description && (
          <p className="mt-2 text-sm font-bold leading-relaxed text-black/65">
            {card.description}
          </p>
        )}
      </div>

      {(card.area || durationMinutes || budgetPerPerson !== undefined) && (
        <div className="mt-4 grid gap-2 text-xs font-black text-black/70">
          {card.area && (
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} />
              {card.area}
            </span>
          )}
          {durationMinutes && (
            <span className="inline-flex items-center gap-2">
              <Clock size={15} />
              {durationMinutes}分
            </span>
          )}
          {budgetPerPerson !== undefined && (
            <span className="inline-flex items-center gap-2">
              <WalletCards size={15} />
              1人 {budgetPerPerson.toLocaleString('ja-JP')}円
            </span>
          )}
        </div>
      )}

      {selected && (
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ff4c93] px-3 py-1 text-xs font-black text-white">
          <Check size={15} />
          選択中
        </span>
      )}

      {isResult && result && (
        <div className="mt-4 rounded-2xl bg-[#f0f7ff] p-3 text-sm font-black">
          作者 {card.authorName} / 合計 {card.totalScore}点
          <span className="mt-1 block text-xs text-black/60">
            満足度 {card.satisfactionTotal}点・意外度 {card.surpriseTotal}点
          </span>
          {card.comment && (
            <span className="mt-2 block rounded-xl bg-white/70 p-2 text-xs">
              コメント {card.comment}
            </span>
          )}
          {card.isWinner && <span className="ml-2 text-[#ff4c93]">最高得点</span>}
        </div>
      )}
    </button>
  )
}
