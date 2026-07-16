'use client'

import type { ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function SelectedActionScreen({
  view,
  onStartExperience,
}: {
  view: ClientGameView
  onStartExperience?: () => void
}) {
  const card = view.publicState.currentSelectedAction

  return (
    <ScreenShell>
      <Panel className="mt-5">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-3xl font-black">今回の行動</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          最後に残ったカードから、この1枚に決まりました。
        </p>
        {card ? (
          <div className="draw-animation mt-6">
            <ActionCardView card={card} />
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-[#fff0be] p-4 text-center text-sm font-black">
            抽選結果を同期しています。
          </p>
        )}
        {view.privateState.canStartExperience ? (
          <PrimaryButton className="mt-6" tone="green" onClick={onStartExperience}>
            行動を開始する
          </PrimaryButton>
        ) : (
          <p className="mt-6 rounded-2xl bg-[#effbea] p-4 text-center text-sm font-black">
            ホストの進行を待っています。
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
