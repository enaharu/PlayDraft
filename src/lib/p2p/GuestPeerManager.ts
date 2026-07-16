import type Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { ActionCardInput, CardId, ClientGameView, RoundNumber } from '@/types/game'
import type { HostToClientMessage } from '@/types/network'
import type { InvitePayload } from './invite'
import type { PersistedGuestSession } from '@/lib/storage/guestStorage'
import { createClientId } from '@/lib/game/random'
import { createMessageMeta } from './messages'
import { HostToClientMessageSchema } from './schemas'
import { getPeerConfig } from './peerConfig'
import { reconnectDelay } from './reconnect'

export type GuestPeerStatus =
  | 'idle'
  | 'connecting'
  | 'joined'
  | 'reconnecting'
  | 'closed'
  | 'error'

export interface GuestPeerManagerEvents {
  onStatus?: (status: GuestPeerStatus, message: string) => void
  onView?: (view: ClientGameView) => void
  onJoined?: (session: PersistedGuestSession) => void
  onRejected?: (message: string) => void
  onError?: (message: string) => void
}

class PeerIdTakenError extends Error {
  constructor() {
    super('参加者IDがすでに使用中です')
  }
}

function sanitizeCardInput(card: ActionCardInput): ActionCardInput {
  return {
    title: card.title,
    description: card.description,
    area: card.area,
    ...(card.durationMinutes == null
      ? {}
      : { durationMinutes: card.durationMinutes }),
    ...(card.budgetPerPerson == null
      ? {}
      : { budgetPerPerson: card.budgetPerPerson }),
    requirementsConfirmed: card.requirementsConfirmed ?? true,
  }
}

export class GuestPeerManager {
  private peer?: Peer
  private connection?: DataConnection
  private latestRevision = 0
  private reconnectAttempt = 0
  private reconnectTimer?: number
  private activeSession?: PersistedGuestSession
  private activeInvite?: InvitePayload
  private activeDisplayName = ''
  private activeClientId = createClientId()
  private peerCreateRetryCount = 0

  constructor(private readonly events: GuestPeerManagerEvents = {}) {}

  async join(invite: InvitePayload, displayName: string): Promise<void> {
    this.activeInvite = invite
    this.activeDisplayName = displayName.trim()
    this.activeSession = undefined
    this.activeClientId = createClientId()
    this.peerCreateRetryCount = 0
    this.latestRevision = 0
    while (true) {
      try {
        await this.connectAndSendJoin()
        return
      } catch (error) {
        if (error instanceof PeerIdTakenError && this.peerCreateRetryCount < 3) {
          this.peerCreateRetryCount += 1
          this.activeClientId = createClientId()
          continue
        }

        throw error
      }
    }
  }

  async reconnect(session: PersistedGuestSession): Promise<void> {
    this.activeSession = session
    this.peerCreateRetryCount = 0
    this.activeInvite = {
      version: 1,
      hostPeerId: session.hostPeerId,
      roomId: session.roomId,
      roomToken: '',
    }
    this.activeDisplayName = session.displayName
    await this.connectAndSendReconnect()
  }

  destroy(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
    this.connection?.close()
    this.peer?.destroy()
    this.connection = undefined
    this.peer = undefined
    this.events.onStatus?.('closed', '接続を閉じました')
  }

  submitCards(roundNumber: RoundNumber, cards: ActionCardInput[]): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'SUBMIT_CARDS',
      roundNumber,
      cards: cards.map(sanitizeCardInput),
    })
  }

  selectDiscard(roundNumber: RoundNumber, draftCycle: number, cardId: CardId): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'SELECT_DISCARD',
      roundNumber,
      draftCycle,
      cardId,
    })
  }

  castVote(selectedCardId: CardId): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'CAST_VOTE',
      selectedCardId,
    })
  }

  submitComment(roundNumber: RoundNumber, comment: string): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'SUBMIT_COMMENT',
      roundNumber,
      comment,
    })
  }

  submitScore(roundNumber: RoundNumber, satisfaction: number, surprise: number): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'SUBMIT_SCORE',
      roundNumber,
      satisfaction,
      surprise,
    })
  }

  requestSnapshot(): void {
    this.send({
      ...createMessageMeta(this.latestRevision),
      type: 'REQUEST_SNAPSHOT',
    })
  }

  private async connectAndSendJoin(): Promise<void> {
    const invite = this.activeInvite
    if (!invite) {
      return
    }

    this.cleanupConnectionOnly()
    this.events.onStatus?.('connecting', 'ホストへ接続しています')
    const peer = await this.createPeer()
    const connection = peer.connect(invite.hostPeerId, { reliable: true })
    this.wireConnection(connection, () => {
      connection.send({
        ...createMessageMeta(this.latestRevision),
        type: 'JOIN_REQUEST',
        roomId: invite.roomId,
        roomToken: invite.roomToken,
        clientId: this.activeClientId,
        displayName: this.activeDisplayName,
      })
    })
  }

  private async connectAndSendReconnect(): Promise<void> {
    const session = this.activeSession
    if (!session) {
      return
    }

    this.cleanupConnectionOnly()
    this.events.onStatus?.('reconnecting', 'ホストへ再接続しています')
    const peer = await this.createPeer()
    const connection = peer.connect(session.hostPeerId, { reliable: true })
    this.wireConnection(connection, () => {
      connection.send({
        ...createMessageMeta(this.latestRevision),
        type: 'RECONNECT_REQUEST',
        roomId: session.roomId,
        clientId: session.clientId,
        reconnectToken: session.reconnectToken,
      })
    })
  }

  private async createPeer(): Promise<Peer> {
    this.peer?.destroy()
    const { default: PeerConstructor } = await import('peerjs')
    const peerId = this.activeSession?.clientId ?? this.activeClientId
    const peer = new PeerConstructor(peerId, getPeerConfig())
    this.peer = peer

    await new Promise<void>((resolve, reject) => {
      peer.on('open', () => {
        resolve()
      })

      peer.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error)
        const isTaken = message.includes('is taken')

        if (process.env.NODE_ENV === 'development') {
          console.debug('Guest PeerJS error', error)
        }
        this.events.onStatus?.(
          'error',
          isTaken ? '参加者IDがすでに使用中です' : '通信サーバーに接続できませんでした',
        )
        reject(isTaken ? new PeerIdTakenError() : error instanceof Error ? error : new Error(String(error)))
      })
    })

    return peer
  }

  private wireConnection(connection: DataConnection, onOpen: () => void): void {
    this.connection = connection

    connection.on('open', () => {
      this.reconnectAttempt = 0
      onOpen()
    })

    connection.on('data', (data: unknown) => {
      const parsed = HostToClientMessageSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Invalid host message', parsed.error)
        }
        this.events.onError?.('通信データを確認できませんでした')
        return
      }

      this.handleHostMessage(parsed.data)
    })

    connection.on('close', () => {
      this.scheduleReconnect()
    })

    connection.on('error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Host connection error', error)
      }
      this.scheduleReconnect()
    })
  }

  private handleHostMessage(message: HostToClientMessage): void {
    if (message.type === 'JOIN_REJECTED') {
      this.events.onRejected?.(message.message)
      this.events.onStatus?.('error', message.message)
      return
    }

    if (message.type === 'COMMAND_REJECTED') {
      this.events.onError?.(message.message)
      return
    }

    if (message.type === 'JOIN_ACCEPTED') {
      if (message.revision < this.latestRevision) {
        return
      }

      this.latestRevision = message.revision
      const invite = this.activeInvite
      if (invite) {
        const session: PersistedGuestSession = {
          version: 1,
          role: 'guest',
          roomId: invite.roomId,
          hostPeerId: invite.hostPeerId,
          clientId: this.activeClientId,
          playerId: message.playerId,
          reconnectToken: message.reconnectToken,
          displayName: message.view.privateState.displayName,
        }
        this.activeSession = session
        this.events.onJoined?.(session)
      }
      this.events.onView?.(message.view)
      this.events.onStatus?.('joined', '参加しました')
      return
    }

    if (message.type === 'STATE_SNAPSHOT') {
      if (message.revision < this.latestRevision) {
        return
      }
      this.latestRevision = message.revision
      this.events.onView?.(message.view)
      this.events.onStatus?.('joined', '同期しました')
      return
    }

    if (message.type === 'REVEAL_STARTED') {
      this.latestRevision = Math.max(this.latestRevision, message.revision)
    }
  }

  private send(message: Parameters<DataConnection['send']>[0]): void {
    if (!this.connection?.open) {
      this.events.onError?.('ホストとの接続を準備中です')
      this.scheduleReconnect()
      return
    }

    this.connection.send(message)
  }

  private scheduleReconnect(): void {
    if (!this.activeSession) {
      this.events.onStatus?.('error', 'ホストとの接続が切れました')
      return
    }

    if (this.reconnectTimer) {
      return
    }

    const delay = reconnectDelay(this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.events.onStatus?.('reconnecting', '再接続を試みています')
    this.cleanupConnectionOnly()
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined
      void this.connectAndSendReconnect()
    }, delay)
  }

  private cleanupConnectionOnly(): void {
    const connection = this.connection
    this.connection = undefined
    connection?.close()
    this.peer?.destroy()
    this.peer = undefined
  }
}
