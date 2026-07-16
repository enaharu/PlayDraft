'use client'

import { useState } from 'react'
import type { ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function RevealScreen({
  view,
  onFinishReveal,
}: {
  view: ClientGameView
  onFinishReveal?: () => void
}) {
  const winningCard = view.publicState.winningCard
  const [mountedAt] = useState(() => Date.now())
  const startsAt = view.publicState.revealStartedAt ?? mountedAt
  const delayMs = Math.max(0, startsAt - mountedAt)

  return (
    <ScreenShell>
      <Panel className="mt-5 text-center">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <div className="reveal-sequence" style={{ animationDelay: `${delayMs}ms` }}>
          <p className="text-lg font-black text-[#ff4c93]">優勝したアイデアは……</p>
          <div className="countdown mt-4 text-6xl font-black">3</div>
          {winningCard && (
            <div className="flip-card mx-auto mt-6 max-w-sm">
              <ActionCardView card={winningCard} result />
            </div>
          )}
          <h1 className="mt-7 text-3xl font-black">
            優勝は{view.publicState.winnerName}さん！
          </h1>
          <p className="mt-2 rounded-2xl bg-[#fff0be] p-4 text-xl font-black">
            賞金1,000円獲得！
          </p>
        </div>
        <div className="confetti" aria-hidden="true" />
        {view.privateState.canFinishReveal && (
          <PrimaryButton className="mt-8" tone="pink" onClick={onFinishReveal}>
            結果一覧へ
          </PrimaryButton>
        )}
      </Panel>
    </ScreenShell>
  )
}
