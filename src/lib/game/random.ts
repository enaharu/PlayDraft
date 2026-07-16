const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const PEER_ID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export type RandomInt = (maxExclusive: number) => number

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer')
  }

  const maxUint32 = 0xffffffff
  const limit = maxUint32 - (maxUint32 % maxExclusive)
  const buffer = new Uint32Array(1)

  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0] >= limit)

  return buffer[0] % maxExclusive
}

export function createToken(length = 24): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => BASE64URL_ALPHABET[byte % 64]).join('')
}

function createPeerSafeToken(length = 24): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => PEER_ID_ALPHABET[byte % PEER_ID_ALPHABET.length]).join('')
}

export function createRoomId(): string {
  return `room-${createToken(10)}`
}

export function createClientId(): string {
  return `client-${createPeerSafeToken(16)}`
}

export function createPlayerId(): string {
  return `player-${createToken(16)}`
}

export function createCardId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `card-${createToken(20)}`
}

export function createRequestId(): string {
  return `req-${createToken(18)}`
}

export function createHostPeerId(): string {
  return `playdraft-host-${createPeerSafeToken(18)}`
}
