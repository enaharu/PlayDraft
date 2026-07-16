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
  onRecreateRoom,
}: {
  view: ClientGameView
  inviteUrl?: string
  connectionLabel: string
  onCopyInvite?: () => void
  onStartGame?: () => void
  onRecreateRoom?: () => void
}) {
  const publicState = view.publicState
  const privateState = view.privateState

  return (
    <ScreenShell>
      <Panel className="mt-3">
        <RoundHeader
          round={publicState.currentRoundNumber}
          role={privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-3xl font-black">参加者を募集</h1>
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
          <div className="mt-5 grid gap-3">
            <PrimaryButton
              tone="pink"
              disabled={!privateState.canStartGame}
              onClick={onStartGame}
            >
              ゲーム開始
            </PrimaryButton>
            <PrimaryButton tone="white" onClick={onRecreateRoom}>
              部屋を作り直す
            </PrimaryButton>
            <p className="text-center text-xs font-bold leading-relaxed text-black/55">
              参加できない人がいる時に使います。新しい招待URLが発行され、古いURLは使えなくなります。
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#fff0be] p-4 text-center text-sm font-black">
            ホストがゲームを開始するのを待っています。
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
