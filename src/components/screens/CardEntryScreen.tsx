'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ActionCardInput, ClientGameView } from '@/types/game'
import { CARDS_PER_PLAYER } from '@/types/game'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PlayerStatusList } from '@/components/ui/PlayerStatusList'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { Panel, RoundHeader, ScreenShell } from './ScreenShell'

function createBlankCard(): ActionCardInput {
  return {
    title: '',
    description: '',
    area: '',
    durationMinutes: undefined,
    budgetPerPerson: undefined,
    requirementsConfirmed: true,
  }
}

function cardsFromView(view: ClientGameView): ActionCardInput[] {
  if (view.privateState.editableCards.length > 0) {
    return view.privateState.editableCards.map((card) => ({
      title: card.title,
      description: card.description,
      area: card.area,
      durationMinutes: card.durationMinutes ?? undefined,
      budgetPerPerson: card.budgetPerPerson ?? undefined,
      requirementsConfirmed: true,
    }))
  }

  return Array.from({ length: CARDS_PER_PLAYER }, createBlankCard)
}

export function CardEntryScreen({
  view,
  error,
  onSubmit,
}: {
  view: ClientGameView
  error?: string
  onSubmit: (cards: ActionCardInput[]) => void
}) {
  const baseCardCount = view.privateState.editableCards.length || CARDS_PER_PLAYER
  const [cards, setCards] = useState<ActionCardInput[]>(() => cardsFromView(view))
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setCards(cardsFromView(view))
    setIsSubmitting(false)
    // Reset only when a new player or round starts; live snapshots should not erase typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.publicState.currentRoundNumber, view.privateState.playerId])

  useEffect(() => {
    if (error) {
      setIsSubmitting(false)
    }
  }, [error])

  useEffect(() => {
    if (!view.privateState.canSubmitCards && !view.privateState.submittedThisRound) {
      setIsSubmitting(false)
    }
  }, [view.privateState.canSubmitCards, view.privateState.submittedThisRound])

  const canAddCard =
    view.privateState.editableCards.length > 0 && cards.length < CARDS_PER_PLAYER

  const canSubmit = useMemo(
    () =>
      view.privateState.canSubmitCards &&
      !isSubmitting &&
      cards.length >= baseCardCount &&
      cards.length <= CARDS_PER_PLAYER &&
      cards.every(
        (card) =>
          card.title.trim() &&
          (card.budgetPerPerson == null || card.budgetPerPerson >= 0),
      ),
    [baseCardCount, cards, isSubmitting, view.privateState.canSubmitCards],
  )

  if (view.privateState.submittedThisRound || isSubmitting) {
    return <CardEntryWaitingScreen view={view} />
  }

  const isRevision = view.privateState.editableCards.length > 0

  return (
    <ScreenShell>
      <Panel className="mt-3">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-2xl font-black">
          {isRevision ? '手札を修正する' : '行動カードを5枚作成'}
        </h1>
        <p className="mt-2 text-sm font-bold leading-relaxed text-black/60">
          {isRevision
            ? '残っているカードを書き直せます。5枚未満なら、追加カードを作っても作らなくてもOKです。'
            : '全員が5枚ずつ行動案を作成します。場所・時間・金額は任意です。'}
        </p>

        {error && (
          <p className="mt-4 rounded-2xl bg-[#ffe4ec] p-3 text-sm font-black leading-relaxed text-[#a3144b]">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-5">
          {cards.map((card, index) => (
            <div key={index} className="rounded-[1.5rem] border-2 border-black/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-black">カード{index + 1}</p>
                {index >= baseCardCount && (
                  <button
                    type="button"
                    className="rounded-full bg-black/5 px-3 py-1 text-xs font-black text-black/60"
                    onClick={() =>
                      setCards((previous) =>
                        previous.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    追加をやめる
                  </button>
                )}
              </div>
              <CardInput
                card={card}
                onChange={(nextCard) =>
                  setCards((previous) =>
                    previous.map((item, itemIndex) =>
                      itemIndex === index ? nextCard : item,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>

        {canAddCard && (
          <PrimaryButton
            className="mt-5"
            tone="white"
            onClick={() => setCards((previous) => [...previous, createBlankCard()])}
          >
            カードを1枚追加する
          </PrimaryButton>
        )}

        <PrimaryButton
          className="mt-6"
          tone="pink"
          disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit) {
              return
            }
            setIsSubmitting(true)
            onSubmit(cards)
          }}
        >
          提出する
        </PrimaryButton>
      </Panel>
    </ScreenShell>
  )
}

function CardInput({
  card,
  onChange,
}: {
  card: ActionCardInput
  onChange: (card: ActionCardInput) => void
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-black text-[#a3144b]">行動名（必須）</span>
        <input
          value={card.title}
          onChange={(event) => onChange({ ...card, title: event.target.value })}
          className="w-full rounded-2xl border-2 border-black/10 px-3 py-3 font-black outline-none focus:border-[#ff4c93]"
          placeholder="例：知らない駅で昼ごはんを探す"
        />
      </label>
      <textarea
        value={card.description}
        onChange={(event) => onChange({ ...card, description: event.target.value })}
        className="min-h-20 w-full resize-none rounded-2xl border-2 border-black/10 px-3 py-3 text-sm font-bold outline-none focus:border-[#ff4c93]"
        placeholder="内容・楽しみ方（任意）"
      />
      <input
        value={card.area}
        onChange={(event) => onChange({ ...card, area: event.target.value })}
        className="w-full rounded-2xl border-2 border-black/10 px-3 py-3 font-bold outline-none focus:border-[#1788e8]"
        placeholder="場所・エリア（任意）"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={card.durationMinutes ?? ''}
          onChange={(event) =>
            onChange({
              ...card,
              durationMinutes: event.target.value
                ? (Number(event.target.value) as 60 | 90 | 120)
                : undefined,
            })
          }
          className="rounded-2xl border-2 border-black/10 px-3 py-3 font-bold"
        >
          <option value="">時間（任意）</option>
          <option value={60}>60分</option>
          <option value={90}>90分</option>
          <option value={120}>120分</option>
        </select>
        <input
          type="number"
          min={0}
          value={card.budgetPerPerson ?? ''}
          onChange={(event) =>
            onChange({
              ...card,
              budgetPerPerson: event.target.value
                ? Number(event.target.value)
                : undefined,
            })
          }
          className="rounded-2xl border-2 border-black/10 px-3 py-3 font-bold"
          placeholder="金額（任意）"
        />
      </div>
    </div>
  )
}

export function CardEntryWaitingScreen({ view }: { view: ClientGameView }) {
  return (
    <ScreenShell>
      <Panel className="mt-10">
        <RoundHeader
          round={view.publicState.currentRoundNumber}
          role={view.privateState.isHost ? 'ホスト' : 'ゲスト'}
        />
        <h1 className="text-2xl font-black">提出済みです</h1>
        <p className="mt-2 text-sm font-bold text-black/60">
          全員の提出が終わるとドラフトに進みます。
        </p>
        <div className="mt-5">
          <ProgressIndicator
            label="提出完了"
            current={view.publicState.submittedCount}
            total={view.publicState.requiredPlayerCount}
          />
        </div>
        <div className="mt-5">
          <PlayerStatusList
            players={view.publicState.players}
            selfPlayerId={view.privateState.playerId}
            mode="submit"
          />
        </div>
      </Panel>
    </ScreenShell>
  )
}
