import { describe, expect, it } from 'vitest'
import type { ActionCardInput, ClientGameView } from '@/types/game'
import type {
  JoinRequestMessage,
  ReconnectRequestMessage,
  SelectDiscardMessage,
  SubmitCardsMessage,
} from '@/types/network'
import { HostGameEngine, createInitialHostState } from './hostReducer'
import { MemoryTransport } from '@/lib/p2p/transport'

function cards(prefix: string): ActionCardInput[] {
  return Array.from({ length: 5 }, (_, index) => ({
    title: `${prefix} ${index + 1}`,
    description: '',
    area: '東京23区',
    durationMinutes: 90,
    budgetPerPerson: 1200,
    requirementsConfirmed: true,
  }))
}

function meta(requestId: string, knownRevision: number) {
  return {
    protocolVersion: 1 as const,
    requestId,
    sentAt: 1,
    knownRevision,
  }
}

function joinMessage(
  requestId: string,
  clientId: string,
  displayName: string,
): JoinRequestMessage {
  return {
    ...meta(requestId, 0),
    type: 'JOIN_REQUEST',
    roomId: 'room',
    roomToken: 'token-secret',
    clientId,
    displayName,
  }
}

function createEngine() {
  const transport = new MemoryTransport()
  const state = createInitialHostState({
    roomId: 'room',
    roomToken: 'token-secret',
    hostPeerId: 'host-peer',
    hostPlayerId: 'host',
    hostClientId: 'client-host',
    hostReconnectToken: 'host-rt',
    hostName: 'Host',
    nowIso: '2026-01-01T00:00:00.000Z',
  })
  const engine = new HostGameEngine(state, transport, {
    randomInt: () => 0,
    createCardId: (() => {
      let index = 0
      return () => {
        index += 1
        return `card-${index}`
      }
    })(),
    now: () => 1_800_000_000_000,
  })

  engine.handleMessage('conn-a', joinMessage('join-a', 'client-a', 'A'))
  engine.handleMessage('conn-b', joinMessage('join-b', 'client-b', 'B'))

  return { engine, transport }
}

function startDraft(engine: HostGameEngine): void {
  engine.startGame()
  engine.submitCardsForPlayer('host', 1, cards('host'))

  const submitA: SubmitCardsMessage = {
    ...meta('submit-a', engine.state.revision),
    type: 'SUBMIT_CARDS',
    roundNumber: 1,
    cards: cards('a'),
  }
  engine.handleMessage('conn-a', submitA)

  const submitB: SubmitCardsMessage = {
    ...meta('submit-b', engine.state.revision),
    type: 'SUBMIT_CARDS',
    roundNumber: 1,
    cards: cards('b'),
  }
  engine.handleMessage('conn-b', submitB)
}

function playRound(engine: HostGameEngine, round: number): void {
  if (engine.state.phase === 'card-entry') {
    engine.submitCardsForPlayer('host', round, cards(`host-${round}`))
    engine.handleMessage('conn-a', {
      ...meta(`submit-a-${round}`, engine.state.revision),
      type: 'SUBMIT_CARDS',
      roundNumber: round,
      cards: cards(`a-${round}`),
    })
    engine.handleMessage('conn-b', {
      ...meta(`submit-b-${round}`, engine.state.revision),
      type: 'SUBMIT_CARDS',
      roundNumber: round,
      cards: cards(`b-${round}`),
    })
  }

  for (let cycle = 0; cycle < 4; cycle += 1) {
    const draft = engine.state.rounds[round].draft
    if (!draft) {
      throw new Error('draft missing')
    }
    engine.selectDiscardForPlayer('host', round, draft.cycleIndex + 1, draft.hands.host[0])
    engine.handleMessage('conn-a', {
      ...meta(`discard-a-${round}-${cycle}`, engine.state.revision),
      type: 'SELECT_DISCARD',
      roundNumber: round,
      draftCycle: draft.cycleIndex + 1,
      cardId: draft.hands[engine.state.players[1].id][0],
    })
    engine.handleMessage('conn-b', {
      ...meta(`discard-b-${round}-${cycle}`, engine.state.revision),
      type: 'SELECT_DISCARD',
      roundNumber: round,
      draftCycle: draft.cycleIndex + 1,
      cardId: draft.hands[engine.state.players[2].id][0],
    })
  }

  engine.drawRandomAction()
  engine.startExperience()
  engine.completeExperience()
}

describe('host authority', () => {
  it('未参加接続からの操作を拒否する', () => {
    const { engine, transport } = createEngine()
    engine.startGame()
    engine.handleMessage('unknown', {
      ...meta('bad-submit', engine.state.revision),
      type: 'SUBMIT_CARDS',
      roundNumber: 1,
      cards: cards('bad'),
    })

    expect(transport.sent.at(-1)?.message.type).toBe('COMMAND_REJECTED')
  })

  it('他人のカードを捨てようとした操作を拒否する', () => {
    const { engine, transport } = createEngine()
    startDraft(engine)
    const draft = engine.state.rounds[1].draft
    const guestA = engine.state.players[1].id
    const guestB = engine.state.players[2].id
    const otherCard = draft?.hands[guestB][0] ?? ''

    const message: SelectDiscardMessage = {
      ...meta('bad-discard', engine.state.revision),
      type: 'SELECT_DISCARD',
      roundNumber: 1,
      draftCycle: 1,
      cardId: otherCard,
    }
    engine.handleMessage('conn-a', message)

    expect(guestA).not.toBe(guestB)
    expect(transport.sent.at(-1)?.message.type).toBe('COMMAND_REJECTED')
  })

  it('同じrequestIdを二重処理しない', () => {
    const { engine } = createEngine()
    engine.startGame()
    const message: SubmitCardsMessage = {
      ...meta('same-submit', engine.state.revision),
      type: 'SUBMIT_CARDS',
      roundNumber: 1,
      cards: cards('a'),
    }
    engine.handleMessage('conn-a', message)
    engine.handleMessage('conn-a', message)

    const guestA = engine.state.players[1].id
    expect(engine.state.rounds[1].submittedPlayerIds.filter((id) => id === guestA)).toHaveLength(1)
    expect(engine.state.cards.filter((card) => card.authorId === guestA)).toHaveLength(5)
  })

  it('古いrevisionからの操作を拒否する', () => {
    const { engine, transport } = createEngine()
    engine.startGame()
    engine.handleMessage('conn-a', {
      ...meta('stale-submit', 0),
      type: 'SUBMIT_CARDS',
      roundNumber: 1,
      cards: cards('stale'),
    })

    const rejected = transport.sent.find(
      (entry) =>
        entry.message.type === 'COMMAND_REJECTED' &&
        entry.message.requestId === 'stale-submit',
    )
    expect(rejected?.message.type).toBe('COMMAND_REJECTED')
  })

  it('全員の選択前に手札を回さない', () => {
    const { engine } = createEngine()
    startDraft(engine)
    const draft = engine.state.rounds[1].draft
    const guestA = engine.state.players[1].id

    engine.selectDiscardForPlayer(guestA, 1, 1, draft?.hands[guestA][0] ?? '')

    expect(engine.state.rounds[1].draft?.cycleIndex).toBe(0)
    expect(engine.state.rounds[1].draft?.hands[guestA]).toHaveLength(5)
  })

  it('全員投票前に得票数を送らない', () => {
    const { engine } = createEngine()
    engine.startGame()
    playRound(engine, 1)
    const firstSelected = engine.state.rounds[1].selectedCardId
    if (!firstSelected) {
      throw new Error('selected card missing')
    }
    const view = engine.getViewForPlayer(engine.state.players[1].id)

    expect(view.publicState.phase).toBe('scoring')
    expect(view.publicState.currentSelectedAction?.totalScore).toBe(0)
    expect(JSON.stringify(view)).not.toContain('voteCount')
  })

  it('2ラウンド目以降に減った手札へカードを追加できる', () => {
    const { engine } = createEngine()
    engine.startGame()
    playRound(engine, 1)

    const selectedCard = engine.state.cards.find(
      (card) => card.id === engine.state.rounds[1].selectedCardId,
    )
    if (!selectedCard) {
      throw new Error('selected card missing')
    }

    const scorerIds = engine.state.players
      .map((player) => player.id)
      .filter((playerId) => playerId !== selectedCard.authorId)
    engine.submitScoreForPlayer(scorerIds[0], 1, 12, 13)
    engine.submitScoreForPlayer(scorerIds[1], 1, 10, 11)
    engine.continueToNextRound()

    const authorView = engine.getViewForPlayer(selectedCard.authorId)
    expect(authorView.privateState.editableCards).toHaveLength(4)

    const revisedCards: ActionCardInput[] = authorView.privateState.editableCards.map((card) => ({
      title: card.title,
      description: card.description,
      area: card.area,
      durationMinutes: card.durationMinutes,
      budgetPerPerson: card.budgetPerPerson,
      requirementsConfirmed: true,
    }))

    engine.submitCardsForPlayer(selectedCard.authorId, 2, [
      ...revisedCards,
      cards('extra')[0],
    ])

    expect(
      engine.state.cards.filter(
        (card) => card.authorId === selectedCard.authorId && card.status !== 'selected',
      ),
    ).toHaveLength(5)
    expect(engine.state.rounds[2].submittedPlayerIds).toContain(selectedCard.authorId)
  })

  it('ゲストごとに異なるprivateStateを生成する', () => {
    const { engine } = createEngine()
    startDraft(engine)
    const guestA = engine.state.players[1].id
    const guestB = engine.state.players[2].id
    const viewA: ClientGameView = engine.getViewForPlayer(guestA)
    const viewB: ClientGameView = engine.getViewForPlayer(guestB)

    expect(viewA.privateState.playerId).toBe(guestA)
    expect(viewB.privateState.playerId).toBe(guestB)
    expect(viewA.privateState.currentHand.map((card) => card.id)).not.toEqual(
      viewB.privateState.currentHand.map((card) => card.id),
    )
  })

  it('再接続トークンが正しければ元のスロットへ戻れる', () => {
    const { engine } = createEngine()
    engine.startGame()
    const guestA = engine.state.players[1]
    engine.handleConnectionClosed('conn-a')
    const reconnect: ReconnectRequestMessage = {
      ...meta('reconnect-a', engine.state.revision),
      type: 'RECONNECT_REQUEST',
      roomId: 'room',
      clientId: guestA.clientId,
      reconnectToken: guestA.reconnectToken,
    }
    engine.handleMessage('conn-a-new', reconnect)

    expect(engine.state.players[1].id).toBe(guestA.id)
    expect(engine.state.players[1].connectionStatus).toBe('connected')
    expect(engine.state.phase).toBe('card-entry')
  })

  it('不正な再接続トークンを拒否する', () => {
    const { engine, transport } = createEngine()
    const reconnect: ReconnectRequestMessage = {
      ...meta('bad-reconnect', engine.state.revision),
      type: 'RECONNECT_REQUEST',
      roomId: 'room',
      clientId: 'client-a',
      reconnectToken: 'wrong-token',
    }
    engine.handleMessage('conn-a-new', reconnect)

    expect(transport.sent.at(-1)?.message.type).toBe('COMMAND_REJECTED')
  })

  it('切断時にゲームがpause状態になる', () => {
    const { engine } = createEngine()
    engine.startGame()
    engine.handleConnectionClosed('conn-a')

    expect(engine.state.phase).toBe('paused')
    expect(engine.state.phaseBeforePause).toBe('card-entry')
  })

  it('再接続後に元のフェーズへ戻れる', () => {
    const { engine } = createEngine()
    engine.startGame()
    const guestA = engine.state.players[1]
    engine.handleConnectionClosed('conn-a')

    engine.handleMessage('conn-a-new', {
      ...meta('reconnect-pause', engine.state.revision),
      type: 'RECONNECT_REQUEST',
      roomId: 'room',
      clientId: guestA.clientId,
      reconnectToken: guestA.reconnectToken,
    })

    expect(engine.state.phase).toBe('card-entry')
  })
})
