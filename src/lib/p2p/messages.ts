import { PROTOCOL_VERSION } from '@/types/game'
import type { MessageMeta } from '@/types/network'
import { createRequestId } from '@/lib/game/random'

export function createMessageMeta(knownRevision: number): MessageMeta {
  return {
    protocolVersion: PROTOCOL_VERSION,
    requestId: createRequestId(),
    sentAt: Date.now(),
    knownRevision,
  }
}

export function userSafeErrorMessage(reasonCode: string): string {
  const messages: Record<string, string> = {
    INVALID_ROOM_TOKEN: '招待情報が正しくありません。',
    ROOM_FULL: 'このルームは満員です。',
    GAME_ALREADY_STARTED: 'ゲーム開始後の新規参加はできません。',
    DUPLICATE_CONNECTION: '同じ端末からすでに参加しています。',
    EMPTY_NAME: '名前を入力してください。',
    DUPLICATE_NAME: '同じ名前のプレイヤーがいます。',
    PROTOCOL_MISMATCH: 'アプリのバージョンが合いません。ページを更新してください。',
    NOT_JOINED: '参加情報を確認できませんでした。',
    INVALID_PHASE: '今はその操作を行えません。',
    INVALID_CARD: '選択したカードを確認できませんでした。',
    INVALID_CARD_COUNT: 'カードの枚数を確認してください。',
    INVALID_CARD_INPUT: 'カード内容を確認してください。行動名は必須です。',
    ALREADY_SUBMITTED: 'すでに提出済みです。',
    ALREADY_SELECTED: 'すでに選択済みです。',
    ALREADY_VOTED: 'すでに投票済みです。',
    STALE_REVISION: '画面の状態が古くなっています。最新状態へ更新します。',
    PAUSED: '接続が戻るまでゲームは一時停止中です。',
    INVALID_RECONNECT_TOKEN: '再接続情報を確認できませんでした。',
    INVALID_MESSAGE: '通信データを確認できませんでした。',
  }

  return messages[reasonCode] ?? '操作を完了できませんでした。'
}
