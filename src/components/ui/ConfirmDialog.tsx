'use client'

import { PrimaryButton } from './PrimaryButton'

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-[1.7rem] bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-black/65">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PrimaryButton tone="white" onClick={onCancel}>
            戻る
          </PrimaryButton>
          <PrimaryButton tone="pink" onClick={onConfirm}>
            確定
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
