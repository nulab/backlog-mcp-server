# Backlog MCP Server（日本語版）

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://github.com/nulab/backlog-mcp-server/actions/workflows/ci.yml/badge.svg)
![Last Commit](https://img.shields.io/github/last-commit/nulab/backlog-mcp-server.svg)

[🇬🇧 English README](./README.md)

Backlog API とやり取りするための Model Context Protocol（MCP）サーバーです。このサーバーは、Claude Desktop / Cline / Cursor などのAIエージェントを通じて、Backlog 上でプロジェクト、課題、Wikiページなどを管理するためのツールを提供します。

## 主な機能

- プロジェクトツール（作成、読み取り、更新、削除）
- 課題とコメントの追跡（作成、更新、削除、一覧表示）
- 発生バージョン/マイルストーンの管理（作成、読み取り、更新、削除）
- Wikiページサポート
- Gitリポジトリとプルリクエストツール
- 通知ツール
- 最適化されたレスポンスのためのフィールド選択
- 大規模なレスポンスに対するトークン制限

## 利用開始

### 必要条件

- Docker
- APIアクセスが可能なBacklogアカウント
- BacklogアカウントのAPIキー

### オプション1: Docker経由でのインストール

このMCPサーバーを使用する最も簡単な方法は、MCP設定を利用することです：

1. MCP設定を開きます
2. MCP設定セクションに移動します
3. 次の設定を追加します：

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "--pull",
        "always",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

`your-domain.backlog.com` を実際のBacklogドメインに、`your-api-key` を実際のBacklog APIキーに置き換えてください。

✅ `--pull always` を使用できない場合は、次のコマンドで手動でイメージを更新できます：

```
docker pull ghcr.io/nulab/backlog-mcp-server:latest
```

### オプション2: npx経由でのインストール

リポジトリをクローンせずに `npx` を使用してサーバーを直接実行することもできます。これは、完全なインストールなしでサーバーを実行する便利な方法です。

1. MCP設定を開きます
2. MCP設定セクションに移動します
3. 次の設定を追加します：

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["backlog-mcp-server"],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

`your-domain.backlog.com` を実際のBacklogドメインに、`your-api-key` を実際のBacklog APIキーに置き換えてください。

### オプション3: 手動セットアップ (Node.js)

1. クローンしてインストール：

   ```bash
   git clone https://github.com/nulab/backlog-mcp-server.git
   cd backlog-mcp-server
   pnpm install
   pnpm run build
   ```

2. テンプレートから `.env` を作成し、必須の環境変数を設定します：

```bash
cp .env.example .env
```

`.env` に以下を設定してください：

- `BACKLOG_DOMAIN=your-domain.backlog.com`
- `BACKLOG_API_KEY=your-api-key`

3. ローカルで起動します：

```bash
pnpm run dev
```

4. MCPとして使用するJSONを設定します：

```json
{
  "mcpServers": {
    "backlog": {
      "command": "node",
      "args": ["your-repository-location/build/index.js"],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

### OAuth 2.0 認証（リモートMCP）

MCPサーバーをネットワーク経由で公開する場合、OAuth 2.0認証を有効にすることで、共有APIキーではなく各ユーザーが自分のBacklogアカウントで認証できます。

サーバーは [MCP Third-Party Authorization Flow](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization) を実装しており、MCPクライアント向けのOAuth認可サーバーとBacklog向けのOAuthクライアントの両方として動作します。

#### 前提条件

1. Backlogスペースにてアプリケーションを登録します：
   - Backlogスペース → 個人設定 → アプリケーションの登録
   - **リダイレクトURI** を `<MCP_SERVER_BASE_URL>/callback`（例：`https://mcp.example.com/callback`）に設定
   - **Client ID** と **Client Secret** をメモ

2. 以下の環境変数を設定します（`BACKLOG_DOMAIN` に加えて）：

| 変数                          | 説明                                                  |
| ----------------------------- | ----------------------------------------------------- |
| `BACKLOG_OAUTH_CLIENT_ID`     | Backlogアプリケーションの OAuth Client ID             |
| `BACKLOG_OAUTH_CLIENT_SECRET` | Backlogアプリケーションの OAuth Client Secret         |
| `MCP_SERVER_BASE_URL`         | MCPサーバーの公開URL（例：`https://mcp.example.com`） |

> **注意:** OAuth有効時は `BACKLOG_API_KEY` は**不要**です。各ユーザーが自分のBacklogアカウントで認証します。

#### 使用例

```bash
BACKLOG_DOMAIN=your-space.backlog.com \
BACKLOG_OAUTH_CLIENT_ID=your-client-id \
BACKLOG_OAUTH_CLIENT_SECRET=your-client-secret \
MCP_SERVER_BASE_URL=https://mcp.example.com \
node build/index.js --transport http --http-host 0.0.0.0 --http-port 3333 \
  --http-allowed-hosts mcp.example.com
```

`0.0.0.0` にバインドする場合、`--http-allowed-hosts` は実質必須です。指定しないとDNSリバインディング保護が一切効かず、起動時に警告がログ出力されます。

OAuth有効時、サーバーは以下のOAuthエンドポイントを自動的に公開します：

| エンドポイント                                  | 説明                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /.well-known/oauth-authorization-server`   | OAuth認可サーバーメタデータ（[RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)） |
| `GET /.well-known/oauth-protected-resource/mcp` | OAuthリソースメタデータ（[RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)）     |
| `POST /register`                                | 動的クライアント登録（[RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)）        |
| `GET /authorize`                                | 認可エンドポイント（Backlog OAuthへリダイレクト）                                        |
| `GET /callback`                                 | Backlog OAuthコールバック                                                                |
| `POST /token`                                   | トークンエンドポイント（認可コード＆リフレッシュトークン）                               |

MCP認可仕様に対応するMCPクライアントは、これらのエンドポイントを自動的に使用します。

`POST /register` は登録できる redirect URI を制限します。ループバック URI
（`http://localhost`、`http://127.0.0.1`、`http://[::1]`）はユーザーのマシン上で動く
アプリが認可コードを受け取るための手段で、`"application_type": "native"` を宣言した
クライアント、または宣言がない場合は redirect URI が**すべて**ループバックである
クライアントから受け付けます。`"application_type": "web"` を宣言したクライアントや、
宣言なしでリモートの `https:` URI とループバック URI を混在させた登録は
`invalid_client_metadata` で拒否されます。

> **制約事項:**
>
> - OAuthモードは現在、単一のBacklog組織のみをサポートしています。複数組織設定との併用はできません。
> - クライアント登録やトークンはメモリ内に保持されるため、サーバー再起動時に失われます。

## ツール設定

`--enable-toolsets` コマンドラインフラグまたは `ENABLE_TOOLSETS` 環境変数を使用して、特定の **ツールセット** を選択的に有効または無効にすることができます。これにより、AIエージェントが利用できるツールをより細かく制御し、コンテキストサイズを削減するのに役立ちます。

### 利用可能なツールセット

次のツールセットが利用可能です（`"all"` が使用されるとデフォルトで有効になります）：

| ツールセット    | 説明                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `space`         | Backlogスペース設定と一般情報を管理するためのツール                          |
| `project`       | プロジェクト、カテゴリ、カスタムフィールド、課題タイプを管理するためのツール |
| `issue`         | 課題とそのコメント、発生バージョン/マイルストーンを管理するためのツール      |
| `wiki`          | Wikiページを管理するためのツール                                             |
| `git`           | Gitリポジトリとプルリクエストを管理するためのツール                          |
| `notifications` | ユーザー通知を管理するためのツール                                           |
| `document`      | ドキュメントおよびドキュメントツリーを参照するためのツール                   |

### ツールセットの指定

次の方法でツールセットのアクティベーションを制御できます：

CLI経由での使用：

```bash
--enable-toolsets space,project,issue
```

または環境変数経由：

```
ENABLE_TOOLSETS="space,project,issue"
```

`all` が指定された場合、利用可能なすべてのツールセットが有効になります。これはデフォルトの動作でもあります。

ツールセットリストがAIエージェントにとって大きすぎる場合や、特定のツールがパフォーマンスの問題を引き起こしている場合に、選択的なツールセットの使用が役立つことがあります。そのような場合、未使用のツールセットを無効にすると安定性が向上する可能性があります。

> 🧩 ヒント: `project` ツールセットは、他の多くのツールがエントリポイントとしてプロジェクトデータに依存しているため、強く推奨されます。

## 利用可能なツール

以下のような Backlog 機能に対応するツールを提供しています：

[Available Tools セクションへ](https://github.com/nulab/backlog-mcp-server?tab=readme-ov-file#available-tools)

## 使用例

MCPサーバーがAIエージェントで設定されると、会話で直接ツールを使用できます。以下にいくつかの例を示します：

- プロジェクトの一覧表示

```
私のBacklogプロジェクトをすべてリストアップしてください。
```

- 新しい課題の作成

```
PROJECT-KEYプロジェクトに「ログインページのエラーを修正」というタイトルの高優先度のバグ課題を作成してください。
```

- プロジェクト詳細の取得

```
PROJECT-KEYプロジェクトの詳細を表示してください。
```

- Gitリポジトリの操作

```
PROJECT-KEYプロジェクト内のすべてのGitリポジトリをリストアップしてください。
```

- プルリクエストの管理

```
PROJECT-KEYプロジェクトの「repo-name」リポジトリ内のすべてのオープンなプルリクエストを表示してください。
```

```
PROJECT-KEYプロジェクトの「repo-name」リポジトリで、ブランチ「feature/new-feature」から「main」への新しいプルリクエストを作成してください。
```

- ウォッチアイテム

```
私がウォッチしているすべてのアイテムを表示してください。
```

### ツール説明のオーバーライド

**ホームディレクトリ** に `.backlog-mcp-serverrc.json` ファイルを作成することで、ツールの説明をオーバーライドできます。

これらの文字列のほとんどは、モデルがどのツールを呼ぶか、引数に何を入れるかを判断するために読むツール説明・パラメータ説明です。したがってオーバーライドは、似た2つのツールを区別させたり、チームの運用ルールを添えたりしてツール選択を誘導するための手段であり、応答の言語を変えるためのものではありません。モデルは説明が何語で書かれていても、質問された言語で応答します。

一部のキーは、これとは別にバリデーションエラーのメッセージです（例：`PROJECT_ID_OR_KEY_REQUIRED`）。呼び出しが弾かれたときにツールの実行結果として返るため、モデルの応答を経由してユーザーの目に触れることがあります。

ファイルには、ツール名をキーとし、新しい説明を値とするJSONオブジェクトを含める必要があります。
例：

```json
{
  "TOOL_ADD_ISSUE_COMMENT_DESCRIPTION": "代替の説明文",
  "TOOL_CREATE_PROJECT_DESCRIPTION": "Backlogに新しいプロジェクトを作成します"
}
```

サーバー起動時、各ツールの最終的な説明は次の優先順位に基づいて決定されます：

1. 環境変数（例：`BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION`）
2. `.backlog-mcp-serverrc.json` 内のエントリ - サポートされる設定ファイル形式：.json、.yaml、.yml
3. 組み込みのデフォルト値

空文字列または文字列以外の値は、どの段階でも無視され、組み込みのデフォルト値が使われます。

サンプル設定：

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "-v",
        "/yourcurrentdir/.backlog-mcp-serverrc.json:/root/.backlog-mcp-serverrc.json:ro",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 現在の説明のエクスポート

`--export-descriptions` フラグを指定してバイナリを実行することで、現在の説明（オーバーライドを含む）をエクスポートできます。このフラグは以前 `--export-translations` という名前でした。旧名も当面は動作しますが、非推奨の警告を出力し、将来のリリースで削除されます。

ツール一覧の構築時に解決されるすべてのキーと現在の値が、行ったカスタマイズを含めて標準出力に出力されます。ツール説明・パラメータ説明はすべて含まれるため、キー名を調べる用途にはこれを使ってください。

バリデーションエラーのメッセージは含まれません。これらのキーは、実際に呼び出しが弾かれたときにはじめて解決されるためです。オーバーライド自体は同じ規則で可能ですが、キー名はソースを読んで調べる必要があります。

例：

```bash
docker run -i --rm ghcr.io/nulab/backlog-mcp-server node build/index.js --export-descriptions
```

または

```bash
npx github:nulab/backlog-mcp-server --export-descriptions
```

### 環境変数の使用

または、環境変数を介してツールの説明をオーバーライドすることもできます。

環境変数名は、ツールキーに基づいており、`BACKLOG_MCP_` がプレフィックスとして付き、大文字で記述されます。

例：
`TOOL_ADD_ISSUE_COMMENT_DESCRIPTION` をオーバーライドするには：

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "-e",
        "BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION": "代替の説明文"
      }
    }
  }
}
```

サーバーは起動時に設定ファイルを同期的に読み込みます。

環境変数は常に設定ファイルよりも優先されます。

## 高度な機能

### ツール名のプレフィックス

次の方法でツール名にプレフィックスを追加します：

```
--prefix backlog_
```

または環境変数経由：

```
PREFIX="backlog_"
```

これは、同じ環境で複数のMCPサーバーまたはツールを使用していて、名前の衝突を避けたい場合に特に便利です。たとえば、`get_project` は `backlog_get_project` になり、他のサービスによって提供される同様の名前のツールと区別できます。

### レスポンスの最適化とトークン制限

#### フィールド選択

```
--optimize-response
```

または環境変数：

```
OPTIMIZE_RESPONSE=1
```

**一覧を返すツール**に `fields` パラメータ（省略可）が追加されます。値はそのツールの結果のトップレベルのフィールド名のリストで、enum として公開されるため、そのツールに存在しない名前は無視されずに拒否されます。単体のレコードを返すツールには追加されません（パラメータは毎セッション費用がかかる一方、1 件のレコードから削れる量はごくわずかなためです）。

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: ["name", "key", "description"])
```

`fields` を省略すると結果全体が返ります。選択は 1 階層のみで、オブジェクトや配列のフィールドを指定した場合はそのまま丸ごと返ります。

利点：

- 必要なフィールドのみを要求することでレスポンスサイズを削減
- 特定のデータポイントに焦点を当てる
- 大規模なレスポンスのパフォーマンスを向上

#### トークン制限

大規模なレスポンスは、トークン制限を超えないように自動的に制限されます：

- デフォルト制限：50,000トークン
- `MAX_TOKENS` 環境変数で設定可能
- 制限を超えるレスポンスはメッセージと共に切り捨てられます

これを変更するには、次を使用します：

```
MAX_TOKENS=10000
```

レスポンスが制限を超えた場合、警告と共に切り捨てられます。

> 注：これはベストエフォートの緩和策であり、保証された強制ではありません。

### ログ出力

ログは **stderr** に出力されます（stdio トランスポートでは stdout が JSON-RPC のストリームに使われるため）。

| 変数        | 説明                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL` | `fatal` / `error` / `warn` / `info` / `debug` / `trace` / `silent`。既定は `NODE_ENV` が `production`（未設定時もこれに含まれる）のとき `error`、それ以外は `debug`。認識できない値は通知した上で既定値にフォールバックします。 |

出力**フォーマット**は引き続き `NODE_ENV` が決めます（`production` 以外では `pino-pretty` が利用可能なら人間向けの整形出力に切り替わります）。ログ量を変えたいときは `NODE_ENV` ではなく `LOG_LEVEL` を設定してください。デプロイ先で構造化 JSON のまま保てます。

```
LOG_LEVEL=info node build/index.js --transport http
```

### 完全なカスタム設定例

このセクションでは、複数の環境変数を使用した高度な設定を示します。これらは実験的な機能であり、すべてのMCPクライアントでサポートされているとは限りません。これはMCP標準仕様の一部ではなく、注意して使用する必要があります。

```json
{
  "mcpServers": {
    "backlog": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BACKLOG_DOMAIN",
        "-e",
        "BACKLOG_API_KEY",
        "-e",
        "MAX_TOKENS",
        "-e",
        "OPTIMIZE_RESPONSE",
        "-e",
        "PREFIX",
        "-e",
        "ENABLE_TOOLSETS",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "MAX_TOKENS": "10000",
        "OPTIMIZE_RESPONSE": "1",
        "PREFIX": "backlog_",
        "ENABLE_TOOLSETS": "space,project,issue"
      }
    }
  }
}
```

## 開発

### テストの実行

```bash
pnpm test
```

### 新しいツールの追加

1. 既存のツールのパターンに従って `src/tools/` に新しいファイルを作成します
2. 対応するテストファイルを作成します
3. 新しいツールを `src/tools/tools.ts` に追加します
4. 変更をビルドしてテストします

### コマンドラインオプション

サーバーはいくつかのコマンドラインオプションをサポートしています：

- `--export-descriptions`: ツール一覧の構築時に解決される説明キーと値をエクスポート。旧名は `--export-translations` で、非推奨エイリアスとして当面動作しますが、将来のリリースで削除されます
- `--optimize-response`: 各ツールに、返す結果フィールドを選ぶ `fields` パラメータを追加する
- `--max-tokens=NUMBER`: レスポンスの最大トークン制限を設定
- `--prefix=STRING`: すべてのツール名に付加するオプションの文字列プレフィックス（デフォルト：""）
- `--enable-toolsets <toolsets...>`: 有効にするツールセットを指定します（カンマ区切りまたは複数の引数）。デフォルトは "all" です。
  例：`--enable-toolsets space,project` または `--enable-toolsets issue --enable-toolsets git`
  利用可能なツールセット：`space`、`project`、`issue`、`wiki`、`git`、`notifications`。

例：

```bash
node build/index.js --optimize-response --max-tokens=100000 --prefix="backlog_" --enable-toolsets space,issue
```

## 複数組織対応

このサーバーは、1つのMCPサーバーインスタンスから複数のBacklog組織にアクセスできるよう設定できます。

### 設定

組織ごとに環境変数のペアを定義し、デフォルト組織を設定します。

```bash
BACKLOG_DEFAULT_ORG=COMPANY_A
BACKLOG_ORG_COMPANY_A_DOMAIN=company-a.backlog.com
BACKLOG_ORG_COMPANY_A_API_KEY=your-company-a-api-key
BACKLOG_ORG_COMPANY_B_DOMAIN=company-b.backlog.com
BACKLOG_ORG_COMPANY_B_API_KEY=your-company-b-api-key
```

これらの変数は、ローカルの`.env`、シェル環境変数、またはMCPクライアント設定の`env`ブロックのいずれからでも利用できます。

MCP設定例：

```json
{
  "mcpServers": {
    "backlog": {
      "env": {
        "BACKLOG_DEFAULT_ORG": "COMPANY_A",
        "BACKLOG_ORG_COMPANY_A_DOMAIN": "company-a.backlog.com",
        "BACKLOG_ORG_COMPANY_A_API_KEY": "your-company-a-api-key",
        "BACKLOG_ORG_COMPANY_B_DOMAIN": "company-b.backlog.com",
        "BACKLOG_ORG_COMPANY_B_API_KEY": "your-company-b-api-key"
      }
    }
  }
}
```

複数組織用の環境変数が設定されていない場合、サーバーは従来どおり単一組織用の設定にフォールバックします。

```bash
BACKLOG_DOMAIN=your-domain.backlog.com
BACKLOG_API_KEY=your-api-key
```

### ツールの使い方

マルチ組織用の環境変数が設定されている場合、通常のツールはすべて任意の`organization`入力フィールドを受け付けます。指定した場合、そのBacklog組織に対してツールが実行されます。

単一組織モードでは、ルーティング先が1つしかないためこのフィールドは公開されません。これにより`tools/list`のレスポンスから約8KBのスキーマが削減されます。

例：

```json
{
  "organization": "COMPANY_B",
  "projectKey": "PROJECT"
}
```

`organization`を省略した場合：

- `BACKLOG_DEFAULT_ORG`で指定した組織が使われます
- 複数組織用の環境変数が存在するのに`BACKLOG_DEFAULT_ORG`が未設定の場合、サーバーは起動時に失敗します

### 組織一覧の確認

マルチ組織モードでは、サーバーは `list_organizations` ツールを提供しており、設定済みの組織名、ドメイン、デフォルト組織かどうかを返します。単一組織モードでは登録されません。

レスポンス例：

```json
[
  {
    "name": "COMPANY_A",
    "domain": "company-a.backlog.com",
    "isDefault": true
  },
  {
    "name": "COMPANY_B",
    "domain": "company-b.backlog.com",
    "isDefault": false
  }
]
```

### 注意

- 複数組織モードでは、各組織に対して `BACKLOG_ORG_<NAME>_DOMAIN` と `BACKLOG_ORG_<NAME>_API_KEY` の両方を定義する必要があります
- `<NAME>` の部分が、`organization`入力や `list_organizations` に表示される組織名になります

## ライセンス

このプロジェクトは [MITライセンス](./LICENSE) のもとでライセンスされています。

注意：このツールはMITライセンスのもとで提供されており、**いかなる保証も公式サポートもありません**。
内容を確認し、ニーズへの適合性を判断した上で、自己責任で使用してください。
問題が発生した場合は、[GitHub Issues](../../issues) を通じて報告してください。
