# Backlog MCP Server（日本語版）

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://github.com/nulab/backlog-mcp-server/actions/workflows/ci.yml/badge.svg)
![Last Commit](https://img.shields.io/github/last-commit/nulab/backlog-mcp-server.svg)

[🇬🇧 English README](./README.md)

Backlog API とやり取りするための Model Context Protocol（MCP）サーバーです。このサーバーは、Claude Desktop / Cline / Cursor などのAIエージェントを通じて、Backlog 上でプロジェクト、課題、Wikiページなどを管理するためのツールを提供します。

## 主な機能

- プロジェクトツール（作成、読み取り、更新、削除）
- 課題とコメントの追跡（作成、更新、削除、一覧表示）
- Wikiページサポート
- Gitリポジトリとプルリクエストツール
- 通知ツール
- 最適化されたレスポンスのためのGraphQLスタイルのフィールド選択
- 大規模なレスポンスに対するトークン制限

## 利用開始

### 必要条件

- Docker または Node.js 18+
- APIアクセスが可能なBacklogアカウント
- BacklogアカウントのAPIキー

### オプション1: DXTファイルでワンクリックインストール（推奨）

Claude Desktopユーザーの方は、DXTファイルを使用することで最も簡単にインストールできます：

1. **DXTファイルをダウンロード**
   - [Releases](https://github.com/nulab/backlog-mcp-server/releases)ページから最新の`backlog-mcp-server.dxt`をダウンロードします

2. **Claude Desktopにインストール**
   - ダウンロードした`.dxt`ファイルをダブルクリック、またはClaude Desktopにドラッグ＆ドロップします
   - インストール確認ダイアログが表示されるので、内容を確認して「インストール」をクリックします

3. **設定を入力**
   - インストール時に以下の設定項目が表示されます：
     - **Backlog Domain**: あなたのBacklogドメイン（例：`your-domain.backlog.com`）
     - **Backlog API Key**: あなたのBacklog APIキー（[設定画面](https://your-domain.backlog.com/EditApiSettings.action)から取得）
   - 必要な情報を入力して「保存」をクリックします

4. **完了！**
   - Claude Desktopが再起動され、Backlog MCPサーバーが利用可能になります
   - 「Backlogで課題を検索して」などの指示をClaudeに送信できるようになります

### オプション2: Docker経由でのインストール

DXTファイルを使用しない場合は、Docker経由で手動設定することも可能です：

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
        "--pull", "always",
        "-i",
        "--rm",
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
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

### オプション3: 手動セットアップ (Node.js)

1. クローンしてインストール：
   ```bash
   git clone https://github.com/nulab/backlog-mcp-server.git
   cd backlog-mcp-server
   npm install
   npm run build
   ```

2. MCPとして使用するJSONを設定します：
  ```json
  {
    "mcpServers": {
      "backlog": {
        "command": "node",
        "args": [
          "your-repository-location/build/index.js"
        ],
        "env": {
          "BACKLOG_DOMAIN": "your-domain.backlog.com",
          "BACKLOG_API_KEY": "your-api-key"
        }
      }
    }
  }
  ```

## ツール設定

`--enable-toolsets` コマンドラインフラグまたは `ENABLE_TOOLSETS` 環境変数を使用して、特定の **ツールセット** を選択的に有効または無効にすることができます。これにより、AIエージェントが利用できるツールをより細かく制御し、コンテキストサイズを削減するのに役立ちます。

### 利用可能なツールセット

次のツールセットが利用可能です（`"all"` が使用されるとデフォルトで有効になります）：

| ツールセット    | 説明                                                                 |
|-----------------|--------------------------------------------------------------------------------------|
| `space`         | Backlogスペース設定と一般情報を管理するためのツール                                  |
| `project`       | プロジェクト、カテゴリ、カスタムフィールド、課題タイプを管理するためのツール             |
| `issue`         | 課題とそのコメントを管理するためのツール                                             |
| `wiki`          | Wikiページを管理するためのツール                                                     |
| `git`           | Gitリポジトリとプルリクエストを管理するためのツール                                    |
| `notifications` | ユーザー通知を管理するためのツール                                                   |

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

### 動的なツールセット検出（実験的）

MCPサーバーをAIエージェントと共に使用している場合、実行時にツールセットの動的な検出を有効にすることができます：

CLI経由での有効化：

```
--dynamic-toolsets
```

または環境変数経由：

```
-e DYNAMIC_TOOLSETS=1 \
```

動的ツールセットを有効にすると、LLMはツールインターフェースを介してオンデマンドでツールセットを一覧表示およびアクティブ化できるようになります。

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

### i18n / 説明のオーバーライド

**ホームディレクトリ** に `.backlog-mcp-serverrc.json` ファイルを作成することで、ツールの説明をオーバーライドできます。

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
3. 組み込みのフォールバック値（英語）

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
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-v", "/yourcurrentdir/.backlog-mcp-serverrc.json:/root/.backlog-mcp-serverrc.json:ro",
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

### 現在の翻訳のエクスポート

`--export-translations` フラグを指定してバイナリを実行することで、現在のデフォルト翻訳（オーバーライドを含む）をエクスポートできます。

これにより、行ったカスタマイズを含むすべてのツール説明が標準出力に出力されます。

例：

```bash
docker run -i --rm ghcr.io/nulab/backlog-mcp-server node build/index.js --export-translations
```

または

```bash
npx github:nulab/backlog-mcp-server --export-translations
```

### 日本語翻訳テンプレートの使用
サンプルの日本語設定ファイルは次の場所に提供されています：

```bash
translationConfig/.backlog-mcp-serverrc.json.example
```

これを使用するには、ホームディレクトリに `.backlog-mcp-serverrc.json` としてコピーします：

その後、必要に応じてファイルを編集して説明をカスタマイズできます。

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
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-e", "BACKLOG_MCP_TOOL_ADD_ISSUE_COMMENT_DESCRIPTION",
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

#### フィールド選択（GraphQLスタイル）

```
--optimize-response
```

または環境変数：

```
OPTIMIZE_RESPONSE=1
```

次に、特定のフィールドのみを要求します：

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: "{ name key description }")
```

AIはフィールド選択を使用してレスポンスを最適化します：

```
get_project(projectIdOrKey: "PROJECT-KEY", fields: "{ name key description }")
```

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
        "-e", "BACKLOG_DOMAIN",
        "-e", "BACKLOG_API_KEY",
        "-e", "MAX_TOKENS",
        "-e", "OPTIMIZE_RESPONSE",
        "-e", "PREFIX",
        "-e", "ENABLE_TOOLSETS",
        "ghcr.io/nulab/backlog-mcp-server"
      ],
      "env": {
        "BACKLOG_DOMAIN": "your-domain.backlog.com",
        "BACKLOG_API_KEY": "your-api-key",
        "MAX_TOKENS": "10000",
        "OPTIMIZE_RESPONSE": "1",
        "PREFIX": "backlog_",
        "ENABLE_TOOLSETS": "space,project,issue",
        "ENABLE_DYNAMIC_TOOLSETS": "1"
      }
    }
  }
}
```

## 開発

### テストの実行

```bash
npm test
```

### 新しいツールの追加

1. 既存のツールのパターンに従って `src/tools/` に新しいファイルを作成します
2. 対応するテストファイルを作成します
3. 新しいツールを `src/tools/tools.ts` に追加します
4. 変更をビルドしてテストします

### コマンドラインオプション

サーバーはいくつかのコマンドラインオプションをサポートしています：

- `--export-translations`: すべての翻訳キーと値をエクスポート
- `--optimize-response`: GraphQLスタイルのフィールド選択を有効にする
- `--max-tokens=NUMBER`: レスポンスの最大トークン制限を設定
- `--prefix=STRING`: すべてのツール名に付加するオプションの文字列プレフィックス（デフォルト：""）
- `--enable-toolsets <toolsets...>`: 有効にするツールセットを指定します（カンマ区切りまたは複数の引数）。デフォルトは "all" です。
  例：`--enable-toolsets space,project` または `--enable-toolsets issue --enable-toolsets git`
  利用可能なツールセット：`space`、`project`、`issue`、`wiki`、`git`、`notifications`。

例：
```bash
node build/index.js --optimize-response --max-tokens=100000 --prefix="backlog_" --enable-toolsets space,issue
```

## ライセンス

このプロジェクトは [MITライセンス](./LICENSE) のもとでライセンスされています。

注意：このツールはMITライセンスのもとで提供されており、**いかなる保証も公式サポートもありません**。
内容を確認し、ニーズへの適合性を判断した上で、自己責任で使用してください。
問題が発生した場合は、[GitHub Issues](../../issues) を通じて報告してください。
