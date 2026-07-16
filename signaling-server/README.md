# アイデアバトル PeerServer

Render の無料 Web Service で動かす PeerJS シグナリングサーバーです。

このサーバーは `/health` と `/peerjs` だけを提供します。ゲーム状態、カード、プレイヤー名、投票、ルーム一覧、Peer ID 一覧は保存・公開しません。

## ローカル起動

```bash
npm install
npm run dev
```

ヘルスチェック:

```bash
curl http://localhost:9000/health
```

## Render

1. Render で Blueprint を作成します。
2. このリポジトリを選び、`signaling-server/render.yaml` を使用します。
3. 発行された URL をフロントエンドの環境変数へ設定します。

```env
NEXT_PUBLIC_PEER_HOST=your-peer-server.onrender.com
NEXT_PUBLIC_PEER_PORT=443
NEXT_PUBLIC_PEER_PATH=/peerjs
NEXT_PUBLIC_PEER_SECURE=true
NEXT_PUBLIC_SIGNALING_HEALTH_URL=https://your-peer-server.onrender.com/health
```

Render 無料枠ではサーバーがスリープするため、フロントエンドはルーム作成・参加前に最大90秒ほど `/health` を再試行します。
