'use client'

import type { ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, ScreenShell } from './ScreenShell'

export function ResultScreen({
  view,
  onHome,
}: {
  view: ClientGameView
  onHome: () => void
}) {
  const winningCard = view.publicState.winningCard ?? view.publicState.resultCards[0]
  const winnerName = view.publicState.winnerName ?? winningCard?.authorName

  return (
    <ScreenShell wide>
      <Panel className="mt-3">
        <div className="text-center">
          <p className="text-sm font-black text-[#ff4c93]">最終結果</p>
          <h1 className="mt-1 text-4xl font-black">行動ランキング</h1>
          {winningCard && (
            <div className="mt-5 rounded-2xl bg-[#fff0be] p-4 text-left">
              <p className="text-xs font-black text-black/60">優勝</p>
              <p className="mt-1 text-2xl font-black">{winnerName} さん</p>
              <p className="mt-1 text-sm font-bold text-black/65">
                「{winningCard.title}」を書いた人が最高得点です。
              </p>
            </div>
          )}
        </div>

        <div className="mt-7 space-y-4">
          {view.publicState.resultCards.map((card, index) => (
            <div
              key={card.id}
              className="grid gap-3 rounded-[1.5rem] border-2 border-black/10 bg-[#fafafa] p-3 md:grid-cols-[92px_1fr]"
            >
              <div className="flex items-center justify-center rounded-2xl bg-[#15111c] px-4 py-3 text-white md:min-h-full md:flex-col">
                <span className="text-xs font-black opacity-70">RANK</span>
                <span className="text-3xl font-black">{index + 1}</span>
              </div>
              <ActionCardView card={card} result />
            </div>
          ))}
        </div>

        <PrimaryButton className="mt-7" tone="black" onClick={onHome}>
          ホームに戻る
        </PrimaryButton>
      </Panel>
    </ScreenShell>
  )
}
