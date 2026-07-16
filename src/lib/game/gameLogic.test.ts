import { describe, expect, it } from 'vitest'
import type { ActionCardInput, AuthoritativeGameState, Player } from '@/types/game'
import { createInitialHostState } from './hostReducer'
import {
  beginDraftForRound,
  commitAllDiscards,
  commitPlayerCards,
  countVotes,
  dealCards,
  dealCardsAvoidingAuthors,
  getFinalistCards,
  getOrderedPlayerIds,
  rotateHandsClockwise,
  selectPendingDiscard,
  selectRandomAction,
  shuffleCards,
} from './gameLogic'
import { buildClientGameView } from './viewBuilder'

const players: Player[] = [
  {
    id: 'p1',
    clientId: 'c1',
    name: 'Haruki',
    order: 0,
    isHost: true,
    connectionStatus: 'connected',
    reconnectToken: 'rt1-token',
  },
  {
    id: 'p2',
    clientId: 'c2',
    name: 'Mina',
    order: 1,
    isHost: false,
    connectionStatus: 'connected',
    reconnectToken: 'rt2-token',
  },
  {
    id: 'p3',
    clientId: 'c3',
    name: 'Sora',
    order: 2,
    isHost: false,
    connectionStatus: 'connected',
    reconnectToken: 'rt3-token',
  },
]

function validCards(prefix: string): ActionCardInput[] {
  return Array.from({ length: 5 }, (_, index) => ({
    title: `${prefix} action ${index + 1}`,
    description: 'small challenge',
    area: 'Tokyo',
    durationMinutes: 90,
    budgetPerPerson: 1000,
    requirementsConfirmed: true,
  }))
}

function stateWithCards(): AuthoritativeGameState {
  let state = createInitialHostState({
    roomId: 'room',
    roomToken: 'room-token-secret',
    hostPeerId: 'host-peer',
    hostPlayerId: 'p1',
    hostClientId: 'c1',
    hostReconnectToken: 'rt1-token',
    hostName: 'Haruki',
    nowIso: '2026-01-01T00:00:00.000Z',
  })
  state = { ...state, players }
  const ids = Array.from({ length: 15 }, (_, index) => `card-${index + 1}`)
  let idIndex = 0
  for (const player of players) {
    state = commitPlayerCards(
      state,
      player.id,
      1,
      validCards(player.name),
      () => ids[idIndex++],
      '2026-01-01T00:00:00.000Z',
    )
  }
  return state
}

function discardFirstAvailableCards(
  state: AuthoritativeGameState,
): AuthoritativeGameState {
  const draft = state.rounds[1].draft
  if (!draft) {
    return state
  }

  let nextState = state
  for (const playerId of getOrderedPlayerIds(players)) {
    const hand = draft.hands[playerId] ?? []
    if (hand.length > 1) {
      nextState = selectPendingDiscard(nextState, playerId, 1, hand[0])
    }
  }

  return commitAllDiscards(nextState, 1, getOrderedPlayerIds(players))
}

describe('game logic', () => {
  it('shuffles without losing cards', () => {
    const cards = Array.from({ length: 15 }, (_, index) => `card-${index}`)
    const shuffled = shuffleCards(cards, (max) => Math.max(0, max - 2))

    expect(shuffled).toHaveLength(15)
    expect(new Set(shuffled)).toEqual(new Set(cards))
  })

  it('deals fixed hands evenly', () => {
    const hands = dealCards(['p1', 'p2', 'p3'], Array.from({ length: 15 }, (_, i) => `c${i}`))

    expect(hands.p1).toHaveLength(5)
    expect(hands.p2).toHaveLength(5)
    expect(hands.p3).toHaveLength(5)
  })

  it('does not deal a card to its author', () => {
    const state = stateWithCards()
    const hands = dealCardsAvoidingAuthors(
      ['p1', 'p2', 'p3'],
      state.cards.map((card) => ({ id: card.id, authorId: card.authorId })),
      () => 0,
    )

    for (const playerId of ['p1', 'p2', 'p3']) {
      const ownCardIds = state.cards
        .filter((card) => card.authorId === playerId)
        .map((card) => card.id)

      expect(hands[playerId].some((cardId) => ownCardIds.includes(cardId))).toBe(false)
    }
  })

  it('rotates hands clockwise when requested', () => {
    const rotated = rotateHandsClockwise(['p1', 'p2', 'p3'], {
      p1: ['a'],
      p2: ['b'],
      p3: ['c'],
    })

    expect(rotated.p2).toEqual(['a'])
    expect(rotated.p3).toEqual(['b'])
    expect(rotated.p1).toEqual(['c'])
  })

  it('removes one card from each active hand per draft cycle', () => {
    let state = beginDraftForRound(stateWithCards(), 1, ['p1', 'p2', 'p3'], () => 0)
    const draft = state.rounds[1].draft
    expect(draft?.hands.p1).toHaveLength(5)

    state = discardFirstAvailableCards(state)

    expect(state.rounds[1].draft?.hands.p1).toHaveLength(4)
  })

  it('leaves each player with one finalist card after four cycles', () => {
    let state = beginDraftForRound(stateWithCards(), 1, ['p1', 'p2', 'p3'], () => 0)

    for (let cycle = 0; cycle < 4; cycle += 1) {
      state = discardFirstAvailableCards(state)
    }

    expect(state.rounds[1].draft?.hands.p1).toHaveLength(1)
    expect(state.rounds[1].draft?.hands.p2).toHaveLength(1)
    expect(state.rounds[1].draft?.hands.p3).toHaveLength(1)
  })

  it('keeps three finalist cards', () => {
    let state = beginDraftForRound(stateWithCards(), 1, ['p1', 'p2', 'p3'], () => 0)

    for (let cycle = 0; cycle < 4; cycle += 1) {
      state = discardFirstAvailableCards(state)
    }

    expect(getFinalistCards(state.rounds[1].draft?.hands ?? {})).toHaveLength(3)
    expect(state.rounds[1].finalistCardIds).toHaveLength(3)
  })

  it('selects only from finalist cards', () => {
    let state = beginDraftForRound(stateWithCards(), 1, getOrderedPlayerIds(players), () => 0)
    for (let cycle = 0; cycle < 4; cycle += 1) {
      state = discardFirstAvailableCards(state)
    }
    state = selectRandomAction(state, 1, () => 1)

    expect(state.rounds[1].finalistCardIds).toContain(state.rounds[1].selectedCardId)
  })

  it('counts votes', () => {
    expect(
      countVotes([
        { voterId: 'p1', selectedCardId: 'a' },
        { voterId: 'p2', selectedCardId: 'b' },
        { voterId: 'p3', selectedCardId: 'a' },
      ]),
    ).toEqual({ a: 2, b: 1 })
  })

  it('does not expose authorId in the pre-reveal client view', () => {
    const state = beginDraftForRound(stateWithCards(), 1, ['p1', 'p2', 'p3'], () => 0)
    const view = buildClientGameView(state, 'p2')

    expect(JSON.stringify(view)).not.toContain('authorId')
  })

  it('does not put a player own card in their draft hand', () => {
    const state = beginDraftForRound(stateWithCards(), 1, ['p1', 'p2', 'p3'], () => 0)
    const draft = state.rounds[1].draft

    for (const playerId of ['p1', 'p2', 'p3']) {
      const ownCardIds = state.cards
        .filter((card) => card.authorId === playerId)
        .map((card) => card.id)

      expect((draft?.hands[playerId] ?? []).some((cardId) => ownCardIds.includes(cardId))).toBe(false)
    }
  })
})
