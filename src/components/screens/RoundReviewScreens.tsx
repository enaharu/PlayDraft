'use client'

import { useState } from 'react'
import type { ClientGameView } from '@/types/game'
import { ActionCardView } from '@/components/ui/ActionCardView'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

export function ScoringScreen({
  view,
  onSubmitScore,
}: {
  view: ClientGameView
  onSubmitScore: (satisfaction: number, surprise: number) => void
}) {
  const [satisfaction, setSatisfaction] = useState(20)
  const [surprise, setSurprise] = useState(20)
  const card = view.publicState.currentSelectedAction

  if (!view.privateState.canScoreRound) {
    return (
      <ScreenShell>
        <Panel className="mt-10">
          <RoundHeader
            round={view.publicState.currentRoundNumber}
            role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
          />
          <h1 className="text-2xl font-black">作者を公開しました</h1>
          <p className="mt-2 text-sm font-bold text-black/60">
            作者以外の2人が採点すると結果に進みます。
          </p>
          {card && (
            <div className="mt-5">
              <ActionCardView card={card} result />
            </div>
          )}
          <div className="mt-5">
            <ProgressIndicator
              label="採点完了"
              current={view.publicState.scoreSubmittedCount}
              total={view.publicState.requiredPlayerCount - 1}
            />
          </div>
        </Panel>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <Panel className="mt-5">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-2xl font-black">作者を見て採点</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          満足度25点、意外度25点。2人合計で100点満点です。
        </p>
        {card && (
          <div className="mt-5">
            <ActionCardView card={card} result />
          </div>
        )}
        <ScoreInput label="満足度" value={satisfaction} onChange={setSatisfaction} />
        <ScoreInput label="意外度" value={surprise} onChange={setSurprise} />
        <PrimaryButton
          className="mt-6"
          tone="pink"
          onClick={() => onSubmitScore(satisfaction, surprise)}
        >
          {satisfaction + surprise}点で送信
        </PrimaryButton>
      </Panel>
    </ScreenShell>
  )
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="mt-5 block rounded-2xl bg-white p-4 font-black">
      <span className="flex items-center justify-between text-sm">
        {label}
        <span>{value} / 25</span>
      </span>
      <input
        type="range"
        min={0}
        max={25}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full"
      />
    </label>
  )
}

export function RoundSummaryScreen({
  view,
  onContinue,
  onFinish,
}: {
  view: ClientGameView
  onContinue?: () => void
  onFinish?: () => void
}) {
  const card = view.publicState.currentSelectedAction

  return (
    <ScreenShell>
      <Panel className="mt-5">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-2xl font-black">ラウンド結果</h1>
        {card && (
          <div className="mt-5">
            <ActionCardView card={card} result />
          </div>
        )}
        {view.privateState.canContinueRound ? (
          <div className="mt-6 grid gap-3">
            <PrimaryButton tone="green" onClick={onContinue}>
              次のラウンドへ
            </PrimaryButton>
            <PrimaryButton tone="white" onClick={onFinish}>
              終了してランキングを見る
            </PrimaryButton>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#fff0be] p-4 text-center text-sm font-black">
            ホストが次の進行を選びます。
          </p>
        )}
      </Panel>
    </ScreenShell>
  )
}
