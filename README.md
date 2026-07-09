# Haruki Vite Starter

React + Vite + TypeScript でフロントエンド開発を始めるためのスターターテンプレートです。

このフォルダを複製して、新しいプロジェクトの土台として使います。

## 開発

依存パッケージをインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

## ビルド

本番用にビルドします。

```bash
npm run build
```

## その他の確認

コードの静的チェックを行います。

```bash
npm run lint
```

ビルド後の画面をローカルで確認します。

```bash
npm run preview
```

## 使用している主なライブラリ

- `react-router`: ページ遷移
- `zod`: 環境変数やデータのバリデーション
- `clsx`: className の結合
- `lucide-react`: アイコン

## フォルダ構成

```text
src
├── assets
├── components
│   ├── common
│   └── ui
├── constants
├── contexts
├── hooks
├── layouts
├── pages
├── routes
├── services
├── styles
├── types
├── utils
├── App.tsx
└── main.tsx
```

## 各フォルダの役割

- `assets`: 画像や静的アセット
- `components/common`: アプリ内で共通利用する部品
- `components/ui`: Button などの汎用 UI 部品
- `constants`: 固定値や環境変数の設定
- `contexts`: React Context
- `hooks`: カスタム hooks
- `layouts`: 共通レイアウト
- `pages`: 画面単位のコンポーネント
- `routes`: ルーティング設定
- `services`: API 通信などの外部連携処理
- `styles`: CSS
- `types`: TypeScript の型定義
- `utils`: 汎用関数

## 複製後に変更するもの

新しいプロジェクトとして使う場合は、必要に応じて以下を変更します。

- `package.json` の `name`
- この README のタイトル
- `src/constants/env.ts` の環境変数
- GitHub Pages を使う場合は公開先 URL
