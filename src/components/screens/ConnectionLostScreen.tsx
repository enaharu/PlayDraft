'use client'

import type { ClientGameView } from '@/types/game'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { QRInvite } from '@/components/ui/QRInvite'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function ConnectionLostScreen({
  view,
  inviteUrl,
  onCopyInvite,
  onResetHome,
}: {
  view: ClientGameView
  inviteUrl?: string
  onCopyInvite?: () => void
  onResetHome: () => void
}) {
  const names = view.publicState.disconnectedPlayerNames.join('、')

  return (
    <ScreenShell>
      <Panel className="mt-10 text-center">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-2xl font-black">再接続待ち</h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-black/60">
          {names || '参加者'}さんの接続が切れています。全員が戻るまでゲームは一時停止します。
        </p>

        <div className="mt-6 rounded-[1.5rem] bg-[#fff0be] p-4 text-sm font-black leading-relaxed">
          ゲストが初期画面に戻った場合は、招待URLをもう一度開き、同じ名前で参加すると元の席に戻れます。
        </div>

        {view.privateState.isHost && inviteUrl && onCopyInvite && (
          <div className="mt-5">
            <QRInvite inviteUrl={inviteUrl} onCopy={onCopyInvite} />
          </div>
        )}

        <div className="mt-6 rounded-[1.5rem] border-2 border-black/10 bg-white p-4">
          <p className="text-sm font-black leading-relaxed text-black/65">
            どうしても復帰できない場合は、この端末の保存データを消してホームに戻れます。
          </p>
          <PrimaryButton className="mt-4" tone="black" onClick={onResetHome}>
            すべてリセットしてホームへ戻る
          </PrimaryButton>
        </div>
      </Panel>
    </ScreenShell>
  )
}
