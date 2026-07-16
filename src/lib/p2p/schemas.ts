import { z } from 'zod'
import {
  ActionCardInputSchema,
  AuthoritativeGameStateSchema,
  GamePhaseSchema,
} from '@/lib/game/validation'
import type { ClientGameView } from '@/types/game'

const RoundNumberSchema = z.number().int().positive()
const OptionalDurationSchema = z
  .union([z.literal(60), z.literal(90), z.literal(120), z.null()])
  .optional()
  .transform((value) => value ?? undefined)
const OptionalBudgetSchema = z
  .union([z.number().finite().nonnegative(), z.null()])
  .optional()
  .transform((value) => value ?? undefined)

export const MessageMetaSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: z.string().min(1),
  sentAt: z.number().finite(),
  knownRevision: z.number().int().nonnegative(),
})

export const JoinRequestMessageSchema = MessageMetaSchema.extend({
  type: z.literal('JOIN_REQUEST'),
  roomId: z.string().min(1),
  roomToken: z.string().min(1),
  clientId: z.string().min(1),
  displayName: z.string().trim().min(1).max(32),
  reconnectToken: z.string().optional(),
})

export const SubmitCardsMessageSchema = MessageMetaSchema.extend({
  type: z.literal('SUBMIT_CARDS'),
  roundNumber: RoundNumberSchema,
  cards: z.array(ActionCardInputSchema).min(1).max(5),
})

export const SelectDiscardMessageSchema = MessageMetaSchema.extend({
  type: z.literal('SELECT_DISCARD'),
  roundNumber: RoundNumberSchema,
  draftCycle: z.number().int().positive(),
  cardId: z.string().min(1),
})

export const CastVoteMessageSchema = MessageMetaSchema.extend({
  type: z.literal('CAST_VOTE'),
  selectedCardId: z.string().min(1),
})

export const SubmitCommentMessageSchema = MessageMetaSchema.extend({
  type: z.literal('SUBMIT_COMMENT'),
  roundNumber: RoundNumberSchema,
  comment: z.string().trim().max(120),
})

export const SubmitScoreMessageSchema = MessageMetaSchema.extend({
  type: z.literal('SUBMIT_SCORE'),
  roundNumber: RoundNumberSchema,
  satisfaction: z.number().int().min(0).max(25),
  surprise: z.number().int().min(0).max(25),
})

export const RequestSnapshotMessageSchema = MessageMetaSchema.extend({
  type: z.literal('REQUEST_SNAPSHOT'),
})

export const ReconnectRequestMessageSchema = MessageMetaSchema.extend({
  type: z.literal('RECONNECT_REQUEST'),
  roomId: z.string().min(1),
  clientId: z.string().min(1),
  reconnectToken: z.string().min(1),
})

export const PingMessageSchema = MessageMetaSchema.extend({
  type: z.literal('PING'),
})

export const ClientToHostMessageSchema = z.discriminatedUnion('type', [
  JoinRequestMessageSchema,
  SubmitCardsMessageSchema,
  SelectDiscardMessageSchema,
  CastVoteMessageSchema,
  SubmitCommentMessageSchema,
  SubmitScoreMessageSchema,
  RequestSnapshotMessageSchema,
  ReconnectRequestMessageSchema,
  PingMessageSchema,
])

const AnonymousActionCardSchema = z.object({
  id: z.string(),
  roundNumber: RoundNumberSchema,
  title: z.string(),
  description: z.string(),
  area: z.string(),
  durationMinutes: OptionalDurationSchema,
  budgetPerPerson: OptionalBudgetSchema,
})

const ResultCardViewSchema = AnonymousActionCardSchema.extend({
  authorName: z.string(),
  satisfactionTotal: z.number().int().nonnegative(),
  surpriseTotal: z.number().int().nonnegative(),
  totalScore: z.number().int().nonnegative(),
  comment: z.string().optional(),
  isWinner: z.boolean(),
})

const PublicPlayerViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
  isHost: z.boolean(),
  connectionStatus: z.union([z.literal('connected'), z.literal('disconnected')]),
  hasSubmittedCards: z.boolean(),
  hasSelectedDiscard: z.boolean(),
  hasVoted: z.boolean(),
  hasScored: z.boolean(),
  handCount: z.number().int().nonnegative(),
})

export const PublicGameViewSchema = z.object({
  roomId: z.string(),
  phase: GamePhaseSchema,
  phaseBeforePause: GamePhaseSchema.optional(),
  currentRoundNumber: RoundNumberSchema,
  requiredPlayerCount: z.number().int().positive(),
  joinedPlayerCount: z.number().int().nonnegative(),
  players: z.array(PublicPlayerViewSchema),
  draftCycle: z.number().int().nonnegative(),
  draftTotalCycles: z.number().int().positive(),
  submittedCount: z.number().int().nonnegative(),
  discardSelectedCount: z.number().int().nonnegative(),
  selectedExperiences: z.array(AnonymousActionCardSchema),
  voteSubmittedCount: z.number().int().nonnegative(),
  scoreSubmittedCount: z.number().int().nonnegative(),
  voteChoices: z.array(AnonymousActionCardSchema),
  currentSelectedAction: ResultCardViewSchema.optional(),
  revealStartedAt: z.number().optional(),
  resultCards: z.array(ResultCardViewSchema),
  winningCard: ResultCardViewSchema.optional(),
  winnerName: z.string().optional(),
  disconnectedPlayerNames: z.array(z.string()),
})

export const PrivatePlayerViewSchema = z.object({
  playerId: z.string(),
  displayName: z.string(),
  isHost: z.boolean(),
  currentHand: z.array(AnonymousActionCardSchema),
  editableCards: z.array(AnonymousActionCardSchema),
  submittedThisRound: z.boolean(),
  selectedDiscardCardId: z.string().optional(),
  selectedVoteCardId: z.string().optional(),
  hasVoted: z.boolean(),
  hasScored: z.boolean(),
  canStartGame: z.boolean(),
  canSubmitCards: z.boolean(),
  canSelectDiscard: z.boolean(),
  canDrawAction: z.boolean(),
  canStartExperience: z.boolean(),
  canCompleteExperience: z.boolean(),
  canSubmitComment: z.boolean(),
  canScoreRound: z.boolean(),
  canContinueRound: z.boolean(),
  canFinishGame: z.boolean(),
  canVote: z.boolean(),
  canFinishReveal: z.boolean(),
})

export const ClientGameViewSchema = z.custom<ClientGameView>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    'revision' in value &&
    'publicState' in value &&
    'privateState' in value,
)

export const HostToClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('JOIN_ACCEPTED'),
    protocolVersion: z.literal(1),
    requestId: z.string(),
    playerId: z.string(),
    reconnectToken: z.string(),
    revision: z.number().int().nonnegative(),
    view: ClientGameViewSchema,
  }),
  z.object({
    type: z.literal('JOIN_REJECTED'),
    protocolVersion: z.literal(1),
    requestId: z.string(),
    reasonCode: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('STATE_SNAPSHOT'),
    protocolVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    view: ClientGameViewSchema,
  }),
  z.object({
    type: z.literal('COMMAND_ACCEPTED'),
    protocolVersion: z.literal(1),
    requestId: z.string(),
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('COMMAND_REJECTED'),
    protocolVersion: z.literal(1),
    requestId: z.string(),
    reasonCode: z.string(),
    message: z.string(),
    currentRevision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('PLAYER_CONNECTION_CHANGED'),
    protocolVersion: z.literal(1),
    playerId: z.string(),
    connectionStatus: z.union([z.literal('connected'), z.literal('disconnected')]),
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('PONG'),
    protocolVersion: z.literal(1),
    requestId: z.string(),
    sentAt: z.number(),
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('REVEAL_STARTED'),
    protocolVersion: z.literal(1),
    startsAt: z.number(),
    revision: z.number().int().nonnegative(),
  }),
])

export const PersistedHostGameSchema = z.object({
  version: z.literal(1),
  role: z.literal('host'),
  roomId: z.string(),
  roomToken: z.string(),
  hostPeerId: z.string(),
  state: AuthoritativeGameStateSchema,
})

export const PersistedGuestSessionSchema = z.object({
  version: z.literal(1),
  role: z.literal('guest'),
  roomId: z.string(),
  hostPeerId: z.string(),
  clientId: z.string(),
  playerId: z.string(),
  reconnectToken: z.string(),
  displayName: z.string(),
})
