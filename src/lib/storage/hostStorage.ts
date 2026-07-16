import { HOST_STORAGE_KEY } from '@/lib/constants'
import { PersistedHostGameSchema } from '@/lib/p2p/schemas'
import type { AuthoritativeGameState } from '@/types/game'

const PEER_SAFE_ID_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/

export interface PersistedHostGame {
  version: 1
  role: 'host'
  roomId: string
  roomToken: string
  hostPeerId: string
  state: AuthoritativeGameState
}

export function saveHostGame(state: AuthoritativeGameState): void {
  const payload: PersistedHostGame = {
    version: 1,
    role: 'host',
    roomId: state.roomId,
    roomToken: state.roomToken,
    hostPeerId: state.hostPeerId,
    state,
  }

  window.localStorage.setItem(HOST_STORAGE_KEY, JSON.stringify(payload))
}

export function loadHostGame(): PersistedHostGame | undefined {
  const raw = window.localStorage.getItem(HOST_STORAGE_KEY)
  if (!raw) {
    return undefined
  }

  try {
    const parsed = PersistedHostGameSchema.safeParse(JSON.parse(raw))
    if (
      parsed.success &&
      PEER_SAFE_ID_PATTERN.test(parsed.data.hostPeerId) &&
      PEER_SAFE_ID_PATTERN.test(parsed.data.state.hostPeerId)
    ) {
      return parsed.data as PersistedHostGame
    }
  } catch {
    window.localStorage.removeItem(HOST_STORAGE_KEY)
  }

  window.localStorage.removeItem(HOST_STORAGE_KEY)
  return undefined
}

export function clearHostGame(): void {
  window.localStorage.removeItem(HOST_STORAGE_KEY)
}
