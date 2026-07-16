'use client'

import { useState } from 'react'
import type { CardId, ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PlayerStatusList } from '@/components/ui/PlayerStatusList'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function VotingScreen({
  view,
  onVote,
}: {
  view: ClientGameView
  onVote: (cardId: CardId) => void
}) {
  const [selectedCardId, setSelectedCardId] = useState<CardId>('')

  if (view.privateState.hasVoted) {
    return <VotingWaitingScreen view={view} />
  }

  return (
    <ScreenShell>
      <Panel className="mt-5">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <h1 className="text-2xl font-black">
          一番「予想以上に楽しかった」行動は？
        </h1>
        <p className="mt-2 text-sm font-bold leading-relaxed text-black/60">
          意外性、満足感、またやりたいかで選びます。全員が投票するまで得票数と作者は公開されません。
        </p>
        <div className="mt-5 space-y-4">
          {view.publicState.voteChoices.map((card) => (
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
          tone="pink"
          disabled={!selectedCardId || !view.privateState.canVote}
          onClick={() => onVote(selectedCardId)}
        >
          この行動に投票
        </PrimaryButton>
      </Panel>
    </ScreenShell>
  )
}

export function VotingWaitingScreen({ view }: { view: ClientGameView }) {
  return (
    <ScreenShell>
      <Panel className="mt-10">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <h1 className="text-2xl font-black">投票済みです</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          ほかのプレイヤーの投票先は、全員の投票が終わるまで表示されません。
        </p>
        <div className="mt-5">
          <ProgressIndicator
            label="投票完了"
            current={view.publicState.voteSubmittedCount}
            total={view.publicState.requiredPlayerCount}
          />
        </div>
        <div className="mt-5">
          <PlayerStatusList
            players={view.publicState.players}
            selfPlayerId={view.privateState.playerId}
            mode="vote"
          />
        </div>
      </Panel>
    </ScreenShell>
  )
}
