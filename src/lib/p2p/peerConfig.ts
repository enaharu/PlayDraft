export interface PeerConnectionConfig {
  host: string
  port: number
  path: string
  secure: boolean
  debug: 0 | 1 | 2 | 3
  config: {
    iceServers: RTCIceServer[]
  }
}

export function getPeerConfig(): PeerConnectionConfig {
  return {
    host: process.env.NEXT_PUBLIC_PEER_HOST ?? 'localhost',
    port: Number(process.env.NEXT_PUBLIC_PEER_PORT ?? 9000),
    path: process.env.NEXT_PUBLIC_PEER_PATH ?? '/peerjs',
    secure: process.env.NEXT_PUBLIC_PEER_SECURE === 'true',
    debug: process.env.NODE_ENV === 'development' ? 2 : 1,
    config: {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    },
  }
}

export function getSignalingHealthUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SIGNALING_HEALTH_URL ??
    `${getPeerConfig().secure ? 'https' : 'http'}://${getPeerConfig().host}:${getPeerConfig().port}/health`
  )
}

export interface WakeupStatus {
  status: 'checking' | 'waking' | 'ready' | 'failed'
  message: string
}

export async function waitForSignalingServer(
  onStatus: (status: WakeupStatus) => void,
  timeoutMs = 90_000,
): Promise<boolean> {
  const healthUrl = getSignalingHealthUrl()
  const startedAt = Date.now()
  let attempt = 0

  while (Date.now() - startedAt < timeoutMs) {
    onStatus({
      status: attempt === 0 ? 'checking' : 'waking',
      message:
        attempt === 0
          ? '通信サーバーを確認しています'
          : '通信サーバーを起動しています',
    })

    try {
      const response = await fetch(healthUrl, { cache: 'no-store' })
      if (response.ok) {
        onStatus({ status: 'ready', message: '接続を準備しています' })
        return true
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Signaling health check failed', error)
      }
    }

    attempt += 1
    const delay = Math.min(2000 + attempt * 1000, 8000)
    await new Promise((resolve) => window.setTimeout(resolve, delay))
  }

  onStatus({ status: 'failed', message: '接続できませんでした' })
  return false
}
