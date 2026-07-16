'use client'

import { useEffect, useState } from 'react'
import type { CardId, ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PlayerStatusList } from '@/components/ui/PlayerStatusList'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function DraftScreen({
  view,
  onSelectDiscard,
}: {
  view: ClientGameView
  onSelectDiscard: (cardId: CardId) => void
}) {
  const [selectedCardId, setSelectedCardId] = useState<CardId>('')

  useEffect(() => {
    setSelectedCardId('')
  }, [view.publicState.draftCycle])

  if (view.privateState.selectedDiscardCardId || !view.privateState.canSelectDiscard) {
    return <DraftWaitingScreen view={view} />
  }

  return (
    <ScreenShell>
      <Panel className="mt-3">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
          handCount={view.privateState.currentHand.length}
        />
        <h1 className="text-2xl font-black">落とすカードを1枚選ぶ</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          毎ターン、残っているカードをすべてシャッフルして配り直します。自分が書いたカードも含めて完全ランダムです。
        </p>
        <p className="mt-3 rounded-full bg-[#f0f7ff] px-3 py-2 text-center text-xs font-black">
          ドラフト {view.publicState.draftCycle} / {view.publicState.draftTotalCycles}
        </p>

        <div className="mt-5 space-y-4">
          {view.privateState.currentHand.map((card) => (
            <ActionCardView
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onClick={() => setSelectedCardId(card.id)}
            />
          ))}
        </div>

        <PrimaryButton
          className="mt-6"
          tone="purple"
          disabled={!selectedCardId || !view.privateState.canSelectDiscard}
          onClick={() => onSelectDiscard(selectedCardId)}
        >
          このカードを落とす
        </PrimaryButton>
      </Panel>
    </ScreenShell>
  )
}

export function DraftWaitingScreen({ view }: { view: ClientGameView }) {
  return (
    <ScreenShell>
      <Panel className="mt-10">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
          handCount={view.privateState.currentHand.length}
        />
        <h1 className="text-2xl font-black">ほかのプレイヤーを待っています</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          全員が選び終わると、残ったカードをシャッフルして次の手札を配ります。
        </p>
        <div className="mt-5">
          <ProgressIndicator
            label="選択完了"
            current={view.publicState.discardSelectedCount}
            total={view.publicState.requiredPlayerCount}
          />
        </div>
        <div className="mt-5">
          <PlayerStatusList
            players={view.publicState.players}
            selfPlayerId={view.privateState.playerId}
            mode="discard"
          />
        </div>
      </Panel>
    </ScreenShell>
  )
}
