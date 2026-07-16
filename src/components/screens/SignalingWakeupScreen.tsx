'use client'

import { RotateCcw } from 'lucide-react'
import type { WakeupStatus } from '@/lib/p2p/peerConfig'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Panel, ScreenShell } from './ScreenShell'

export function SignalingWakeupScreen({
  status,
  onRetry,
  onBack,
}: {
  status: WakeupStatus
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <ScreenShell>
      <Panel className="mt-16 text-center">
        <div className="shuffle-animation mx-auto h-20 w-20 rounded-[1.2rem] bg-[#ffd33f] shadow-[0_8px_0_#d5a900]" />
        <h1 className="mt-6 text-2xl font-black">{status.message}</h1>
        <p className="mt-3 text-sm font-bold text-black/60">
          Render無料枠では通信サーバーが眠っていることがあります。最大90秒ほど待ってから接続します。
        </p>
        {status.status === 'failed' && (
          <div className="mt-6 space-y-3">
            <PrimaryButton tone="blue" onClick={onRetry}>
              <RotateCcw size={18} />
              再試行
            </PrimaryButton>
            <PrimaryButton tone="white" onClick={onBack}>
              トップへ戻る
            </PrimaryButton>
          </div>
        )}
      </Panel>
    </ScreenShell>
  )
}
