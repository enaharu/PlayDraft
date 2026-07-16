export function ProgressIndicator({
  label,
  current,
  total,
}: {
  label: string
  current: number
  total: number
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-black">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[#4fd27d] transition-all"
          style={{ width: `${Math.min(100, (current / total) * 100)}%` }}
        />
      </div>
    </div>
  )
}
