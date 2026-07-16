# PlayDraft（プレイドラフト）

「予想以上に楽しいを、考えた人が勝ち。」をテーマにした、3人専用のリアル体験型カードゲームです。

各プレイヤーがスマートフォンから5枚ずつ行動カードを作成し、匿名ドラフトで1枚ずつ残します。最終候補3枚からランダムに1枚を体験し、これを2ラウンド実施します。最後に2つの体験へ投票し、最多票のカード作者が優勝です。賞金表示は1,000円です。

## 実装済み機能

- ルーム作成、招待URL、QRコード表示、URLコピー
- PeerJS + WebRTC DataChannel によるホスト中心スター型P2P
- 3人固定ロビー、接続状態同期、ゲーム開始制御
- 各端末からのカード5枚作成、Zod検証、ホスト検証
- 匿名カード配布、Fisher-Yatesシャッフル、4回ドラフト
- 捨て札選択、全員待機、手札の時計回り受け渡し
- 最終候補3枚からランダム抽選、体験開始/完了
- 2ラウンド進行、最終投票、全員投票後の作者公開
- 優勝カード、作者、得票数、賞金1,000円表示
- ゲスト再接続、ホストlocalStorage復旧、切断時pause
- GitHub Pages static export設定、Render PeerServer設定
- Vitestによるゲームロジック/ホスト処理20項目テスト

## P2P構成

フルメッシュではなく、ホスト端末を中心にしたスター型です。

```text
ゲストA ───── ホスト
                │
ゲストB ────────┘
```

PeerServerはシグナリング専用です。ゲーム状態、カード、投票、プレイヤー名はPeerServerへ保存しません。

ホスト端末だけが正式な `AuthoritativeGameState` を持ち、ゲスト操作はホストが検証してから反映します。ゲストへ送るのは `ClientGameView` だけで、作者情報や他人の手札、投票先は公開タイミングまで含めません。

## 主なファイル

- `src/types/game.ts` / `src/types/network.ts`: ゲーム状態と通信型
- `src/lib/game/gameLogic.ts`: シャッフル、配布、ドラフト、投票などの純粋関数
- `src/lib/game/hostReducer.ts`: ホストオーソリティ処理
- `src/lib/game/viewBuilder.ts`: 端末別の公開/非公開ビュー生成
- `src/lib/p2p/*`: PeerJS設定、招待URL、Zod通信スキーマ、再接続、Host/Guest manager
- `src/components/screens/*`: 各ゲーム画面
- `signaling-server/`: Render用 PeerServer
- `.github/workflows/deploy-pages.yml`: GitHub Pages 自動デプロイ

## ローカル起動

フロントエンド:

```bash
npm install
npm run dev
```

シグナリングサーバー:

```bash
cd signaling-server
npm install
npm run dev
```

ローカル用 `.env.local` 例:

```env
NEXT_PUBLIC_PEER_HOST=localhost
NEXT_PUBLIC_PEER_PORT=9000
NEXT_PUBLIC_PEER_PATH=/peerjs
NEXT_PUBLIC_PEER_SECURE=false
NEXT_PUBLIC_SIGNALING_HEALTH_URL=http://localhost:9000/health
```

## 3台の端末で確認

1. PCまたはスマートフォン1台目でホストとして「ルームを作る」を押します。
2. 表示されたQRコードをゲスト2台で読み取ります。
3. 3人がロビーに揃うと、ホストだけがゲーム開始できます。
4. 各端末で5枚作成、ドラフト、体験、2ラウンド目、投票、作者公開まで進めます。

ローカルネットワークでスマートフォンから確認する場合、Next dev serverとPeerServerへスマートフォンがアクセスできるホスト名/IPを使ってください。HTTPSではないローカル環境ではブラウザやネットワーク条件によりWebRTCが制限される場合があります。

## GitHub Pages

`next.config.ts` は `output: "export"`、`basePath`、`assetPrefix`、`trailingSlash` をGitHub Actions環境に合わせて設定しています。

1. GitHub Pagesを有効化します。
2. Repository Variables に以下を設定します。

```env
NEXT_PUBLIC_PEER_HOST=your-peer-server.onrender.com
NEXT_PUBLIC_PEER_PORT=443
NEXT_PUBLIC_PEER_PATH=/peerjs
NEXT_PUBLIC_PEER_SECURE=true
NEXT_PUBLIC_SIGNALING_HEALTH_URL=https://your-peer-server.onrender.com/health
```

3. `main` へpushすると `.github/workflows/deploy-pages.yml` が `out` をPagesへ公開します。

## Render

`signaling-server/render.yaml` を使ってBlueprintを作成します。

- Node.js Web Service
- Free instance
- Root directory: `signaling-server`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/health`

Render無料枠はスリープするため、フロントエンドはルーム作成/参加前に `/health` を最大90秒再試行します。

## テストとビルド

```bash
npm run lint
npm run typecheck
npm test
npm run build
cd signaling-server
npm run build
```

## TURN追加箇所

TURNサーバーを使う場合は `src/lib/p2p/peerConfig.ts` の `iceServers` へ追加します。TURNのユーザー名・認証情報はコードへ直接書かず、環境変数から読み込む構成にしてください。

TURNなしでは、企業/学校/モバイル回線など一部ネットワークでP2P接続できない可能性があります。

## MVPの制限

- ホスト端末が閉じている間はゲームを進行できません。ホスト移行は未実装です。
- ホスト端末は正式状態を保持するため、内部データにはカード作者情報があります。通常画面には公開しませんが、ホストユーザーが開発者ツールやlocalStorageを直接調べるケースまで暗号学的に隠すことはMVP対象外です。
- 4〜6人対応時は `PLAYER_COUNT`、提出枚数/配布、ドラフト終了条件、投票の同票処理、UIの人数表示を拡張してください。中心になる変更箇所は `src/types/game.ts`、`src/lib/game/gameLogic.ts`、`src/lib/game/hostReducer.ts`、`src/lib/game/viewBuilder.ts` です。
