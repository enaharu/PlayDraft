import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function RoundCompleteScreen({ round }: { round: 1 | 2 }) {
  return (
    <ScreenShell>
      <Panel className="mt-16 text-center">
        <RoundHeader round={round} role="ラウンド完了" />
        <h1 className="text-3xl font-black">Round {round} 完了</h1>
        <p className="mt-3 text-sm font-bold text-black/60">次の進行へ同期しています。</p>
      </Panel>
    </ScreenShell>
  )
}
