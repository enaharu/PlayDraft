import type {
  ActionCardInput,
  CardId,
  ClientGameView,
  ClientId,
  ConnectionId,
  PlayerId,
  RoundNumber,
} from './game'

export interface MessageMeta {
  protocolVersion: 1
  requestId: string
  sentAt: number
  knownRevision: number
}

export interface JoinRequestMessage extends MessageMeta {
  type: 'JOIN_REQUEST'
  roomId: string
  roomToken: string
  clientId: ClientId
  displayName: string
  reconnectToken?: string
}

export interface SubmitCardsMessage extends MessageMeta {
  type: 'SUBMIT_CARDS'
  roundNumber: RoundNumber
  cards: ActionCardInput[]
}

export interface SelectDiscardMessage extends MessageMeta {
  type: 'SELECT_DISCARD'
  roundNumber: RoundNumber
  draftCycle: number
  cardId: CardId
}

export interface CastVoteMessage extends MessageMeta {
  type: 'CAST_VOTE'
  selectedCardId: CardId
}

export interface SubmitCommentMessage extends MessageMeta {
  type: 'SUBMIT_COMMENT'
  roundNumber: RoundNumber
  comment: string
}

export interface SubmitScoreMessage extends MessageMeta {
  type: 'SUBMIT_SCORE'
  roundNumber: RoundNumber
  satisfaction: number
  surprise: number
}

export interface RequestSnapshotMessage extends MessageMeta {
  type: 'REQUEST_SNAPSHOT'
}

export interface ReconnectRequestMessage extends MessageMeta {
  type: 'RECONNECT_REQUEST'
  roomId: string
  clientId: ClientId
  reconnectToken: string
}

export interface PingMessage extends MessageMeta {
  type: 'PING'
}

export type ClientToHostMessage =
  | JoinRequestMessage
  | SubmitCardsMessage
  | SelectDiscardMessage
  | CastVoteMessage
  | SubmitCommentMessage
  | SubmitScoreMessage
  | RequestSnapshotMessage
  | ReconnectRequestMessage
  | PingMessage

export interface JoinAcceptedMessage {
  type: 'JOIN_ACCEPTED'
  protocolVersion: 1
  requestId: string
  playerId: PlayerId
  reconnectToken: string
  revision: number
  view: ClientGameView
}

export interface JoinRejectedMessage {
  type: 'JOIN_REJECTED'
  protocolVersion: 1
  requestId: string
  reasonCode: string
  message: string
}

export interface StateSnapshotMessage {
  type: 'STATE_SNAPSHOT'
  protocolVersion: 1
  revision: number
  view: ClientGameView
}

export interface CommandAcceptedMessage {
  type: 'COMMAND_ACCEPTED'
  protocolVersion: 1
  requestId: string
  revision: number
}

export interface CommandRejectedMessage {
  type: 'COMMAND_REJECTED'
  protocolVersion: 1
  requestId: string
  reasonCode: string
  message: string
  currentRevision: number
}

export interface PlayerConnectionChangedMessage {
  type: 'PLAYER_CONNECTION_CHANGED'
  protocolVersion: 1
  playerId: PlayerId
  connectionStatus: 'connected' | 'disconnected'
  revision: number
}

export interface PongMessage {
  type: 'PONG'
  protocolVersion: 1
  requestId: string
  sentAt: number
  revision: number
}

export interface RevealStartedMessage {
  type: 'REVEAL_STARTED'
  protocolVersion: 1
  startsAt: number
  revision: number
}

export type HostToClientMessage =
  | JoinAcceptedMessage
  | JoinRejectedMessage
  | StateSnapshotMessage
  | CommandAcceptedMessage
  | CommandRejectedMessage
  | PlayerConnectionChangedMessage
  | PongMessage
  | RevealStartedMessage

export interface P2PTransport {
  send(connectionId: ConnectionId, message: HostToClientMessage): void
  broadcast(createMessage: (playerId: PlayerId) => HostToClientMessage): void
  close(connectionId: ConnectionId): void
}
