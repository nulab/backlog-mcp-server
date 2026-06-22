# Cloudflare Workers 対応（OAuth + ステートフルセッション）

## Context（背景・目的）

`backlog-mcp-server` は現状 Node.js 上で動作する MCP サーバで、トランスポートは
stdio と Streamable HTTP（`@hono/node-server`）を持つ。HTTP + OAuth 経路は
`runHttpMcpServer`（`src/httpMcpServer.ts`）が担い、OAuth 状態と MCP セッションを
**インメモリの `Map` / オブジェクト**で保持している。

Cloudflare Workers はリクエストごとに分散実行され、メモリ状態がリクエスト間で
保持されない。OAuth 認証あり・ステートフルセッションを成立させるには、状態を
**Durable Object（DO）**に集約し、OAuth 状態は **DO ストレージで永続化**する必要がある。

ユーザー選択:
- **永続化レベル**: DO ストレージ永続化（クライアント登録・トークン・リフレッシュトークンは
  DO のハイバネーション/再起動を跨いで維持）。MCP セッションの SSE ストリームは性質上メモリ保持。
- **エントリ方針**: Workers 専用に寄せる（Node 向け HTTP サーバ `@hono/node-server` 経路は撤去。
  stdio CLI は npm 配布物の中核なので維持）。

ゴール: `wrangler deploy` でリモート MCP（OAuth 付き・ステートフル）として起動でき、
既存の MCP ツール群とカスタム OAuth フロー（RFC 7591/8414/9728 + PKCE）がそのまま動く状態。

## アーキテクチャ

**単一グローバル DO** にすべての状態を集約する（最小改修で強整合性が得られる）。

```
Client ──HTTP──▶ Worker (src/worker.ts)
                   └─ env.MCP_DO.idFromName("global") へ全リクエスト転送
                        ▼
                 BacklogMcpDurableObject (src/workers/durableObject.ts)
                   ├─ Hono app（既存ルートを流用: health / OAuth / MCP）
                   ├─ transports: Map<sessionId, transport>  … メモリ（揮発・SSE 用）
                   └─ DurableTokenStore … DO ストレージ永続化（OAuth 状態）
```

- 全リクエストを 1 つの DO（`idFromName("global")`）へ転送。OAuth フロー（register→authorize
  →callback→token）と MCP セッションが同一アクター内で完結し、状態共有が自然に成立する。
- スループットは単一 DO に集約される点が制約（中規模利用では許容）。プランの「留意点」に明記。

## 変更内容

### 1. 共有 Hono アプリの抽出（`src/httpMcpServer.ts` をリファクタ）
- `runHttpMcpServer`（`@hono/node-server` の `serve()` 起動部）と `node:http` 依存を**撤去**。
- ルート構築ロジック（health / OAuth ルート登録 / `app.all(mcpPath)` の MCP ハンドラ、
  `startNewSession`・Host ヘッダ検証など `src/httpMcpServer.ts:45-232`）を
  **`createMcpHonoApp(options)`** として抽出し、Web 標準の `Hono` インスタンスを返す。
  `transports` マップ・`createServer`・`tokenStore`・`oauthConfig` は引数で受け取る
  （DO がオーナーシップを持つ）。
- これにより Node 固有 API を一切含まない再利用可能なアプリビルダーになる。

### 2. Workers エントリ（新規 `src/worker.ts`）
- `export { BacklogMcpDurableObject }` と `export default { fetch }` を定義。
- `fetch` は全リクエストを `env.MCP_DO.get(env.MCP_DO.idFromName("global"))` の stub へ転送
  （ストリーミング Response をそのまま返す）。

### 3. Durable Object（新規 `src/workers/durableObject.ts`）
- `constructor(ctx, env)`:
  - `getBacklogOAuthConfig(env)`（**既に env 引数対応済み** `src/auth/backlogOAuthConfig.ts:13`）で OAuth 設定を構築。
  - `createOAuthBacklogClientRegistry(domain)`（`src/utils/backlogClientRegistry.ts:204`）で
    OAuth スコープ付きクライアントを生成。
  - `createDurableTokenStore(ctx.storage)` を `ctx.blockConcurrencyWhile(...)` で
    ストレージから再水和して生成。
  - Workers 用設定リーダー（後述）で `version` / `maxTokens` / `prefix` / `enabledToolsets`
    / `dynamicToolsets` / `enableJsonResponse` を `env` から解決し、`createServer` ファクトリと
    `createMcpHonoApp(...)` を組み立てる。
- `fetch(request)`: `this.app.fetch(request)` に委譲。
- `alarm()`: `tokenStore.cleanup()` を実行し次回 alarm を再スケジュール
  （`index.ts:138` の `setInterval` クリーンアップ相当を DO アラームで代替）。

### 4. トークンストアの永続化（`src/auth/tokenStore.ts`）
- 現在 `TokenStore = ReturnType<typeof createTokenStore>`。これを **明示的な `TokenStore` インターフェース**
  として切り出し、`oauthRoutes.ts` / `bearerAuthMiddleware.ts` の利用箇所は**無変更**（同期 I/F を維持）。
- 新規 `createDurableTokenStore(storage)`（`src/auth/durableTokenStore.ts`）を追加し、同一 I/F を実装:
  - 起動時に `storage.list()` で全エントリをインメモリ `Map` に再水和（以後の読み取りは同期）。
  - 各ミューテーション（`storePendingAuth` / `storeAuthCode` / `registerClient` /
    `storeMcpToken` / `storeMcpRefreshToken` / `consume*`）で `Map` 更新と
    `storage.put` / `storage.delete` を write-through（DO の output gate が応答前の永続化を保証）。
  - `cacheVerification`（5 分 TTL の検証キャッシュ）は揮発で十分なためメモリのみ（任意で非永続）。
  - キーは名前空間付き（例: `client:<id>`, `mcptoken:<token>`, `mcprefresh:<token>`,
    `authcode:<code>`, `pending:<state>`）。
  - `cleanup()` は期限切れをメモリ＋ストレージ双方から削除。
- 既存 `createTokenStore()`（純インメモリ）は stdio/テスト用途として残置可。

### 5. ロガーの Workers 対応（`src/utils/logger.ts`）
- `pino` / `pino-pretty` は Workers でバンドル不可（node fd / worker threads 依存）。
- pino を**軽量な console ベースの構造化ロガー**へ置換。既存呼び出し I/F
  `logger.info(mergeObj?, msg?)` / `warn` / `error` / `debug`（pino スタイル）を維持し、
  `console.error` に JSON 出力（stdio では stdout がプロトコル占有のため stderr 固定）。
- これで Node（stdio）と Workers の両方で動作し、バンドル問題を解消。`pino` 系依存を削除。

### 6. Workers 設定リーダー（新規・薄いユーティリティ）
- `index.ts` の yargs/env デフォルト（`maxTokens=50000`, `prefix=''`, `enableToolsets='all'`,
  `dynamicToolsets=false`, `enableJsonResponse` 等）を、`env`（Workers vars）から読む
  小関数として切り出し、DO から利用。yargs は Node CLI 専用のため Workers では使わない。

### 7. wrangler / ビルド設定
- 新規 `wrangler.jsonc`:
  - `main: "src/worker.ts"`, `compatibility_flags: ["nodejs_compat"]`
    （`node:crypto` `randomUUID/randomBytes/createHash`・`node:async_hooks` AsyncLocalStorage に必要）。
  - `durable_objects.bindings`: `{ name: "MCP_DO", class_name: "BacklogMcpDurableObject" }`。
  - `migrations`: `{ tag: "v1", new_sqlite_classes: ["BacklogMcpDurableObject"] }`。
  - `vars`: `MCP_SERVER_BASE_URL`, `BACKLOG_DOMAIN`, `BACKLOG_OAUTH_CLIENT_ID` ほか非機密。
  - 機密（`BACKLOG_OAUTH_CLIENT_SECRET`）は `wrangler secret put` で投入（README に記載）。
- `package.json`: devDeps に `wrangler`, `@cloudflare/workers-types` を追加。
  scripts に `dev:worker`(`wrangler dev`), `deploy`(`wrangler deploy`) を追加。
  `pino`, `pino-pretty`, `@hono/node-server` を依存から削除。
- `tsconfig`: Workers 型解決用に `@cloudflare/workers-types` を types に追加
  （必要なら worker 用 tsconfig を分離）。

## 影響範囲・留意点
- `oauthRoutes.ts` / `bearerAuthMiddleware.ts` / `backlogOAuthClient.ts` / `createBacklogMcpServer.ts`
  は **fetch / 同期 TokenStore I/F のみ依存**のため、ロジック変更なし（型のインポート元のみ調整の可能性）。
- `index.ts`（stdio）は HTTP 分岐を撤去して stdio 経路に縮約。`--transport http` は廃止。
- **揮発性**: DO 再起動で `transports`（MCP セッション）は失われ、クライアントは再 initialize が必要（SSE では許容）。OAuth 状態は永続化されるため再認証は不要。
- **backlog-js の Workers 互換性**は実装時に `wrangler dev` で要検証（fetch ベース・ブラウザ対応のため互換性は高い見込み。問題時は `nodejs_compat` で吸収）。
- **単一 DO のスループット**集約が制約（将来はセッション単位 DO 分割で水平化可能）。

## 検証
1. `pnpm install`（wrangler/types 追加後）→ `pnpm typecheck` / `pnpm lint`。
2. **ユニットテスト**（Arrange-Act-Assert、日本語ケース名）:
   - `src/auth/durableTokenStore.test.ts`: フェイク storage（メモリ Map 実装）で
     put/get/consume/期限切れ/再水和/cleanup を検証。既存 `tokenStore.test.ts` のケースを踏襲。
   - `src/utils/logger.test.ts`: `console.error` をスパイし出力形式（レベル・JSON）を検証。
   - `src/httpMcpServer`（→ `createMcpHonoApp`）の既存テストを新 I/F に追従。
3. **e2e（`wrangler dev` 手動・外部 Backlog 実接続）**:
   - `/.well-known/oauth-authorization-server` / `/.well-known/oauth-protected-resource/mcp` が
     正しいメタデータを返す。
   - MCP クライアント（例: `npx @modelcontextprotocol/inspector` または Claude）から接続し、
     `register → authorize（Backlog ログイン）→ callback → token` を完走、Bearer で `/mcp` に
     `initialize` し `mcp-session-id` を取得、`tools/list` と実ツール（例: `get_myself`）を実行して
     Backlog の実データが返ることを確認（取得 0 件不可）。
   - DO 再起動後も同じ Bearer トークンで再認証なしにアクセスできる（永続化の確認）。
4. README に Workers デプロイ手順（vars/secret 設定・`wrangler deploy`・MCP クライアント設定例）を追記。
