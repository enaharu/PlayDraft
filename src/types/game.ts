export type PlayerId = string
export type CardId = string
export type ConnectionId = string
export type ClientId = string
export type RoundNumber = number

export type GamePhase =
  | 'lobby'
  | 'card-entry'
  | 'card-entry-waiting'
  | 'shuffle'
  | 'draft'
  | 'draft-waiting'
  | 'finalists'
  | 'selected-action'
  | 'experience'
  | 'round-comment'
  | 'scoring'
  | 'round-summary'
  | 'round-complete'
  | 'voting'
  | 'voting-waiting'
  | 'reveal'
  | 'result'
  | 'paused'

export type ConnectionStatus = 'connected' | 'disconnected'

export interface Player {
  id: PlayerId
  clientId: ClientId
  name: string
  order: number
  isHost: boolean
  connectionStatus: ConnectionStatus
  reconnectToken: string
}

export interface ActionCardInput {
  title: string
  description: string
  area: string
  durationMinutes?: 60 | 90 | 120
  budgetPerPerson?: number
  requirementsConfirmed: boolean
}

export interface ActionCard extends ActionCardInput {
  id: CardId
  authorId: PlayerId
  roundNumber: RoundNumber
  status:
    | 'created'
    | 'in-hand'
    | 'discarded'
    | 'finalist'
    | 'selected'
    | 'not-selected'
  currentHolderId?: PlayerId
  createdAt: string
}

export interface DraftState {
  cycleIndex: number
  totalCycles: number
  hands: Record<PlayerId, CardId[]>
  selectedDiscards: Partial<Record<PlayerId, CardId>>
  completed: boolean
}

export interface RoundState {
  roundNumber: RoundNumber
  cardIds: CardId[]
  submittedPlayerIds: PlayerId[]
  draft?: DraftState
  finalistCardIds: CardId[]
  selectedCardId?: CardId
  authorComment?: string
  experienceStarted: boolean
  experienceCompleted: boolean
}

export interface Vote {
  voterId: PlayerId
  selectedCardId: CardId
}

export interface RoundScore {
  roundNumber: RoundNumber
  cardId: CardId
  evaluatorId: PlayerId
  satisfaction: number
  surprise: number
}

export interface AuthoritativeGameState {
  protocolVersion: 1
  revision: number
  roomId: string
  roomToken: string
  hostPeerId: string
  phase: GamePhase
  phaseBeforePause?: GamePhase
  players: Player[]
  cards: ActionCard[]
  rounds: Record<number, RoundState>
  currentRoundNumber: RoundNumber
  votes: Vote[]
  scores: RoundScore[]
  winningCardId?: CardId
  winnerPlayerId?: PlayerId
  revealStartedAt?: number
  processedRequestIds: string[]
  createdAt: string
  updatedAt: string
}

export interface AnonymousActionCard {
  id: CardId
  roundNumber: RoundNumber
  title: string
  description: string
  area: string
  durationMinutes?: 60 | 90 | 120
  budgetPerPerson?: number
}

export interface ResultCardView extends AnonymousActionCard {
  authorName: string
  roundNumber: RoundNumber
  satisfactionTotal: number
  surpriseTotal: number
  totalScore: number
  comment?: string
  isWinner: boolean
}

export interface PublicPlayerView {
  id: PlayerId
  name: string
  order: number
  isHost: boolean
  connectionStatus: ConnectionStatus
  hasSubmittedCards: boolean
  hasSelectedDiscard: boolean
  hasVoted: boolean
  hasScored: boolean
  handCount: number
}

export interface PublicGameView {
  roomId: string
  phase: GamePhase
  phaseBeforePause?: GamePhase
  currentRoundNumber: RoundNumber
  requiredPlayerCount: number
  joinedPlayerCount: number
  players: PublicPlayerView[]
  draftCycle: number
  draftTotalCycles: number
  submittedCount: number
  discardSelectedCount: number
  selectedExperiences: AnonymousActionCard[]
  voteSubmittedCount: number
  scoreSubmittedCount: number
  voteChoices: AnonymousActionCard[]
  currentSelectedAction?: ResultCardView
  revealStartedAt?: number
  resultCards: ResultCardView[]
  winningCard?: ResultCardView
  winnerName?: string
  disconnectedPlayerNames: string[]
}

export interface PrivatePlayerView {
  playerId: PlayerId
  displayName: string
  isHost: boolean
  currentHand: AnonymousActionCard[]
  editableCards: AnonymousActionCard[]
  submittedThisRound: boolean
  selectedDiscardCardId?: CardId
  selectedVoteCardId?: CardId
  hasVoted: boolean
  hasScored: boolean
  canStartGame: boolean
  canSubmitCards: boolean
  canSelectDiscard: boolean
  canDrawAction: boolean
  canStartExperience: boolean
  canCompleteExperience: boolean
  canSubmitComment: boolean
  canScoreRound: boolean
  canContinueRound: boolean
  canFinishGame: boolean
  canVote: boolean
  canFinishReveal: boolean
}

export interface ClientGameView {
  revision: number
  publicState: PublicGameView
  privateState: PrivatePlayerView
}

export const PLAYER_COUNT = 3
export const CARDS_PER_PLAYER = 5
export const DRAFT_CYCLES = 4
export const PROTOCOL_VERSION = 1
