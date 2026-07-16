import { z } from 'zod'

const OptionalDurationSchema = z
  .union([z.literal(60), z.literal(90), z.literal(120), z.null()])
  .optional()
  .transform((value) => value ?? undefined)

const OptionalBudgetSchema = z
  .union([z.number().finite().min(0).max(50000), z.null()])
  .optional()
  .transform((value) => value ?? undefined)

export const ActionCardInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280),
  area: z.string().trim().max(80),
  durationMinutes: OptionalDurationSchema,
  budgetPerPerson: OptionalBudgetSchema,
  requirementsConfirmed: z.boolean().optional().default(true),
})

export const PlayerSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  isHost: z.boolean(),
  connectionStatus: z.union([z.literal('connected'), z.literal('disconnected')]),
  reconnectToken: z.string().min(8),
})

export const ActionCardSchema = ActionCardInputSchema.extend({
  id: z.string().min(1),
  authorId: z.string().min(1),
  roundNumber: z.number().int().positive(),
  status: z.union([
    z.literal('created'),
    z.literal('in-hand'),
    z.literal('discarded'),
    z.literal('finalist'),
    z.literal('selected'),
    z.literal('not-selected'),
  ]),
  currentHolderId: z.string().optional(),
  createdAt: z.string().min(1),
})

export const DraftStateSchema = z.object({
  cycleIndex: z.number().int().nonnegative(),
  totalCycles: z.number().int().nonnegative(),
  hands: z.record(z.string(), z.array(z.string())),
  selectedDiscards: z.record(z.string(), z.string()),
  completed: z.boolean(),
})

export const RoundStateSchema = z.object({
  roundNumber: z.number().int().positive(),
  cardIds: z.array(z.string()),
  submittedPlayerIds: z.array(z.string()),
  draft: DraftStateSchema.optional(),
  finalistCardIds: z.array(z.string()),
  selectedCardId: z.string().optional(),
  authorComment: z.string().optional(),
  experienceStarted: z.boolean(),
  experienceCompleted: z.boolean(),
})

export const VoteSchema = z.object({
  voterId: z.string().min(1),
  selectedCardId: z.string().min(1),
})

export const GamePhaseSchema = z.union([
  z.literal('lobby'),
  z.literal('card-entry'),
  z.literal('card-entry-waiting'),
  z.literal('shuffle'),
  z.literal('draft'),
  z.literal('draft-waiting'),
  z.literal('finalists'),
  z.literal('selected-action'),
  z.literal('experience'),
  z.literal('round-comment'),
  z.literal('scoring'),
  z.literal('round-summary'),
  z.literal('round-complete'),
  z.literal('voting'),
  z.literal('voting-waiting'),
  z.literal('reveal'),
  z.literal('result'),
  z.literal('paused'),
])

export const RoundScoreSchema = z.object({
  roundNumber: z.number().int().positive(),
  cardId: z.string().min(1),
  evaluatorId: z.string().min(1),
  satisfaction: z.number().int().min(0).max(25),
  surprise: z.number().int().min(0).max(25),
})

export const AuthoritativeGameStateSchema = z.object({
  protocolVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  roomId: z.string().min(1),
  roomToken: z.string().min(8),
  hostPeerId: z.string().min(1),
  phase: GamePhaseSchema,
  phaseBeforePause: GamePhaseSchema.optional(),
  players: z.array(PlayerSchema),
  cards: z.array(ActionCardSchema),
  rounds: z.record(z.coerce.number().int().positive(), RoundStateSchema),
  currentRoundNumber: z.number().int().positive(),
  votes: z.array(VoteSchema),
  scores: z.array(RoundScoreSchema),
  winningCardId: z.string().optional(),
  winnerPlayerId: z.string().optional(),
  revealStartedAt: z.number().optional(),
  processedRequestIds: z.array(z.string()),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})
