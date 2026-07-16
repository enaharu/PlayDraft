'use client'

import type { ClientGameView } from '@/types/game'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function ConnectionLostScreen({ view }: { view: ClientGameView }) {
  return (
    <ScreenShell>
      <Panel className="mt-16 text-center">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト端末' : 'ゲスト端末'}
        />
        <h1 className="text-2xl font-black">再接続待ち</h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-black/60">
          {view.publicState.disconnectedPlayerNames.join('、')} さんの接続が切れています。
          現在のゲーム状態はホスト端末に保持されています。
        </p>
        <div className="mt-7 rounded-[1.5rem] bg-[#fff0be] p-4 text-sm font-black">
          接続が戻るまで、カード配布・ドラフト確定・抽選・投票集計・作者公開は進みません。
        </div>
      </Panel>
    </ScreenShell>
  )
}
