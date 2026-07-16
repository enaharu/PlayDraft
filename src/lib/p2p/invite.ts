import { INVITE_HASH_KEY } from '@/lib/constants'

export interface InvitePayload {
  version: 1
  hostPeerId: string
  roomId: string
  roomToken: string
}

export function encodeInvitePayload(payload: InvitePayload): string {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

export function decodeInvitePayload(encoded: string): InvitePayload | undefined {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      'hostPeerId' in parsed &&
      'roomId' in parsed &&
      'roomToken' in parsed
    ) {
      const payload = parsed as Record<string, unknown>
      if (
        payload.version === 1 &&
        typeof payload.hostPeerId === 'string' &&
        typeof payload.roomId === 'string' &&
        typeof payload.roomToken === 'string'
      ) {
        return {
          version: 1,
          hostPeerId: payload.hostPeerId,
          roomId: payload.roomId,
          roomToken: payload.roomToken,
        }
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

export function readInviteFromLocation(location: Location): InvitePayload | undefined {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  const params = new URLSearchParams(hash)
  const encoded = params.get(INVITE_HASH_KEY)

  return encoded ? decodeInvitePayload(encoded) : undefined
}

export function createInviteUrl(payload: InvitePayload, location: Location): string {
  const url = new URL(location.href)
  url.search = ''
  url.hash = `${INVITE_HASH_KEY}=${encodeInvitePayload(payload)}`
  return url.toString()
}
