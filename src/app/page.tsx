'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ActionCardInput,
  AuthoritativeGameState,
  CardId,
  ClientGameView,
} from '@/types/game'
import type { WakeupStatus } from '@/lib/p2p/peerConfig'
import { APP_NAME, APP_NAME_JA, CATCH_COPY } from '@/lib/constants'
import { createInitialHostState } from '@/lib/game/hostReducer'
import {
  createClientId,
  createHostPeerId,
  createRoomId,
  createToken,
} from '@/lib/game/random'
import { buildClientGameView } from '@/lib/game/viewBuilder'
import { createInviteUrl, readInviteFromLocation, type InvitePayload } from '@/lib/p2p/invite'
import { waitForSignalingServer } from '@/lib/p2p/peerConfig'
import { HostPeerManager, type HostPeerStatus } from '@/lib/p2p/HostPeerManager'
import { GuestPeerManager, type GuestPeerStatus } from '@/lib/p2p/GuestPeerManager'
import { clearHostGame, loadHostGame, saveHostGame } from '@/lib/storage/hostStorage'
import {
  clearGuestSession,
  loadGuestSession,
  saveGuestSession,
  type PersistedGuestSession,
} from '@/lib/storage/guestStorage'
import { CardEntryScreen } from '@/components/screens/CardEntryScreen'
import { ConnectionLostScreen } from '@/components/screens/ConnectionLostScreen'
import { CreateRoomScreen } from '@/components/screens/CreateRoomScreen'
import { DraftScreen } from '@/components/screens/DraftScreen'
import { ExperienceScreen } from '@/components/screens/ExperienceScreen'
import { FinalistScreen } from '@/components/screens/FinalistScreen'
import { JoinRoomScreen } from '@/components/screens/JoinRoomScreen'
import { LobbyScreen } from '@/components/screens/LobbyScreen'
import { ResultScreen } from '@/components/screens/ResultScreen'
import { RevealScreen } from '@/components/screens/RevealScreen'
import {
  RoundSummaryScreen,
  ScoringScreen,
} from '@/components/screens/RoundReviewScreens'
import { SelectedActionScreen } from '@/components/screens/SelectedActionScreen'
import { SignalingWakeupScreen } from '@/components/screens/SignalingWakeupScreen'
import { TopScreen } from '@/components/screens/TopScreen'
import { VotingScreen } from '@/components/screens/VotingScreen'
import { Panel, ScreenShell } from '@/components/screens/ScreenShell'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type AppMode =
  | 'boot'
  | 'top'
  | 'create'
  | 'join'
  | 'wakeup'
  | 'host-game'
  | 'guest-game'
  | 'error'

type PendingAction =
  | { type: 'create-host' }
  | { type: 'restore-host' }
  | { type: 'join-guest' }
  | { type: 'reconnect-guest'; session: PersistedGuestSession; invite?: InvitePayload }

const initialWakeupStatus: WakeupStatus = {
  status: 'checking',
  message: '通信サーバーを確認しています',
}

export default function PlayDraftPage() {
  const [mode, setMode] = useState<AppMode>('boot')
  const [hostName, setHostName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [invite, setInvite] = useState<InvitePayload>()
  const [inviteUrl, setInviteUrl] = useState('')
  const [view, setView] = useState<ClientGameView>()
  const [error, setError] = useState('')
  const [connectionLabel, setConnectionLabel] = useState('接続準備中')
  const [wakeupStatus, setWakeupStatus] = useState<WakeupStatus>(initialWakeupStatus)
  const [pendingAction, setPendingAction] = useState<PendingAction>()
  const [canRestoreHost, setCanRestoreHost] = useState(false)
  const hostManagerRef = useRef<HostPeerManager | undefined>(undefined)
  const guestManagerRef = useRef<GuestPeerManager | undefined>(undefined)
  const bootedRef = useRef(false)

  const cleanupManagers = useCallback(() => {
    hostManagerRef.current?.destroy()
    guestManagerRef.current?.destroy()
    hostManagerRef.current = undefined
    guestManagerRef.current = undefined
  }, [])

  async function createHostRoom(): Promise<void> {
    cleanupManagers()
    const state = createInitialHostState({
      roomId: createRoomId(),
      roomToken: createToken(32),
      hostPeerId: createHostPeerId(),
      hostClientId: createClientId(),
      hostName: hostName.trim() || 'ホスト',
    })
    saveHostGame(state)
    await startHostManager(state)
  }

  async function restoreHostRoom(): Promise<void> {
    cleanupManagers()
    const persisted = loadHostGame()
    if (!persisted) {
      setMode('top')
      return
    }

    const restoredState = {
      ...persisted.state,
      phase:
        persisted.state.phase === 'lobby' || persisted.state.phase === 'paused'
          ? persisted.state.phase
          : 'paused',
      phaseBeforePause:
        persisted.state.phase === 'lobby' || persisted.state.phase === 'paused'
          ? persisted.state.phaseBeforePause
          : persisted.state.phase,
      players: persisted.state.players.map((player) =>
        player.isHost
          ? { ...player, connectionStatus: 'connected' as const }
          : { ...player, connectionStatus: 'disconnected' as const },
      ),
      revision: persisted.state.revision + 1,
      updatedAt: new Date().toISOString(),
    }

    saveHostGame(restoredState)
    await startHostManager(restoredState)
  }

  async function startHostManager(state: AuthoritativeGameState): Promise<void> {
    const manager = new HostPeerManager(state, {
      onStatus: (status: HostPeerStatus, message: string) => {
        setConnectionLabel(message)
        if (status === 'error') {
          setError(message)
        }
      },
      onStateChanged: (nextState) => {
        saveHostGame(nextState)
        setView(buildClientGameView(nextState, manager.engine.hostPlayerId))
      },
      onError: setError,
    })

    hostManagerRef.current = manager
    setInviteUrl(
      createInviteUrl(
        {
          version: 1,
          hostPeerId: state.hostPeerId,
          roomId: state.roomId,
          roomToken: state.roomToken,
        },
        window.location,
      ),
    )
    setView(manager.engine.getViewForPlayer(manager.engine.hostPlayerId))
    setMode('host-game')
    await manager.start()
  }

  async function joinGuestRoom(): Promise<void> {
    cleanupManagers()
    if (!invite) {
      setError('招待URLを開いてください。')
      setMode('join')
      return
    }

    const manager = createGuestManager()
    guestManagerRef.current = manager
    setMode('guest-game')
    try {
      await manager.join(invite, guestName.trim())
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'ホストへ接続できませんでした'
      setError(message)
      setMode('join')
    }
  }

  async function reconnectGuest(
    session: PersistedGuestSession,
    reconnectInvite?: InvitePayload,
  ): Promise<void> {
    cleanupManagers()
    const manager = createGuestManager()
    guestManagerRef.current = manager
    setMode('guest-game')
    try {
      await manager.reconnect(session)
    } catch (caughtError) {
      manager.destroy()
      clearGuestSession()

      if (reconnectInvite) {
        const fallbackManager = createGuestManager()
        guestManagerRef.current = fallbackManager
        setGuestName(session.displayName)
        setMode('guest-game')

        try {
          await fallbackManager.join(reconnectInvite, session.displayName)
          return
        } catch (fallbackError) {
          const message =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'ホストへ再接続できませんでした'
          setError(message)
          setMode('join')
          return
        }
      }
      const message =
        caughtError instanceof Error ? caughtError.message : 'ホストへ再接続できませんでした'
      setError(message)
      setMode('join')
    }
  }

  function createGuestManager(): GuestPeerManager {
    return new GuestPeerManager({
      onStatus: (status: GuestPeerStatus, message: string) => {
        setConnectionLabel(message)
        if (status === 'error') {
          setError(message)
        }
      },
      onView: setView,
      onJoined: saveGuestSession,
      onRejected: (message) => {
        setError(message)
        setMode('join')
      },
      onError: setError,
    })
  }

  async function runWakeup(
    action: PendingAction = pendingAction ?? { type: 'create-host' },
  ): Promise<void> {
    setPendingAction(action)
    setWakeupStatus(initialWakeupStatus)
    setMode('wakeup')
    const ok = await waitForSignalingServer(setWakeupStatus)
    if (!ok) {
      return
    }

    if (action.type === 'create-host') {
      await createHostRoom()
    } else if (action.type === 'restore-host') {
      await restoreHostRoom()
    } else if (action.type === 'join-guest') {
      await joinGuestRoom()
    } else {
      await reconnectGuest(action.session, action.invite)
    }
  }

  useEffect(() => {
    if (bootedRef.current) {
      return
    }
    bootedRef.current = true

    const parsedInvite = readInviteFromLocation(window.location)
    const hostGame = loadHostGame()
    const guestSession = loadGuestSession()

    setCanRestoreHost(Boolean(hostGame))

    if (parsedInvite) {
      setInvite(parsedInvite)
      if (guestSession?.roomId === parsedInvite.roomId) {
        const action: PendingAction = {
          type: 'reconnect-guest',
          session: guestSession,
          invite: parsedInvite,
        }
        setPendingAction(action)
        void runWakeup(action)
        return
      }
      setMode('join')
      return
    }

    if (hostGame) {
      const action: PendingAction = { type: 'restore-host' }
      setPendingAction(action)
      void runWakeup(action)
      return
    }

    if (guestSession) {
      const action: PendingAction = { type: 'reconnect-guest', session: guestSession }
      setPendingAction(action)
      void runWakeup(action)
      return
    }

    setMode('top')
    // The boot routine must run once; bootedRef guards reload restores and invite parsing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetToTop(): void {
    cleanupManagers()
    if (window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
    setError('')
    setInvite(undefined)
    setView(undefined)
    setMode('top')
  }

  function returnHomeAfterGame(): void {
    clearHostGame()
    clearGuestSession()
    setCanRestoreHost(false)
    resetToTop()
  }

  function submitCards(cards: ActionCardInput[]): void {
    if (!view) {
      return
    }
    setError('')
    const hostEngine = hostManagerRef.current?.engine
    if (hostEngine) {
      hostEngine.submitCardsForPlayer(
        hostEngine.hostPlayerId,
        view.publicState.currentRoundNumber,
        cards,
      )
      return
    }
    guestManagerRef.current?.submitCards(view.publicState.currentRoundNumber, cards)
  }

  function selectDiscard(cardId: CardId): void {
    if (!view) {
      return
    }
    const hostEngine = hostManagerRef.current?.engine
    if (hostEngine) {
      hostEngine.selectDiscardForPlayer(
        hostEngine.hostPlayerId,
        view.publicState.currentRoundNumber,
        view.publicState.draftCycle,
        cardId,
      )
      return
    }
    guestManagerRef.current?.selectDiscard(
      view.publicState.currentRoundNumber,
      view.publicState.draftCycle,
      cardId,
    )
  }

  function castVote(cardId: CardId): void {
    const hostEngine = hostManagerRef.current?.engine
    if (hostEngine) {
      hostEngine.castVoteForPlayer(hostEngine.hostPlayerId, cardId)
      return
    }
    guestManagerRef.current?.castVote(cardId)
  }

  function submitScore(satisfaction: number, surprise: number): void {
    if (!view) {
      return
    }

    const hostEngine = hostManagerRef.current?.engine
    if (hostEngine) {
      hostEngine.submitScoreForPlayer(
        hostEngine.hostPlayerId,
        view.publicState.currentRoundNumber,
        satisfaction,
        surprise,
      )
      return
    }

    guestManagerRef.current?.submitScore(
      view.publicState.currentRoundNumber,
      satisfaction,
      surprise,
    )
  }

  function continueRound(): void {
    hostManagerRef.current?.engine.continueToNextRound()
  }

  function finishGame(): void {
    hostManagerRef.current?.engine.finishGame()
  }

  if (mode === 'boot') {
    return (
      <ScreenShell>
        <Panel className="mt-16 text-center">
          <h1 className="text-3xl font-black">{APP_NAME}</h1>
          <p className="mt-1 text-xs font-black text-black/50">{APP_NAME_JA}</p>
          <p className="mt-3 text-sm font-bold">{CATCH_COPY}</p>
        </Panel>
      </ScreenShell>
    )
  }

  if (mode === 'wakeup') {
    return (
      <SignalingWakeupScreen
        status={wakeupStatus}
        onRetry={() => pendingAction && void runWakeup(pendingAction)}
        onBack={resetToTop}
      />
    )
  }

  if (mode === 'create') {
    return (
      <CreateRoomScreen
        name={hostName}
        onNameChange={setHostName}
        onCreate={() => void runWakeup({ type: 'create-host' })}
        onBack={resetToTop}
      />
    )
  }

  if (mode === 'join') {
    return (
      <JoinRoomScreen
        name={guestName}
        error={error || (!invite ? '招待URLを開いて参加してください。' : undefined)}
        onNameChange={setGuestName}
        onJoin={() => void runWakeup({ type: 'join-guest' })}
        onBack={resetToTop}
      />
    )
  }

  if (mode === 'top') {
    return (
      <TopScreen
        canRestoreHost={canRestoreHost}
        onCreate={() => setMode('create')}
        onRestoreHost={() => void runWakeup({ type: 'restore-host' })}
      />
    )
  }

  if (mode === 'error') {
    return (
      <ScreenShell>
        <Panel className="mt-16 text-center">
          <h1 className="text-2xl font-black">接続できませんでした</h1>
          <p className="mt-3 text-sm font-bold text-black/60">{error}</p>
          <PrimaryButton className="mt-6" tone="white" onClick={resetToTop}>
            トップへ戻る
          </PrimaryButton>
        </Panel>
      </ScreenShell>
    )
  }

  if (!view) {
    return (
      <ScreenShell>
        <Panel className="mt-16 text-center">
          <div className="shuffle-animation mx-auto h-20 w-20 rounded-3xl bg-[#ffd33f]" />
          <h1 className="mt-6 text-2xl font-black">{connectionLabel}</h1>
          {error && <p className="mt-3 text-sm font-black text-[#a3144b]">{error}</p>}
        </Panel>
      </ScreenShell>
    )
  }

  if (view.publicState.phase === 'paused') {
    return (
      <ConnectionLostScreen
        view={view}
        inviteUrl={inviteUrl}
        onCopyInvite={() => {
          if (inviteUrl) {
            void navigator.clipboard.writeText(inviteUrl)
          }
        }}
        onResetHome={returnHomeAfterGame}
      />
    )
  }

  if (view.publicState.phase === 'lobby') {
    return (
      <LobbyScreen
        view={view}
        inviteUrl={inviteUrl}
        connectionLabel={connectionLabel}
        onCopyInvite={() => {
          if (inviteUrl) {
            void navigator.clipboard.writeText(inviteUrl)
          }
        }}
        onStartGame={() => hostManagerRef.current?.engine.startGame()}
        onRecreateRoom={() => void runWakeup({ type: 'create-host' })}
      />
    )
  }

  if (view.publicState.phase === 'card-entry') {
    return <CardEntryScreen view={view} error={error} onSubmit={submitCards} />
  }

  if (view.publicState.phase === 'draft') {
    return <DraftScreen view={view} onSelectDiscard={selectDiscard} />
  }

  if (view.publicState.phase === 'finalists') {
    return (
      <FinalistScreen
        view={view}
        onDraw={() => hostManagerRef.current?.engine.drawRandomAction()}
      />
    )
  }

  if (view.publicState.phase === 'selected-action') {
    return (
      <SelectedActionScreen
        view={view}
        onStartExperience={() => hostManagerRef.current?.engine.startExperience()}
      />
    )
  }

  if (view.publicState.phase === 'experience') {
    return (
      <ExperienceScreen
        view={view}
        onCompleteExperience={() => hostManagerRef.current?.engine.completeExperience()}
      />
    )
  }

  if (view.publicState.phase === 'scoring') {
    return <ScoringScreen view={view} onSubmitScore={submitScore} />
  }

  if (view.publicState.phase === 'round-summary') {
    return (
      <RoundSummaryScreen
        view={view}
        onContinue={continueRound}
        onFinish={finishGame}
      />
    )
  }

  if (view.publicState.phase === 'voting') {
    return <VotingScreen view={view} onVote={castVote} />
  }

  if (view.publicState.phase === 'reveal') {
    return (
      <RevealScreen
        view={view}
        onFinishReveal={() => hostManagerRef.current?.engine.finishReveal()}
      />
    )
  }

  return <ResultScreen view={view} onHome={returnHomeAfterGame} />
}
