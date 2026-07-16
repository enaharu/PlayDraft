'use client'

import type { ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function ExperienceScreen({
  view,
  onCompleteExperience,
}: {
  view: ClientGameView
  onCompleteExperience?: () => void
}) {
  const card = view.publicState.selectedExperiences.find(
    (candidate) => candidate.roundNumber === view.publicState.currentRoundNumber,
  )

  return (
    <ScreenShell>
      <Panel className="mt-5">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <h1 className="text-3xl font-black">体験中</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          タイマーはありません。終わったらホスト端末で次へ進めます。
        </p>
        {card && (
          <div className="mt-6">
            <ActionCardView card={card} />
          </div>
        )}
        {view.privateState.canCompleteExperience ? (
          <PrimaryButton className="mt-6" tone="pink" onClick={onCompleteExperience}>
            体験が終わった
          </PrimaryButton>
        ) : (
          <p className="mt-6 rounded-2xl bg-[#fff0be] p-4 text-center text-sm font-black">
            3人で体験してください
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
