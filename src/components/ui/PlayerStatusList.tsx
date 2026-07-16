import { Crown, UserRoundCheck, UserRoundX } from 'lucide-react'
import type { PublicPlayerView } from '@/types/game'
import { cn } from '@/utils/cn'

export function PlayerStatusList({
  players,
  selfPlayerId,
  mode,
}: {
  players: PublicPlayerView[]
  selfPlayerId: string
  mode?: 'submit' | 'discard' | 'vote'
}) {
  return (
    <div className="space-y-2">
      {players.map((player) => {
        const done =
          mode === 'submit'
            ? player.hasSubmittedCards
            : mode === 'discard'
              ? player.hasSelectedDiscard
              : mode === 'vote'
                ? player.hasVoted
                : player.connectionStatus === 'connected'

        return (
          <div
            key={player.id}
            className={cn(
              'flex items-center justify-between rounded-2xl border-2 border-black/10 bg-white px-3 py-2',
              player.id === selfPlayerId && 'border-[#1788e8] bg-[#eef8ff]',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              {player.isHost && <Crown className="text-[#ffd33f]" size={18} />}
              <span className="truncate text-sm font-black">
                {player.name}
                {player.id === selfPlayerId ? '（あなた）' : ''}
              </span>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black',
                done ? 'bg-[#dff9e8] text-[#176b36]' : 'bg-[#fff0be] text-[#7a5200]',
              )}
            >
              {done ? <UserRoundCheck size={14} /> : <UserRoundX size={14} />}
              {done ? '完了' : '待ち'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
