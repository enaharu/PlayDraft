'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { Copy } from 'lucide-react'
import { PrimaryButton } from './PrimaryButton'

export function QRInvite({
  inviteUrl,
  onCopy,
}: {
  inviteUrl: string
  onCopy: () => void
}) {
  return (
    <div className="rounded-[1.6rem] border-2 border-black/10 bg-white p-4 text-center">
      <div className="mx-auto grid w-fit place-items-center rounded-3xl bg-white p-3 shadow-inner">
        <QRCodeCanvas value={inviteUrl} size={188} includeMargin />
      </div>
      <p className="mt-3 break-all rounded-2xl bg-[#f6f2ff] p-3 text-xs font-bold text-black/70">
        {inviteUrl}
      </p>
      <PrimaryButton className="mt-3" tone="blue" onClick={onCopy}>
        <Copy size={18} />
        URLをコピー
      </PrimaryButton>
    </div>
  )
}
