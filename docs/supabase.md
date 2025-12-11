# Supabase 連携設定（設計・RLS・anon key）

本アプリは「ゲスト=ローカル保存 / 認証済み=Supabase」のハイブリッドです。環境変数が設定され、かつユーザーが認証済みのときのみ Supabase（REST）を利用します。

## 環境変数

Next.js のクライアントから利用するため、以下を `.env.local` などに設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

利用条件と動作:
- `supabaseEnabled()`: `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が両方揃っている
- `canUseRemote()`: 上記に加えてアクセストークンあり（ログイン済み）
- 画面表示: ローカル表示→（利用可なら）Supabase で最新化
- 追加/更新/削除/トラック更新: ローカル反映→（利用可なら）Supabase に反映→再取得

## スキーマ/RLS（本番想定の厳格設定）

実体はリポジトリ同梱のマイグレーションに定義されています。

- 定義場所: `supabase/migrations/20251113_init_schema.sql`（初期）と `20251124_add_category_to_videos.sql`
- 主な内容:
  - 拡張: `pgcrypto`, `moddatetime`
  - `videos`
    - 列: `id uuid PK`, `user_id uuid not null references auth.users(id)`, `provider='youtube'`, `video_id unique`, `url`, `title`, `duration_sec>0`, `thumbnail_url`, `instrument?`, `note?`, `created_at`, `updated_at`
    - トリガー: `updated_at` 自動更新
  - `tracks`
    - 列: `video_id text PK references videos(video_id) on delete cascade`, `block_size_sec>0`, `levels jsonb`
  - RLS: 有効化済み（両テーブル）
    - `videos`: `auth.uid()` と一致する `user_id` の行のみ select/insert/update/delete 可能
    - `tracks`: 紐づく `videos.user_id = auth.uid()` の行のみ select/insert/update/delete 可能

重要: 匿名全許可（using true）のポリシーは使用していません。認証済みユーザーの自分の行しか操作できない構成です。

## マイグレーションの適用

- 初期化: `supabase init`（未実行なら）
- DB再作成＋適用: `supabase db reset`（ローカルでOK）
- 追加変更: `supabase migration new <name>` → SQL編集 → `supabase db push`

適用手順:

- 初期化: `supabase init`（未実行なら）
- DB再作成＋適用: `supabase db reset`（ローカル環境でOK）
- 以降の変更: `supabase migration new <name>` → SQL編集 → `supabase db push`

## 実装概要（クライアントからREST直呼び）

- REST ラッパー: `app/lib/supabase-rest.ts`
  - `sbFetch()` は常に `apikey: NEXT_PUBLIC_SUPABASE_ANON_KEY` を付与
  - `requireAuth: true` の場合は `Authorization: Bearer <access token>` も付与
  - 失敗時は例外化（テキストも読み出し）
- リモートI/O: `app/lib/storage-remote.ts`
  - 全APIで `requireAuth: true`（未認証では呼ばれない）
  - `insertVideoRemote()` は `user_id = auth.uid()` を含めて送信（RLSの with check を満たす）
- スイッチング: `app/lib/storage.ts`
  - `canUseRemote()` が true のときのみ Supabase を利用。未ログインや変数未設定時はローカル実装を使用

## anon key について（必須/公開前提）

- Supabase REST をクライアントから利用する場合、`apikey` ヘッダーが必須です。ここに使うのが「anon key」で、公開前提のキーです（機密ではありません）。
- 実データ保護は RLS で行います。本アプリでは RLS が厳格に設定されているため、アクセストークンが無いと自身のデータを読む/書くことはできません。
- よって anon key は「不要」ではなく、現在の構成では必要です。削除しないでください。

代替案（サーバ経由に集約したい場合）:
- Next.js の Route Handler でサーバ側から Supabase を呼び出す（`runtime: 'nodejs'` 推奨）
- この場合でもクライアントは `anon key` 不要になりますが、サーバ側での認可設計（RLS or サービスロール）を慎重に行ってください。

## Google OAuth 連携

1) Supabase ダッシュボードで Provider を有効化（Google）
   - Client ID / Secret を設定
   - Redirect URL: `https://<your-domain>/auth/callback`（ローカル: `http://localhost:3000/auth/callback`）

2) 依存関係
   - `@supabase/supabase-js@^2` をインストール
   - `npm i @supabase/supabase-js@2`

3) 環境変数
   - `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4) 実装ポイント
   - サインイン: `signInWithGoogle()`（`app/lib/auth.ts`）
   - コールバック: `/auth/callback` が `exchangeCodeForSession()` を実行
   - サインアウト: `signOut()`
   - 認証後の API 呼び出しは `Authorization: Bearer <token>` を自動付与（`supabase-rest.ts`）。`apikey` には anon key を付与
