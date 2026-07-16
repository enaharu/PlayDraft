import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function ShuffleScreen({ round }: { round: 1 | 2 }) {
  return (
    <ScreenShell>
      <Panel className="mt-16 text-center">
        <RoundHeader round={round} role="シャッフル中" />
        <div className="deal-animation mx-auto h-28 w-20 rounded-[1.2rem] bg-[#8e65ff] shadow-[0_8px_0_#613bd2]" />
        <h1 className="mt-7 text-2xl font-black">カードを配っています</h1>
      </Panel>
    </ScreenShell>
  )
}
