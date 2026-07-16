import {
  CARDS_PER_PLAYER,
  PLAYER_COUNT,
  PROTOCOL_VERSION,
  type ActionCardInput,
  type AuthoritativeGameState,
  type CardId,
  type ClientGameView,
  type ConnectionId,
  type GamePhase,
  type Player,
  type PlayerId,
  type RoundNumber,
} from '@/types/game'
import type {
  ClientToHostMessage,
  JoinRequestMessage,
  MessageMeta,
  P2PTransport,
  ReconnectRequestMessage,
} from '@/types/network'
import {
  addVote,
  allPlayersConnected,
  beginDraftForRound,
  commitAllDiscards,
  commitPlayerCards,
  completeExperience,
  createNextRoundState,
  determineWinningCard,
  getActiveCardIds,
  getEditableCardsForPlayer,
  getOrderedPlayerIds,
  getRoundScores,
  markExperienceStarted,
  addRoundScore,
  selectPendingDiscard,
  selectRandomAction,
  setRoundAuthorComment,
  updatePlayerCards,
  validateCardSubmission,
  validateVote,
} from './gameLogic'
import {
  createCardId,
  createClientId,
  createPlayerId,
  createToken,
  secureRandomInt,
  type RandomInt,
} from './random'
import { buildClientGameView } from './viewBuilder'
import { userSafeErrorMessage } from '@/lib/p2p/messages'

const PROCESSED_REQUEST_LIMIT = 240

export interface HostGameEngineOptions {
  randomInt?: RandomInt
  createCardId?: () => CardId
  now?: () => number
  onStateChanged?: (state: AuthoritativeGameState) => void
}

export interface CreateHostStateInput {
  roomId: string
  roomToken: string
  hostPeerId: string
  hostClientId?: string
  hostPlayerId?: string
  hostReconnectToken?: string
  hostName: string
  nowIso?: string
}

export function createInitialHostState(
  input: CreateHostStateInput,
): AuthoritativeGameState {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const hostPlayer: Player = {
    id: input.hostPlayerId ?? createPlayerId(),
    clientId: input.hostClientId ?? createClientId(),
    name: input.hostName.trim(),
    order: 0,
    isHost: true,
    connectionStatus: 'connected',
    reconnectToken: input.hostReconnectToken ?? createToken(24),
  }

  return {
    protocolVersion: PROTOCOL_VERSION,
    revision: 0,
    roomId: input.roomId,
    roomToken: input.roomToken,
    hostPeerId: input.hostPeerId,
    phase: 'lobby',
    players: [hostPlayer],
    cards: [],
    rounds: {
      1: createEmptyRound(1),
    },
    currentRoundNumber: 1,
    votes: [],
    scores: [],
    processedRequestIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

export function createEmptyRound(roundNumber: RoundNumber) {
  return {
    roundNumber,
    cardIds: [],
    submittedPlayerIds: [],
    finalistCardIds: [],
    experienceStarted: false,
    experienceCompleted: false,
  }
}

export class HostGameEngine {
  private stateValue: AuthoritativeGameState
  private readonly transport: P2PTransport
  private readonly randomInt: RandomInt
  private readonly createCardId: () => CardId
  private readonly now: () => number
  private readonly onStateChanged?: (state: AuthoritativeGameState) => void
  private readonly connectionToPlayer = new Map<ConnectionId, PlayerId>()
  private readonly playerToConnection = new Map<PlayerId, ConnectionId>()

  constructor(
    state: AuthoritativeGameState,
    transport: P2PTransport,
    options: HostGameEngineOptions = {},
  ) {
    this.stateValue = state
    this.transport = transport
    this.randomInt = options.randomInt ?? secureRandomInt
    this.createCardId = options.createCardId ?? createCardId
    this.now = options.now ?? Date.now
    this.onStateChanged = options.onStateChanged
  }

  get state(): AuthoritativeGameState {
    return this.stateValue
  }

  get hostPlayerId(): PlayerId {
    const host = this.state.players.find((player) => player.isHost)

    if (!host) {
      throw new Error('Host player is missing')
    }

    return host.id
  }

  getViewForPlayer(playerId: PlayerId): ClientGameView {
    return buildClientGameView(this.state, playerId)
  }

  handleMessage(connectionId: ConnectionId, rawMessage: ClientToHostMessage): void {
    if (rawMessage.type === 'JOIN_REQUEST') {
      this.handleJoinRequest(connectionId, rawMessage)
      return
    }

    if (rawMessage.type === 'RECONNECT_REQUEST') {
      this.handleReconnectRequest(connectionId, rawMessage)
      return
    }

    if (rawMessage.type === 'PING') {
      this.transport.send(connectionId, {
        type: 'PONG',
        protocolVersion: PROTOCOL_VERSION,
        requestId: rawMessage.requestId,
        sentAt: this.now(),
        revision: this.state.revision,
      })
      return
    }

    if (rawMessage.type === 'REQUEST_SNAPSHOT') {
      const playerId = this.connectionToPlayer.get(connectionId)
      if (!playerId) {
        this.rejectCommand(connectionId, rawMessage, 'NOT_JOINED')
        return
      }
      this.sendSnapshot(playerId)
      return
    }

    const player = this.getPlayerForConnection(connectionId)
    if (!player) {
      this.rejectCommand(connectionId, rawMessage, 'NOT_JOINED')
      return
    }

    if (this.state.processedRequestIds.includes(rawMessage.requestId)) {
      this.acceptCommand(connectionId, rawMessage.requestId)
      this.sendSnapshot(player.id)
      return
    }

    if (this.isStale(rawMessage)) {
      this.rejectCommand(connectionId, rawMessage, 'STALE_REVISION')
      this.sendSnapshot(player.id)
      return
    }

    if (this.state.phase === 'paused') {
      this.rejectCommand(connectionId, rawMessage, 'PAUSED')
      this.sendSnapshot(player.id)
      return
    }

    if (rawMessage.type === 'SUBMIT_CARDS') {
      this.submitCardsForPlayer(player.id, rawMessage.roundNumber, rawMessage.cards, {
        requestId: rawMessage.requestId,
        connectionId,
      })
      return
    }

    if (rawMessage.type === 'SELECT_DISCARD') {
      this.selectDiscardForPlayer(
        player.id,
        rawMessage.roundNumber,
        rawMessage.draftCycle,
        rawMessage.cardId,
        { requestId: rawMessage.requestId, connectionId },
      )
      return
    }

    if (rawMessage.type === 'CAST_VOTE') {
      this.castVoteForPlayer(player.id, rawMessage.selectedCardId, {
        requestId: rawMessage.requestId,
        connectionId,
      })
      return
    }

    if (rawMessage.type === 'SUBMIT_COMMENT') {
      this.submitCommentForPlayer(player.id, rawMessage.roundNumber, rawMessage.comment, {
        requestId: rawMessage.requestId,
        connectionId,
      })
      return
    }

    if (rawMessage.type === 'SUBMIT_SCORE') {
      this.submitScoreForPlayer(
        player.id,
        rawMessage.roundNumber,
        rawMessage.satisfaction,
        rawMessage.surprise,
        {
          requestId: rawMessage.requestId,
          connectionId,
        },
      )
    }
  }

  handleJoinRequest(
    connectionId: ConnectionId,
    message: JoinRequestMessage,
  ): void {
    const reject = (reasonCode: string) => {
      this.transport.send(connectionId, {
        type: 'JOIN_REJECTED',
        protocolVersion: PROTOCOL_VERSION,
        requestId: message.requestId,
        reasonCode,
        message: userSafeErrorMessage(reasonCode),
      })
    }

    if (message.protocolVersion !== PROTOCOL_VERSION) {
      reject('PROTOCOL_MISMATCH')
      return
    }

    if (message.roomId !== this.state.roomId || message.roomToken !== this.state.roomToken) {
      reject('INVALID_ROOM_TOKEN')
      return
    }

    if (this.connectionToPlayer.has(connectionId)) {
      reject('DUPLICATE_CONNECTION')
      return
    }

    if (this.state.phase !== 'lobby') {
      reject('GAME_ALREADY_STARTED')
      return
    }

    const displayName = message.displayName.trim()

    if (displayName.length === 0) {
      reject('EMPTY_NAME')
      return
    }

    if (
      this.state.players.some(
        (player) => player.name.toLowerCase() === displayName.toLowerCase(),
      )
    ) {
      reject('DUPLICATE_NAME')
      return
    }

    if (this.state.players.length >= PLAYER_COUNT) {
      reject('ROOM_FULL')
      return
    }

    const player: Player = {
      id: createPlayerId(),
      clientId: message.clientId,
      name: displayName,
      order: this.state.players.length,
      isHost: false,
      connectionStatus: 'connected',
      reconnectToken: createToken(24),
    }

    this.linkConnection(connectionId, player.id)
    const nextState = {
      ...this.state,
      players: [...this.state.players, player],
    }

    this.commitState(nextState, message.requestId)
    this.transport.send(connectionId, {
      type: 'JOIN_ACCEPTED',
      protocolVersion: PROTOCOL_VERSION,
      requestId: message.requestId,
      playerId: player.id,
      reconnectToken: player.reconnectToken,
      revision: this.state.revision,
      view: this.getViewForPlayer(player.id),
    })
    this.broadcastSnapshots()
  }

  handleReconnectRequest(
    connectionId: ConnectionId,
    message: ReconnectRequestMessage,
  ): void {
    const player = this.state.players.find(
      (candidate) =>
        candidate.clientId === message.clientId &&
        candidate.reconnectToken === message.reconnectToken,
    )

    if (
      message.roomId !== this.state.roomId ||
      !player ||
      message.protocolVersion !== PROTOCOL_VERSION
    ) {
      this.transport.send(connectionId, {
        type: 'COMMAND_REJECTED',
        protocolVersion: PROTOCOL_VERSION,
        requestId: message.requestId,
        reasonCode: 'INVALID_RECONNECT_TOKEN',
        message: userSafeErrorMessage('INVALID_RECONNECT_TOKEN'),
        currentRevision: this.state.revision,
      })
      return
    }

    const oldConnectionId = this.playerToConnection.get(player.id)
    if (oldConnectionId && oldConnectionId !== connectionId) {
      this.transport.close(oldConnectionId)
      this.connectionToPlayer.delete(oldConnectionId)
    }

    this.linkConnection(connectionId, player.id)
    let nextState = this.updatePlayer(player.id, {
      connectionStatus: 'connected',
    })

    if (nextState.phase === 'paused' && allPlayersConnected(nextState.players)) {
      nextState = {
        ...nextState,
        phase: nextState.phaseBeforePause ?? 'lobby',
        phaseBeforePause: undefined,
      }
    }

    this.commitState(nextState, message.requestId)
    this.acceptCommand(connectionId, message.requestId)
    this.sendSnapshot(player.id)
    this.broadcastSnapshots()
  }

  handleConnectionClosed(connectionId: ConnectionId): void {
    const playerId = this.connectionToPlayer.get(connectionId)
    if (!playerId) {
      return
    }

    this.connectionToPlayer.delete(connectionId)
    this.playerToConnection.delete(playerId)

    let nextState = this.updatePlayer(playerId, {
      connectionStatus: 'disconnected',
    })

    if (nextState.phase !== 'lobby' && nextState.phase !== 'paused') {
      nextState = {
        ...nextState,
        phaseBeforePause: nextState.phase,
        phase: 'paused',
      }
    }

    this.commitState(nextState)
    this.broadcastSnapshots()
  }

  startGame(): void {
    if (this.state.phase !== 'lobby' || !allPlayersConnected(this.state.players)) {
      return
    }

    this.commitState({
      ...this.state,
      phase: 'card-entry',
      currentRoundNumber: 1,
    })
    this.broadcastSnapshots()
  }

  submitCardsForPlayer(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    cards: readonly ActionCardInput[],
    request?: { requestId: string; connectionId?: ConnectionId },
  ): boolean {
    const rejection = this.validatePlayerCanSubmit(playerId, roundNumber, cards)
    if (rejection) {
      this.rejectMaybe(request, rejection)
      return false
    }

    const editableCards = getEditableCardsForPlayer(this.state, playerId)
    const nowIso = new Date(this.now()).toISOString()
    let nextState: AuthoritativeGameState

    if (editableCards.length === 0) {
      nextState = commitPlayerCards(
        this.state,
        playerId,
        roundNumber,
        cards,
        this.createCardId,
        nowIso,
      )
    } else {
      const updateInputs = cards.slice(0, editableCards.length)
      const extraInputs = cards.slice(editableCards.length)
      nextState = updatePlayerCards(this.state, playerId, updateInputs)

      if (extraInputs.length > 0) {
        nextState = commitPlayerCards(
          nextState,
          playerId,
          roundNumber,
          extraInputs,
          this.createCardId,
          nowIso,
        )
      } else {
        nextState = {
          ...nextState,
          rounds: {
            ...nextState.rounds,
            [roundNumber]: {
              ...nextState.rounds[roundNumber],
              submittedPlayerIds: [
                ...nextState.rounds[roundNumber].submittedPlayerIds,
                playerId,
              ],
            },
          },
        }
      }
    }

    if (nextState.rounds[roundNumber].submittedPlayerIds.length === PLAYER_COUNT) {
      nextState = {
        ...nextState,
        rounds: {
          ...nextState.rounds,
          [roundNumber]: {
            ...nextState.rounds[roundNumber],
            cardIds: getActiveCardIds(nextState),
          },
        },
      }
      nextState = beginDraftForRound(
        nextState,
        roundNumber,
        getOrderedPlayerIds(nextState.players),
        this.randomInt,
      )
    }

    this.commitState(nextState, request?.requestId)
    this.acceptMaybe(request)
    this.broadcastSnapshots()
    return true
  }

  selectDiscardForPlayer(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    draftCycle: number,
    cardId: CardId,
    request?: { requestId: string; connectionId?: ConnectionId },
  ): boolean {
    const rejection = this.validatePlayerCanDiscard(
      playerId,
      roundNumber,
      draftCycle,
      cardId,
    )
    if (rejection) {
      this.rejectMaybe(request, rejection)
      return false
    }

    let nextState = selectPendingDiscard(this.state, playerId, roundNumber, cardId)
    const draft = nextState.rounds[roundNumber].draft

    if (
      draft &&
      getOrderedPlayerIds(nextState.players)
        .filter((id) => (draft.hands[id]?.length ?? 0) > 1)
        .every((id) => draft.selectedDiscards[id])
    ) {
      nextState = commitAllDiscards(
        nextState,
        roundNumber,
        getOrderedPlayerIds(nextState.players),
      )
    }

    this.commitState(nextState, request?.requestId)
    this.acceptMaybe(request)
    this.broadcastSnapshots()
    return true
  }

  drawRandomAction(): void {
    if (
      this.state.phase !== 'finalists' ||
      this.state.rounds[this.state.currentRoundNumber].selectedCardId
    ) {
      return
    }

    const nextState = selectRandomAction(
      this.state,
      this.state.currentRoundNumber,
      this.randomInt,
    )
    this.commitState(nextState)
    this.broadcastSnapshots()
  }

  startExperience(): void {
    const round = this.state.rounds[this.state.currentRoundNumber]
    if (this.state.phase !== 'selected-action' || !round.selectedCardId) {
      return
    }

    this.commitState(markExperienceStarted(this.state, this.state.currentRoundNumber))
    this.broadcastSnapshots()
  }

  completeExperience(): void {
    const round = this.state.rounds[this.state.currentRoundNumber]
    if (this.state.phase !== 'experience' || !round.experienceStarted) {
      return
    }

    this.commitState(completeExperience(this.state, this.state.currentRoundNumber))
    this.broadcastSnapshots()
  }

  submitCommentForPlayer(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    comment: string,
    request?: { requestId: string; connectionId?: ConnectionId },
  ): boolean {
    const round = this.state.rounds[roundNumber]
    const selectedCard = this.state.cards.find((card) => card.id === round?.selectedCardId)

    if (
      this.state.phase !== 'round-comment' ||
      this.state.currentRoundNumber !== roundNumber ||
      !selectedCard ||
      selectedCard.authorId !== playerId
    ) {
      this.rejectMaybe(request, 'INVALID_PHASE')
      return false
    }

    this.commitState(
      setRoundAuthorComment(this.state, roundNumber, comment),
      request?.requestId,
    )
    this.acceptMaybe(request)
    this.broadcastSnapshots()
    return true
  }

  submitScoreForPlayer(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    satisfaction: number,
    surprise: number,
    request?: { requestId: string; connectionId?: ConnectionId },
  ): boolean {
    const round = this.state.rounds[roundNumber]
    const selectedCard = this.state.cards.find((card) => card.id === round?.selectedCardId)

    if (
      this.state.phase !== 'scoring' ||
      this.state.currentRoundNumber !== roundNumber ||
      !selectedCard ||
      selectedCard.authorId === playerId ||
      getRoundScores(this.state, roundNumber).some((score) => score.evaluatorId === playerId)
    ) {
      this.rejectMaybe(request, 'INVALID_PHASE')
      return false
    }

    const boundedSatisfaction = Math.max(0, Math.min(25, Math.round(satisfaction)))
    const boundedSurprise = Math.max(0, Math.min(25, Math.round(surprise)))
    let nextState = addRoundScore(this.state, {
      roundNumber,
      cardId: selectedCard.id,
      evaluatorId: playerId,
      satisfaction: boundedSatisfaction,
      surprise: boundedSurprise,
    })

    if (getRoundScores(nextState, roundNumber).length >= PLAYER_COUNT - 1) {
      nextState = {
        ...nextState,
        phase: 'round-summary',
      }
    }

    this.commitState(nextState, request?.requestId)
    this.acceptMaybe(request)
    this.broadcastSnapshots()
    return true
  }

  continueToNextRound(): void {
    if (this.state.phase !== 'round-summary') {
      return
    }

    const activeCards = getActiveCardIds(this.state)
    if (activeCards.length <= PLAYER_COUNT) {
      this.finishGame()
      return
    }

    this.commitState(createNextRoundState(this.state))
    this.broadcastSnapshots()
  }

  finishGame(): void {
    const winner = determineWinningCard(this.state)

    this.commitState({
      ...this.state,
      ...winner,
      phase: 'result',
    })
    this.broadcastSnapshots()
  }

  castVoteForPlayer(
    playerId: PlayerId,
    selectedCardId: CardId,
    request?: { requestId: string; connectionId?: ConnectionId },
  ): boolean {
    if (this.state.phase !== 'voting') {
      this.rejectMaybe(request, 'INVALID_PHASE')
      return false
    }

    const validation = validateVote(this.state, playerId, selectedCardId)
    if (!validation.ok) {
      this.rejectMaybe(request, validation.reasonCode ?? 'INVALID_MESSAGE')
      return false
    }

    let nextState = addVote(this.state, { voterId: playerId, selectedCardId })

    if (nextState.votes.length === PLAYER_COUNT) {
      const winner = determineWinningCard(nextState)
      if (winner) {
        nextState = {
          ...nextState,
          ...winner,
          phase: 'reveal',
          revealStartedAt: this.now() + 1500,
        }
      }
    }

    const revealStartedAt =
      nextState.phase === 'reveal' ? nextState.revealStartedAt : undefined

    this.commitState(nextState, request?.requestId)
    this.acceptMaybe(request)
    this.broadcastSnapshots()

    if (revealStartedAt) {
      this.broadcastRevealStarted(revealStartedAt)
    }

    return true
  }

  finishReveal(): void {
    if (this.state.phase !== 'reveal') {
      return
    }

    this.commitState({
      ...this.state,
      phase: 'result',
    })
    this.broadcastSnapshots()
  }

  private validatePlayerCanSubmit(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    cards: readonly ActionCardInput[],
  ): string | undefined {
    if (this.state.phase !== 'card-entry' || this.state.currentRoundNumber !== roundNumber) {
      return 'INVALID_PHASE'
    }

    const round = this.state.rounds[roundNumber]

    if (round.submittedPlayerIds.includes(playerId)) {
      return 'ALREADY_SUBMITTED'
    }

    const editableCards = getEditableCardsForPlayer(this.state, playerId)
    if (editableCards.length === 0 && cards.length !== CARDS_PER_PLAYER) {
      return 'INVALID_CARD_COUNT'
    }

    if (
      editableCards.length > 0 &&
      (cards.length < editableCards.length || cards.length > CARDS_PER_PLAYER)
    ) {
      return 'INVALID_CARD_COUNT'
    }

    const validation = validateCardSubmission(cards)
    if (!validation.ok) {
      return validation.reasonCode ?? 'INVALID_MESSAGE'
    }

    return undefined
  }

  private validatePlayerCanDiscard(
    playerId: PlayerId,
    roundNumber: RoundNumber,
    draftCycle: number,
    cardId: CardId,
  ): string | undefined {
    if (this.state.phase !== 'draft' || this.state.currentRoundNumber !== roundNumber) {
      return 'INVALID_PHASE'
    }

    const draft = this.state.rounds[roundNumber].draft

    if (!draft || draft.completed || draft.cycleIndex + 1 !== draftCycle) {
      return 'INVALID_PHASE'
    }

    if (draft.selectedDiscards[playerId]) {
      return 'ALREADY_SELECTED'
    }

    if ((draft.hands[playerId]?.length ?? 0) <= 1) {
      return 'INVALID_PHASE'
    }

    if (!(draft.hands[playerId] ?? []).includes(cardId)) {
      return 'INVALID_CARD'
    }

    const card = this.state.cards.find((candidate) => candidate.id === cardId)
    if (card?.authorId === playerId) {
      return 'INVALID_CARD'
    }

    return undefined
  }

  private isStale(message: MessageMeta): boolean {
    return message.knownRevision + 1 < this.state.revision
  }

  private rejectMaybe(
    request: { requestId: string; connectionId?: ConnectionId } | undefined,
    reasonCode: string,
  ): void {
    if (request?.connectionId) {
      this.transport.send(request.connectionId, {
        type: 'COMMAND_REJECTED',
        protocolVersion: PROTOCOL_VERSION,
        requestId: request.requestId,
        reasonCode,
        message: userSafeErrorMessage(reasonCode),
        currentRevision: this.state.revision,
      })
    }
  }

  private acceptMaybe(
    request: { requestId: string; connectionId?: ConnectionId } | undefined,
  ): void {
    if (request?.connectionId) {
      this.acceptCommand(request.connectionId, request.requestId)
    }
  }

  private rejectCommand(
    connectionId: ConnectionId,
    message: MessageMeta,
    reasonCode: string,
  ): void {
    this.transport.send(connectionId, {
      type: 'COMMAND_REJECTED',
      protocolVersion: PROTOCOL_VERSION,
      requestId: message.requestId,
      reasonCode,
      message: userSafeErrorMessage(reasonCode),
      currentRevision: this.state.revision,
    })
  }

  private acceptCommand(connectionId: ConnectionId, requestId: string): void {
    this.transport.send(connectionId, {
      type: 'COMMAND_ACCEPTED',
      protocolVersion: PROTOCOL_VERSION,
      requestId,
      revision: this.state.revision,
    })
  }

  private broadcastRevealStarted(startsAt: number): void {
    for (const connectionId of this.playerToConnection.values()) {
      this.transport.send(connectionId, {
        type: 'REVEAL_STARTED',
        protocolVersion: PROTOCOL_VERSION,
        startsAt,
        revision: this.state.revision,
      })
    }
  }

  private sendSnapshot(playerId: PlayerId): void {
    const connectionId = this.playerToConnection.get(playerId)

    if (!connectionId) {
      return
    }

    this.transport.send(connectionId, {
      type: 'STATE_SNAPSHOT',
      protocolVersion: PROTOCOL_VERSION,
      revision: this.state.revision,
      view: this.getViewForPlayer(playerId),
    })
  }

  private broadcastSnapshots(): void {
    for (const playerId of this.playerToConnection.keys()) {
      this.sendSnapshot(playerId)
    }
  }

  private getPlayerForConnection(connectionId: ConnectionId): Player | undefined {
    const playerId = this.connectionToPlayer.get(connectionId)
    return this.state.players.find((player) => player.id === playerId)
  }

  private linkConnection(connectionId: ConnectionId, playerId: PlayerId): void {
    this.connectionToPlayer.set(connectionId, playerId)
    this.playerToConnection.set(playerId, connectionId)
    this.transport.broadcast(() => ({
      type: 'PLAYER_CONNECTION_CHANGED',
      protocolVersion: PROTOCOL_VERSION,
      playerId,
      connectionStatus: 'connected',
      revision: this.state.revision,
    }))
  }

  private updatePlayer(
    playerId: PlayerId,
    patch: Partial<Pick<Player, 'connectionStatus'>>,
  ): AuthoritativeGameState {
    return {
      ...this.state,
      players: this.state.players.map((player) =>
        player.id === playerId ? { ...player, ...patch } : player,
      ),
    }
  }

  private commitState(
    nextState: AuthoritativeGameState,
    processedRequestId?: string,
  ): void {
    const processedRequestIds = processedRequestId
      ? [...nextState.processedRequestIds, processedRequestId].slice(
          -PROCESSED_REQUEST_LIMIT,
        )
      : nextState.processedRequestIds

    this.stateValue = {
      ...nextState,
      revision: nextState.revision + 1,
      processedRequestIds,
      updatedAt: new Date(this.now()).toISOString(),
    }

    this.onStateChanged?.(this.stateValue)
  }
}

export function getSelectedActionCard(
  state: AuthoritativeGameState,
  roundNumber: RoundNumber,
) {
  const selectedCardId = state.rounds[roundNumber].selectedCardId
  return state.cards.find((card) => card.id === selectedCardId)
}

export function isPhaseOneOf(
  phase: GamePhase,
  phases: readonly GamePhase[],
): boolean {
  return phases.includes(phase)
}
