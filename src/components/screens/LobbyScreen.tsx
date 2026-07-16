'use client'

import type { ClientGameView } from '@/types/game'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PlayerStatusList } from '@/components/ui/PlayerStatusList'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { QRInvite } from '@/components/ui/QRInvite'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function LobbyScreen({
  view,
  inviteUrl,
  connectionLabel,
  onCopyInvite,
  onStartGame,
}: {
  view: ClientGameView
  inviteUrl?: string
  connectionLabel: string
  onCopyInvite?: () => void
  onStartGame?: () => void
}) {
  const publicState = view.publicState
  const privateState = view.privateState

  return (
    <ScreenShell>
      <Panel className="mt-3">
        <RoundHeader
          round={publicState.currentRoundNumber}
          role={privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <h1 className="text-3xl font-black">ロビー</h1>
        <p className="mt-1 text-sm font-bold text-black/60">{connectionLabel}</p>

        <div className="mt-5">
          <ProgressIndicator
            label="参加人数"
            current={publicState.joinedPlayerCount}
            total={publicState.requiredPlayerCount}
          />
        </div>

        <div className="mt-5">
          <PlayerStatusList
            players={publicState.players}
            selfPlayerId={privateState.playerId}
          />
        </div>

        {privateState.isHost && inviteUrl && onCopyInvite && (
          <div className="mt-5">
            <QRInvite inviteUrl={inviteUrl} onCopy={onCopyInvite} />
          </div>
        )}

        {privateState.isHost ? (
          <PrimaryButton
            className="mt-5"
            tone="pink"
            disabled={!privateState.canStartGame}
            onClick={onStartGame}
          >
            ゲーム開始
          </PrimaryButton>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#fff0be] p-4 text-center text-sm font-black">
            ホストがゲームを開始するのを待っています
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
