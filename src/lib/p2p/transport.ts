import type { ConnectionId, PlayerId } from '@/types/game'
import type { HostToClientMessage, P2PTransport } from '@/types/network'

export class MemoryTransport implements P2PTransport {
  readonly sent: Array<{ connectionId: ConnectionId; message: HostToClientMessage }> = []
  readonly closed: ConnectionId[] = []
  private playerConnections = new Map<PlayerId, ConnectionId>()

  setPlayerConnection(playerId: PlayerId, connectionId: ConnectionId): void {
    this.playerConnections.set(playerId, connectionId)
  }

  removeConnection(connectionId: ConnectionId): void {
    for (const [playerId, storedConnectionId] of this.playerConnections) {
      if (storedConnectionId === connectionId) {
        this.playerConnections.delete(playerId)
      }
    }
  }

  send(connectionId: ConnectionId, message: HostToClientMessage): void {
    this.sent.push({ connectionId, message })
  }

  broadcast(createMessage: (playerId: PlayerId) => HostToClientMessage): void {
    for (const [playerId, connectionId] of this.playerConnections) {
      this.send(connectionId, createMessage(playerId))
    }
  }

  close(connectionId: ConnectionId): void {
    this.closed.push(connectionId)
    this.removeConnection(connectionId)
  }
}
