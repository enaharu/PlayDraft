import {
  DRAFT_CYCLES,
  PLAYER_COUNT,
  type ActionCard,
  type AnonymousActionCard,
  type AuthoritativeGameState,
  type ClientGameView,
  type PrivatePlayerView,
  type PublicGameView,
  type PublicPlayerView,
  type ResultCardView,
} from '@/types/game'
import {
  getEditableCardsForPlayer,
  getRoundScores,
  getSelectedExperienceCardIds,
} from './gameLogic'

export function sanitizeCardForAnonymousDisplay(
  card: ActionCard,
): AnonymousActionCard {
  return {
    id: card.id,
    roundNumber: card.roundNumber,
    title: card.title,
    description: card.description,
    area: card.area,
    durationMinutes: card.durationMinutes ?? undefined,
    budgetPerPerson: card.budgetPerPerson ?? undefined,
  }
}

export function buildClientGameView(
  state: AuthoritativeGameState,
  playerId: string,
): ClientGameView {
  return {
    revision: state.revision,
    publicState: buildPublicGameView(state),
    privateState: buildPrivatePlayerView(state, playerId),
  }
}

export function buildPublicGameView(
  state: AuthoritativeGameState,
): PublicGameView {
  const currentRound = state.rounds[state.currentRoundNumber]
  const draft = currentRound.draft
  const selectedExperienceIds = getSelectedExperienceCardIds(state)
  const selectedExperiences = selectedExperienceIds
    .map((cardId) => state.cards.find((card) => card.id === cardId))
    .filter((card): card is ActionCard => Boolean(card))
    .map(sanitizeCardForAnonymousDisplay)
  const resultCards = buildResultCards(state)
  const currentSelectedAction = currentRound.selectedCardId
    ? resultCards.find((card) => card.id === currentRound.selectedCardId)
    : undefined
  const winningCard =
    resultCards.find((card) => card.id === state.winningCardId) ?? resultCards[0]
  const winner = state.players.find((player) => player.id === state.winnerPlayerId)
  const currentRoundScores = getRoundScores(state, state.currentRoundNumber)

  return {
    roomId: state.roomId,
    phase: state.phase,
    phaseBeforePause: state.phaseBeforePause,
    currentRoundNumber: state.currentRoundNumber,
    requiredPlayerCount: PLAYER_COUNT,
    joinedPlayerCount: state.players.length,
    players: state.players
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((player): PublicPlayerView => ({
        id: player.id,
        name: player.name,
        order: player.order,
        isHost: player.isHost,
        connectionStatus: player.connectionStatus,
        hasSubmittedCards: currentRound.submittedPlayerIds.includes(player.id),
        hasSelectedDiscard: Boolean(draft?.selectedDiscards[player.id]),
        hasVoted: state.votes.some((vote) => vote.voterId === player.id),
        hasScored: currentRoundScores.some((score) => score.evaluatorId === player.id),
        handCount: draft?.hands[player.id]?.length ?? 0,
      })),
    draftCycle: draft ? draft.cycleIndex + 1 : 0,
    draftTotalCycles: draft?.totalCycles ?? DRAFT_CYCLES,
    submittedCount: currentRound.submittedPlayerIds.length,
    discardSelectedCount: draft
      ? Object.entries(draft.hands).filter(
          ([playerId, hand]) => hand.length <= 1 || draft.selectedDiscards[playerId],
        ).length
      : 0,
    selectedExperiences,
    voteSubmittedCount: state.votes.length,
    scoreSubmittedCount: currentRoundScores.length,
    voteChoices: selectedExperiences,
    currentSelectedAction,
    revealStartedAt: state.revealStartedAt,
    resultCards,
    winningCard,
    winnerName: winner?.name ?? winningCard?.authorName,
    disconnectedPlayerNames: state.players
      .filter((player) => player.connectionStatus === 'disconnected')
      .map((player) => player.name),
  }
}

export function buildPrivatePlayerView(
  state: AuthoritativeGameState,
  playerId: string,
): PrivatePlayerView {
  const player = state.players.find((candidate) => candidate.id === playerId)
  const currentRound = state.rounds[state.currentRoundNumber]
  const draft = currentRound.draft
  const selectedCard = state.cards.find((card) => card.id === currentRound.selectedCardId)
  const selectedDiscardCardId = draft?.selectedDiscards[playerId]
  const currentHand = (draft?.hands[playerId] ?? [])
    .map((cardId) => state.cards.find((card) => card.id === cardId))
    .filter((card): card is ActionCard => Boolean(card))
    .map(sanitizeCardForAnonymousDisplay)
  const editableCards = getEditableCardsForPlayer(state, playerId).map(
    sanitizeCardForAnonymousDisplay,
  )
  const submittedThisRound = currentRound.submittedPlayerIds.includes(playerId)
  const selectedVoteCardId = state.votes.find(
    (vote) => vote.voterId === playerId,
  )?.selectedCardId
  const roundScores = getRoundScores(state, state.currentRoundNumber)
  const hasScored = roundScores.some((score) => score.evaluatorId === playerId)
  const allJoinedAndConnected =
    state.players.length === PLAYER_COUNT &&
    state.players.every((candidate) => candidate.connectionStatus === 'connected')
  const hasAnyDisconnected = state.players.some(
    (candidate) => candidate.connectionStatus === 'disconnected',
  )

  return {
    playerId,
    displayName: player?.name ?? '',
    isHost: Boolean(player?.isHost),
    currentHand,
    editableCards,
    submittedThisRound,
    selectedDiscardCardId,
    selectedVoteCardId,
    hasVoted: Boolean(selectedVoteCardId),
    hasScored,
    canStartGame:
      Boolean(player?.isHost) && state.phase === 'lobby' && allJoinedAndConnected,
    canSubmitCards:
      state.phase === 'card-entry' && !submittedThisRound && !hasAnyDisconnected,
    canSelectDiscard:
      state.phase === 'draft' &&
      currentHand.length > 1 &&
      !selectedDiscardCardId &&
      !hasAnyDisconnected,
    canDrawAction:
      Boolean(player?.isHost) &&
      state.phase === 'finalists' &&
      currentRound.finalistCardIds.length > 0 &&
      !currentRound.selectedCardId &&
      !hasAnyDisconnected,
    canStartExperience:
      Boolean(player?.isHost) &&
      state.phase === 'selected-action' &&
      Boolean(currentRound.selectedCardId) &&
      !currentRound.experienceStarted &&
      !hasAnyDisconnected,
    canCompleteExperience:
      Boolean(player?.isHost) &&
      state.phase === 'experience' &&
      currentRound.experienceStarted &&
      !currentRound.experienceCompleted &&
      !hasAnyDisconnected,
    canSubmitComment:
      state.phase === 'round-comment' &&
      Boolean(selectedCard) &&
      selectedCard?.authorId === playerId &&
      !hasAnyDisconnected,
    canScoreRound:
      state.phase === 'scoring' &&
      Boolean(selectedCard) &&
      selectedCard?.authorId !== playerId &&
      !hasScored &&
      !hasAnyDisconnected,
    canContinueRound:
      Boolean(player?.isHost) && state.phase === 'round-summary' && !hasAnyDisconnected,
    canFinishGame:
      Boolean(player?.isHost) &&
      (state.phase === 'round-summary' || state.phase === 'result') &&
      state.scores.length > 0,
    canVote: false,
    canFinishReveal: Boolean(player?.isHost) && state.phase === 'reveal',
  }
}

function buildResultCards(state: AuthoritativeGameState): ResultCardView[] {
  const cards: ResultCardView[] = []

  Object.values(state.rounds)
    .filter((round) => round.selectedCardId)
    .forEach((round) => {
      const card = state.cards.find((candidate) => candidate.id === round.selectedCardId)
      if (!card) {
        return
      }

      const author = state.players.find((player) => player.id === card.authorId)
      const scores = getRoundScores(state, round.roundNumber)
      const satisfactionTotal = scores.reduce((total, score) => total + score.satisfaction, 0)
      const surpriseTotal = scores.reduce((total, score) => total + score.surprise, 0)
      const totalScore = satisfactionTotal + surpriseTotal

      cards.push({
        ...sanitizeCardForAnonymousDisplay(card),
        roundNumber: round.roundNumber,
        authorName: author?.name ?? 'Unknown',
        satisfactionTotal,
        surpriseTotal,
        totalScore,
        comment: round.authorComment,
        isWinner: card.id === state.winningCardId,
      })
    })

  return cards.sort((a, b) => b.totalScore - a.totalScore || a.roundNumber - b.roundNumber)
}
