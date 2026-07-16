'use client'

import { PartyPopper, ScanLine, Sparkles, Users } from 'lucide-react'
import { APP_NAME, APP_NAME_JA, CATCH_COPY } from '@/lib/constants'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, ScreenShell } from './ScreenShell'

export function TopScreen({
  onCreate,
  onRestoreHost,
  canRestoreHost,
}: {
  onCreate: () => void
  onRestoreHost?: () => void
  canRestoreHost?: boolean
}) {
  return (
    <ScreenShell>
      <Panel className="min-h-[calc(100vh-32px)] overflow-hidden bg-[#fff8d8]">
        <div className="pt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#ffd33f] shadow-[0_7px_0_#d5a900]">
            <Sparkles size={34} />
          </div>
          <h1 className="mt-5 text-5xl font-black leading-none drop-shadow-[0_5px_0_#ffd33f]">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm font-black text-black/55">{APP_NAME_JA}</p>
          <p className="mt-4 text-lg font-black">{CATCH_COPY}</p>
        </div>

        <div className="mt-9 grid grid-cols-3 gap-2 text-center text-xs font-black">
          <div className="rounded-3xl bg-[#ffeff6] p-3">
            <Users className="mx-auto text-[#ff4c93]" size={24} />
            <p className="mt-2">3人専用</p>
          </div>
          <div className="rounded-3xl bg-[#eef8ff] p-3">
            <ScanLine className="mx-auto text-[#1788e8]" size={24} />
            <p className="mt-2">招待URL参加</p>
          </div>
          <div className="rounded-3xl bg-[#effbea] p-3">
            <PartyPopper className="mx-auto text-[#27a455]" size={24} />
            <p className="mt-2">行動ドラフト</p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <PrimaryButton tone="pink" onClick={onCreate} showArrow>
            ルームを作る
          </PrimaryButton>
          {canRestoreHost && onRestoreHost && (
            <PrimaryButton tone="white" onClick={onRestoreHost}>
              前回のホストルームを復元
            </PrimaryButton>
          )}
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-white p-4 text-sm font-bold leading-relaxed">
          <p className="font-black">遊び方</p>
          <p className="mt-2">
            実際にやってみたい行動を5枚ずつ作成し、匿名で配られたカードをドラフトします。
            最後に残ったカードから1枚を実行し、作者以外の2人が採点します。
            参加者はホストが共有した招待URLから参加します。
          </p>
        </div>
      </Panel>
    </ScreenShell>
  )
}
