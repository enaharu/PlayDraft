'use client'

import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, ScreenShell } from './ScreenShell'

export function CreateRoomScreen({
  name,
  onNameChange,
  onCreate,
  onBack,
}: {
  name: string
  onNameChange: (value: string) => void
  onCreate: () => void
  onBack: () => void
}) {
  return (
    <ScreenShell>
      <Panel className="mt-10">
        <h1 className="text-3xl font-black">ホストの名前</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          この端末が正式なゲーム状態を持ちます。あとから同じ端末で復旧できます。
        </p>
        <label className="mt-6 block">
          <span className="text-sm font-black">表示名</span>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-4 text-lg font-black outline-none focus:border-[#ff4c93]"
            placeholder="例: Haruki"
          />
        </label>
        <div className="mt-6 space-y-3">
          <PrimaryButton tone="pink" disabled={!name.trim()} onClick={onCreate}>
            ルームを作成
          </PrimaryButton>
          <PrimaryButton tone="white" onClick={onBack}>
            トップへ戻る
          </PrimaryButton>
        </div>
      </Panel>
    </ScreenShell>
  )
}
