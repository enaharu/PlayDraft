import type Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import { PROTOCOL_VERSION, type AuthoritativeGameState, type ConnectionId } from '@/types/game'
import type { HostToClientMessage, P2PTransport } from '@/types/network'
import { HostGameEngine } from '@/lib/game/hostReducer'
import { createToken } from '@/lib/game/random'
import { userSafeErrorMessage } from './messages'
import { ClientToHostMessageSchema } from './schemas'
import { getPeerConfig } from './peerConfig'

export type HostPeerStatus =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'recovering'
  | 'error'
  | 'closed'

export interface HostPeerManagerEvents {
  onStatus?: (status: HostPeerStatus, message: string) => void
  onStateChanged?: (state: AuthoritativeGameState) => void
  onError?: (message: string) => void
}

function requestIdFromUnknownMessage(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'requestId' in data &&
    typeof data.requestId === 'string' &&
    data.requestId.length > 0
  ) {
    return data.requestId
  }

  return createToken(8)
}

class HostPeerTransport implements P2PTransport {
  private readonly connections = new Map<ConnectionId, DataConnection>()

  setConnection(connectionId: ConnectionId, connection: DataConnection): void {
    this.connections.set(connectionId, connection)
  }

  removeConnection(connectionId: ConnectionId): void {
    this.connections.delete(connectionId)
  }

  send(connectionId: ConnectionId, message: HostToClientMessage): void {
    const connection = this.connections.get(connectionId)
    if (connection?.open) {
      connection.send(message)
    }
  }

  broadcast(createMessage: (playerId: string) => HostToClientMessage): void {
    for (const [connectionId] of this.connections) {
      this.send(connectionId, createMessage(connectionId))
    }
  }

  close(connectionId: ConnectionId): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.close()
    }
    this.connections.delete(connectionId)
  }
}

export class HostPeerManager {
  readonly engine: HostGameEngine
  private readonly transport = new HostPeerTransport()
  private peer?: Peer
  private retryTimer?: number
  private retryCount = 0

  constructor(
    state: AuthoritativeGameState,
    private readonly events: HostPeerManagerEvents = {},
  ) {
    this.engine = new HostGameEngine(state, this.transport, {
      onStateChanged: (nextState) => this.events.onStateChanged?.(nextState),
    })
  }

  async start(): Promise<void> {
    this.events.onStatus?.('starting', 'ホスト接続を準備しています')
    await this.createPeer()
  }

  destroy(): void {
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer)
    }
    this.peer?.destroy()
    this.peer = undefined
    this.events.onStatus?.('closed', '接続を閉じました')
  }

  private async createPeer(): Promise<void> {
    const { default: PeerConstructor } = await import('peerjs')
    const peer = new PeerConstructor(this.engine.state.hostPeerId, getPeerConfig())
    this.peer = peer

    peer.on('open', () => {
      this.retryCount = 0
      this.events.onStatus?.('ready', 'ルームを作成しました')
    })

    peer.on('connection', (connection) => {
      this.registerConnection(connection)
    })

    peer.on('error', (error) => {
      const errorType = String(error.type ?? '')
      if (errorType === 'unavailable-id' && this.retryCount < 12) {
        this.events.onStatus?.(
          'recovering',
          '同じホストIDの解放を待っています',
        )
        this.retryCount += 1
        this.retryTimer = window.setTimeout(() => {
          peer.destroy()
          void this.createPeer()
        }, Math.min(1000 * this.retryCount, 5000))
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug('Host PeerJS error', error)
      }
      this.events.onStatus?.('error', '通信サーバーへ接続できませんでした')
      this.events.onError?.('通信サーバーへ接続できませんでした')
    })
  }

  private registerConnection(connection: DataConnection): void {
    const connectionId = `${connection.peer}-${createToken(8)}`
    this.transport.setConnection(connectionId, connection)

    connection.on('data', (data: unknown) => {
      const parsed = ClientToHostMessageSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Invalid client message', parsed.error)
        }
        this.transport.send(connectionId, {
          type: 'COMMAND_REJECTED',
          protocolVersion: PROTOCOL_VERSION,
          requestId: requestIdFromUnknownMessage(data),
          reasonCode: 'INVALID_MESSAGE',
          message: userSafeErrorMessage('INVALID_MESSAGE'),
          currentRevision: this.engine.state.revision,
        })
        return
      }

      this.engine.handleMessage(connectionId, parsed.data)
    })

    connection.on('close', () => {
      this.transport.removeConnection(connectionId)
      this.engine.handleConnectionClosed(connectionId)
    })

    connection.on('error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Guest data connection error', error)
      }
      this.transport.removeConnection(connectionId)
      this.engine.handleConnectionClosed(connectionId)
    })
  }
}
