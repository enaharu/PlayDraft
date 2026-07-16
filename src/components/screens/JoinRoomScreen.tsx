'use client'

import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, ScreenShell } from './ScreenShell'

export function JoinRoomScreen({
  name,
  error,
  onNameChange,
  onJoin,
  onBack,
}: {
  name: string
  error?: string
  onNameChange: (value: string) => void
  onJoin: () => void
  onBack: () => void
}) {
  return (
    <ScreenShell>
      <Panel className="mt-10">
        <h1 className="text-3xl font-black">ルームに参加</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          招待URLからホストへ直接接続します。名前はルーム内で重複できません。
        </p>
        {error && (
          <p className="mt-4 rounded-2xl bg-[#ffe4ee] p-3 text-sm font-black text-[#a3144b]">
            {error}
          </p>
        )}
        <label className="mt-6 block">
          <span className="text-sm font-black">表示名</span>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-4 text-lg font-black outline-none focus:border-[#1788e8]"
            placeholder="例: Mina"
          />
        </label>
        <div className="mt-6 space-y-3">
          <PrimaryButton tone="blue" disabled={!name.trim()} onClick={onJoin}>
            参加する
          </PrimaryButton>
          <PrimaryButton tone="white" onClick={onBack}>
            トップへ戻る
          </PrimaryButton>
        </div>
      </Panel>
    </ScreenShell>
  )
}
