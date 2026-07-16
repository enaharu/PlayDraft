import {
  CARDS_PER_PLAYER,
  PLAYER_COUNT,
  type ActionCard,
  type ActionCardInput,
  type AuthoritativeGameState,
  type CardId,
  type DraftState,
  type Player,
  type PlayerId,
  type RoundNumber,
  type RoundScore,
  type Vote,
} from '@/types/game'
import { createCardId, secureRandomInt, type RandomInt } from './random'

export interface ValidationResult {
  ok: boolean
  reasonCode?: string
  message?: string
}

export function shuffleCards<T>(
  items: readonly T[],
  randomInt: RandomInt = secureRandomInt,
): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

export function dealCards(
  orderedPlayerIds: readonly PlayerId[],
  shuffledCardIds: readonly CardId[],
  handSize = CARDS_PER_PLAYER,
): Record<PlayerId, CardId[]> {
  const hands: Record<PlayerId, CardId[]> = {}

  orderedPlayerIds.forEach((playerId, playerIndex) => {
    const start = playerIndex * handSize
    hands[playerId] = shuffledCardIds.slice(start, start + handSize)
  })

  return hands
}

export function dealCardsAvoidingAuthors(
  orderedPlayerIds: readonly PlayerId[],
  cards: readonly Pick<ActionCard, 'id' | 'authorId'>[],
  randomInt: RandomInt = secureRandomInt,
): Record<PlayerId, CardId[]> {
  const hands: Record<PlayerId, CardId[]> = Object.fromEntries(
    orderedPlayerIds.map((playerId) => [playerId, [] as CardId[]]),
  )
  const shuffledCards = shuffleCards(cards, randomInt)
  const shuffledPlayersForRemainder = shuffleCards(orderedPlayerIds, randomInt)
  const baseHandSize = Math.floor(cards.length / orderedPlayerIds.length)
  const remainder = cards.length % orderedPlayerIds.length
  const targetHandSizes: Record<PlayerId, number> = Object.fromEntries(
    orderedPlayerIds.map((playerId) => [playerId, baseHandSize]),
  )

  shuffledPlayersForRemainder.slice(0, remainder).forEach((playerId) => {
    targetHandSizes[playerId] += 1
  })

  const remainingSlots = { ...targetHandSizes }

  const assignCard = (cardIndex: number): boolean => {
    if (cardIndex >= shuffledCards.length) {
      return true
    }

    const card = shuffledCards[cardIndex]
    const eligiblePlayerIds = shuffleCards(
      orderedPlayerIds.filter(
        (playerId) => playerId !== card.authorId && remainingSlots[playerId] > 0,
      ),
      randomInt,
    ).sort(
      (left, right) =>
        remainingSlots[right] - remainingSlots[left] ||
        orderedPlayerIds.indexOf(left) - orderedPlayerIds.indexOf(right),
    )

    for (const recipientId of eligiblePlayerIds) {
      hands[recipientId].push(card.id)
      remainingSlots[recipientId] -= 1

      if (assignCard(cardIndex + 1)) {
        return true
      }

      remainingSlots[recipientId] += 1
      hands[recipientId].pop()
    }

    return false
  }

  if (assignCard(0)) {
    return hands
  }

  shuffledCards.forEach((card) => {
    const eligiblePlayerIds = orderedPlayerIds.filter((playerId) => playerId !== card.authorId)
    const smallestHandSize = Math.min(
      ...eligiblePlayerIds.map((playerId) => hands[playerId]?.length ?? 0),
    )
    const recipientId =
      eligiblePlayerIds.find(
        (playerId) => (hands[playerId]?.length ?? 0) === smallestHandSize,
      ) ?? eligiblePlayerIds[0]
    hands[recipientId]?.push(card.id)
  })

  return hands
}

export function validateCardSubmission(
  cards: readonly ActionCardInput[],
): ValidationResult {
  if (cards.length === 0 || cards.length > CARDS_PER_PLAYER) {
    return {
      ok: false,
      reasonCode: 'INVALID_CARD_COUNT',
      message: `Enter 1 to ${CARDS_PER_PLAYER} cards.`,
    }
  }

  const invalid = cards.find((card) => {
    return (
      card.title.trim().length === 0 ||
      (card.durationMinutes !== undefined &&
        card.durationMinutes !== null &&
        ![60, 90, 120].includes(card.durationMinutes)) ||
      (card.budgetPerPerson !== undefined &&
        card.budgetPerPerson !== null &&
        (!Number.isFinite(card.budgetPerPerson) || card.budgetPerPerson < 0))
    )
  })

  if (invalid) {
    return {
      ok: false,
      reasonCode: 'INVALID_CARD_INPUT',
      message: 'Card input is invalid.',
    }
  }

  return { ok: true }
}

export function commitPlayerCards(
  state: AuthoritativeGameState,
  playerId: PlayerId,
  roundNumber: RoundNumber,
  cardInputs: readonly ActionCardInput[],
  createId: () => CardId = createCardId,
  nowIso = new Date().toISOString(),
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]
  const newCards: ActionCard[] = cardInputs.map((input) => ({
    id: createId(),
    authorId: playerId,
    roundNumber,
    title: input.title.trim(),
    description: input.description.trim(),
    area: input.area.trim(),
    durationMinutes: input.durationMinutes ?? undefined,
    budgetPerPerson:
      input.budgetPerPerson == null
        ? undefined
        : Math.max(0, Math.round(input.budgetPerPerson)),
    requirementsConfirmed: input.requirementsConfirmed ?? true,
    status: 'created',
    createdAt: nowIso,
  }))

  return {
    ...state,
    cards: [...state.cards, ...newCards],
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        cardIds: [...round.cardIds, ...newCards.map((card) => card.id)],
        submittedPlayerIds: [...round.submittedPlayerIds, playerId],
      },
    },
  }
}

export function updatePlayerCards(
  state: AuthoritativeGameState,
  playerId: PlayerId,
  cardInputs: readonly ActionCardInput[],
): AuthoritativeGameState {
  const editableCards = getEditableCardsForPlayer(state, playerId)
  const editableCardIds = new Set(editableCards.map((card) => card.id))
  let inputIndex = 0

  return {
    ...state,
    cards: state.cards.map((card) => {
      if (!editableCardIds.has(card.id)) {
        return card
      }

      const input = cardInputs[inputIndex]
      inputIndex += 1

      if (!input) {
        return card
      }

      return {
        ...card,
        title: input.title.trim(),
        description: input.description.trim(),
        area: input.area.trim(),
        durationMinutes: input.durationMinutes ?? undefined,
        budgetPerPerson:
          input.budgetPerPerson == null
            ? undefined
            : Math.max(0, Math.round(input.budgetPerPerson)),
        requirementsConfirmed: input.requirementsConfirmed ?? true,
      }
    }),
  }
}

export function getEditableCardsForPlayer(
  state: AuthoritativeGameState,
  playerId: PlayerId,
): ActionCard[] {
  return state.cards.filter(
    (card) => card.authorId === playerId && card.status !== 'selected',
  )
}

export function getActiveCardIds(state: AuthoritativeGameState): CardId[] {
  return state.cards
    .filter((card) => card.status !== 'selected')
    .map((card) => card.id)
}

export function beginDraftForRound(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
  orderedPlayerIds: readonly PlayerId[],
  randomInt: RandomInt = secureRandomInt,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]
  const roundCardIds = round.cardIds.length > 0 ? round.cardIds : getActiveCardIds(state)
  const roundCards = roundCardIds
    .map((cardId) => state.cards.find((card) => card.id === cardId))
    .filter((card): card is ActionCard => Boolean(card))
  const hands = dealCardsAvoidingAuthors(orderedPlayerIds, roundCards, randomInt)
  const totalCycles = Math.max(
    0,
    Math.max(...orderedPlayerIds.map((playerId) => hands[playerId]?.length ?? 0)) - 1,
  )

  const cards = state.cards.map((card) => {
    if (!roundCardIds.includes(card.id)) {
      return card
    }

    const holderId = orderedPlayerIds.find((playerId) =>
      hands[playerId]?.includes(card.id),
    )

    return {
      ...card,
      status: 'in-hand' as const,
      currentHolderId: holderId,
    }
  })

  return {
    ...state,
    phase: 'draft',
    cards,
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        cardIds: roundCardIds,
        draft: {
          cycleIndex: 0,
          totalCycles,
          hands,
          selectedDiscards: {},
          completed: false,
        },
      },
    },
  }
}

export function selectPendingDiscard(
  state: AuthoritativeGameState,
  playerId: PlayerId,
  roundNumber: RoundNumber,
  cardId: CardId,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]
  const draft = round.draft

  if (!draft) {
    return state
  }

  return {
    ...state,
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        draft: {
          ...draft,
          selectedDiscards: {
            ...draft.selectedDiscards,
            [playerId]: cardId,
          },
        },
      },
    },
  }
}

export function rotateHandsClockwise(
  orderedPlayerIds: readonly PlayerId[],
  hands: Record<PlayerId, CardId[]>,
): Record<PlayerId, CardId[]> {
  const rotated: Record<PlayerId, CardId[]> = {}

  orderedPlayerIds.forEach((playerId, index) => {
    const recipientId = orderedPlayerIds[(index + 1) % orderedPlayerIds.length]
    rotated[recipientId] = [...(hands[playerId] ?? [])]
  })

  return rotated
}

export function commitAllDiscards(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
  orderedPlayerIds: readonly PlayerId[],
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]
  const draft = round.draft

  if (!draft) {
    return state
  }

  const playerIdsRequiringSelection = orderedPlayerIds.filter(
    (playerId) => (draft.hands[playerId]?.length ?? 0) > 1,
  )
  const selectedCardIds = playerIdsRequiringSelection
    .map((playerId) => draft.selectedDiscards[playerId])
    .filter((cardId): cardId is CardId => Boolean(cardId))

  if (selectedCardIds.length !== playerIdsRequiringSelection.length) {
    return state
  }

  const reducedHands: Record<PlayerId, CardId[]> = {}

  orderedPlayerIds.forEach((playerId) => {
    const discardId = draft.selectedDiscards[playerId]
    reducedHands[playerId] = (draft.hands[playerId] ?? []).filter(
      (cardId) => cardId !== discardId,
    )
  })

  const completed =
    orderedPlayerIds.every((playerId) => (reducedHands[playerId]?.length ?? 0) <= 1) ||
    draft.cycleIndex + 1 >= draft.totalCycles
  const nextHands = reducedHands
  const finalistCardIds = completed ? getFinalistCards(nextHands) : []
  const nextDraft: DraftState = {
    cycleIndex: completed ? draft.cycleIndex : draft.cycleIndex + 1,
    totalCycles: draft.totalCycles,
    hands: nextHands,
    selectedDiscards: {},
    completed,
  }

  const cards = state.cards.map((card) => {
    if (selectedCardIds.includes(card.id)) {
      return {
        ...card,
        status: 'discarded' as const,
        currentHolderId: undefined,
      }
    }

    if (finalistCardIds.includes(card.id)) {
      const holderId = orderedPlayerIds.find((playerId) =>
        nextHands[playerId]?.includes(card.id),
      )

      return {
        ...card,
        status: 'finalist' as const,
        currentHolderId: holderId,
      }
    }

    const holderId = orderedPlayerIds.find((playerId) =>
      nextHands[playerId]?.includes(card.id),
    )

    if (holderId) {
      return {
        ...card,
        status: 'in-hand' as const,
        currentHolderId: holderId,
      }
    }

    return card
  })

  return {
    ...state,
    phase: completed ? 'finalists' : 'draft',
    cards,
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        draft: nextDraft,
        finalistCardIds,
      },
    },
  }
}

export function getFinalistCards(hands: Record<PlayerId, CardId[]>): CardId[] {
  return Object.values(hands).flat()
}

export function selectRandomAction(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
  randomInt: RandomInt = secureRandomInt,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]

  if (round.selectedCardId || round.finalistCardIds.length === 0) {
    return state
  }

  const selectedCardId = round.finalistCardIds[randomInt(round.finalistCardIds.length)]

  return {
    ...state,
    phase: 'selected-action',
    cards: state.cards.map((card) => {
      if (!round.finalistCardIds.includes(card.id)) {
        return card
      }

      return {
        ...card,
        status: card.id === selectedCardId ? ('selected' as const) : ('created' as const),
        currentHolderId: undefined,
      }
    }),
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        selectedCardId,
      },
    },
  }
}

export function validateVote(
  state: AuthoritativeGameState,
  voterId: PlayerId,
  selectedCardId: CardId,
): ValidationResult {
  if (state.votes.some((vote) => vote.voterId === voterId)) {
    return {
      ok: false,
      reasonCode: 'ALREADY_VOTED',
      message: 'Already voted.',
    }
  }

  const voteTargetIds = getSelectedExperienceCardIds(state)

  if (!voteTargetIds.includes(selectedCardId)) {
    return {
      ok: false,
      reasonCode: 'INVALID_VOTE_TARGET',
      message: 'Invalid vote target.',
    }
  }

  return { ok: true }
}

export function addVote(
  state: AuthoritativeGameState,
  vote: Vote,
): AuthoritativeGameState {
  return {
    ...state,
    votes: [...state.votes, vote],
  }
}

export function countVotes(votes: readonly Vote[]): Record<CardId, number> {
  return votes.reduce<Record<CardId, number>>((counts, vote) => {
    counts[vote.selectedCardId] = (counts[vote.selectedCardId] ?? 0) + 1
    return counts
  }, {})
}

export function determineWinningCard(
  state: AuthoritativeGameState,
): { winningCardId: CardId; winnerPlayerId: PlayerId } | undefined {
  const scoredCards = getSelectedExperienceCardIds(state)
  const sorted = [...scoredCards].sort(
    (a, b) => getCardTotalScore(state, b) - getCardTotalScore(state, a),
  )
  const winningCardId = sorted[0]
  const card = state.cards.find((candidate) => candidate.id === winningCardId)

  if (!winningCardId || !card) {
    return undefined
  }

  return {
    winningCardId,
    winnerPlayerId: card.authorId,
  }
}

export function getSelectedExperienceCardIds(
  state: AuthoritativeGameState,
): CardId[] {
  return Object.values(state.rounds)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => round.selectedCardId)
    .filter((cardId): cardId is CardId => Boolean(cardId))
}

export function getOrderedPlayerIds(players: readonly Player[]): PlayerId[] {
  return [...players].sort((a, b) => a.order - b.order).map((player) => player.id)
}

export function allPlayersConnected(players: readonly Player[]): boolean {
  return (
    players.length === PLAYER_COUNT &&
    players.every((player) => player.connectionStatus === 'connected')
  )
}

export function markExperienceStarted(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]

  return {
    ...state,
    phase: 'experience',
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        experienceStarted: true,
      },
    },
  }
}

export function completeExperience(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]

  return {
    ...state,
    phase: 'scoring',
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        experienceCompleted: true,
      },
    },
  }
}

export function setRoundAuthorComment(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
  comment: string,
): AuthoritativeGameState {
  const round = state.rounds[roundNumber]

  return {
    ...state,
    phase: 'scoring',
    rounds: {
      ...state.rounds,
      [roundNumber]: {
        ...round,
        authorComment: comment.trim(),
      },
    },
  }
}

export function addRoundScore(
  state: AuthoritativeGameState,
  score: RoundScore,
): AuthoritativeGameState {
  return {
    ...state,
    scores: [
      ...state.scores.filter(
        (candidate) =>
          !(
            candidate.roundNumber === score.roundNumber &&
            candidate.evaluatorId === score.evaluatorId
          ),
      ),
      score,
    ],
  }
}

export function getRoundScores(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
): RoundScore[] {
  return state.scores.filter((score) => score.roundNumber === roundNumber)
}

export function getCardTotalScore(
  state: AuthoritativeGameState,
  cardId: CardId,
): number {
  return state.scores
    .filter((score) => score.cardId === cardId)
    .reduce((total, score) => total + score.satisfaction + score.surprise, 0)
}

export function createNextRoundState(
  state: AuthoritativeGameState,
): AuthoritativeGameState {
  const nextRoundNumber = state.currentRoundNumber + 1

  return {
    ...state,
    phase: 'card-entry',
    currentRoundNumber: nextRoundNumber,
    rounds: {
      ...state.rounds,
      [nextRoundNumber]: {
        roundNumber: nextRoundNumber,
        cardIds: getActiveCardIds(state),
        submittedPlayerIds: [],
        finalistCardIds: [],
        experienceStarted: false,
        experienceCompleted: false,
      },
    },
  }
}
