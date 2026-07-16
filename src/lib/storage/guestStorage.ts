import { GUEST_STORAGE_KEY } from '@/lib/constants'
import { PersistedGuestSessionSchema } from '@/lib/p2p/schemas'

const PEER_SAFE_ID_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/

export interface PersistedGuestSession {
  version: 1
  role: 'guest'
  roomId: string
  hostPeerId: string
  clientId: string
  playerId: string
  reconnectToken: string
  displayName: string
}

function clearLegacyGuestSession(): void {
  window.localStorage.removeItem(GUEST_STORAGE_KEY)
}

export function saveGuestSession(session: PersistedGuestSession): void {
  clearLegacyGuestSession()
  window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session))
}

export function loadGuestSession(): PersistedGuestSession | undefined {
  clearLegacyGuestSession()
  const raw = window.sessionStorage.getItem(GUEST_STORAGE_KEY)
  if (!raw) {
    return undefined
  }

  try {
    const parsed = PersistedGuestSessionSchema.safeParse(JSON.parse(raw))
    if (
      parsed.success &&
      PEER_SAFE_ID_PATTERN.test(parsed.data.hostPeerId) &&
      PEER_SAFE_ID_PATTERN.test(parsed.data.clientId)
    ) {
      return parsed.data
    }
  } catch {
    window.sessionStorage.removeItem(GUEST_STORAGE_KEY)
  }

  window.sessionStorage.removeItem(GUEST_STORAGE_KEY)
  return undefined
}

export function clearGuestSession(): void {
  clearLegacyGuestSession()
  window.sessionStorage.removeItem(GUEST_STORAGE_KEY)
}
