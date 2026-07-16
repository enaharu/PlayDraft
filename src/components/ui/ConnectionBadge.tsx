import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionBadge({
  connected,
  label,
}: {
  connected: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-black">
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {label}
    </span>
  )
}
