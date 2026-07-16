'use client'

import type { ClientGameView } from '@/types/game'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function FinalistScreen({
  view,
  onDraw,
}: {
  view: ClientGameView
  onDraw?: () => void
}) {
  return (
    <ScreenShell>
      <Panel className="mt-8 text-center">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-3xl font-black">最後のカードがそろいました</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          各プレイヤーの手元に残ったカードから、運命の1枚を抽選します。
        </p>
        <div className="finalist-shuffle mx-auto mt-8 grid w-fit grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-32 w-20 rounded-[1rem] border-2 border-white/70 bg-[#8e65ff] shadow-[0_8px_0_rgba(0,0,0,0.18)]"
            />
          ))}
        </div>

        {view.privateState.canDrawAction ? (
          <PrimaryButton className="mt-8" tone="yellow" onClick={onDraw}>
            1枚を抽選する
          </PrimaryButton>
        ) : (
          <p className="mt-8 rounded-2xl bg-[#fff0be] p-4 text-sm font-black">
            ホストが抽選するのを待っています。
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
