# Supabase 連携設定

本アプリはローカルストレージを既定としつつ、環境変数が設定されている場合は Supabase（REST）に同期します。

## 環境変数

Next.js のクライアントから利用するため、以下を `.env.local` などに設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

設定されている場合:
- 一覧・詳細ページ初期表示: まずローカルを表示し、続いて Supabase から最新を取得して画面更新します。
- 追加/更新/削除/トラック更新: ローカル反映後、非同期で Supabase に反映します。その後、最新状態を再取得して画面更新します。

## テーブル定義（SQL）

Videos と Tracks の 2 テーブルを作成します（Snake Case）。

```sql
-- videos
create table if not exists public.videos (
  id uuid primary key,
  provider text not null check (provider = 'youtube'),
  video_id text not null unique,
  url text not null,
  title text not null,
  duration_sec integer not null,
  thumbnail_url text not null,
  instrument text null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 自動更新（任意）
create extension if not exists moddatetime;
create trigger handle_updated_at before update on public.videos
for each row execute procedure moddatetime(updated_at);

-- tracks
create table if not exists public.tracks (
  video_id text primary key references public.videos(video_id) on delete cascade,
  block_size_sec integer not null,
  levels jsonb not null -- number[] を JSON として保存
);

-- サンプル RLS（必要に応じて）
-- 有効化する場合:
-- alter table public.videos enable row level security;
-- alter table public.tracks enable row level security;
-- 認証済みユーザーに対する簡易ポリシー（例）
-- create policy "anon read" on public.videos for select using (true);
-- create policy "anon write" on public.videos for insert with check (true);
-- create policy "anon update" on public.videos for update using (true);
-- create policy "anon delete" on public.videos for delete using (true);
-- tracks も同様に作成してください。
```

## マイグレーション（推奨）

- 追加済み: `supabase/migrations/20251113_init_schema.sql`
  - 拡張（pgcrypto/moddatetime）・テーブル作成・RLS有効化・匿名全許可ポリシー（ローカル向け）
- シード（任意）: `supabase/seed.sql`

適用手順:

- 初期化: `supabase init`（未実行なら）
- DB再作成＋適用: `supabase db reset`（ローカル環境でOK）
- 以降の変更: `supabase migration new <name>` → SQL編集 → `supabase db push`

## 実装概要

- REST クライアント: `app/lib/supabase-rest.ts`
- 認証クライアント: `app/lib/supabase-client.ts`, `app/lib/auth.ts`
- リモート I/O: `app/lib/storage-remote.ts`
- 既存ストレージ API: `app/lib/storage.ts`
  - 既存の同期 API は維持
  - Supabase 有効時はローカルへ反映したうえで非同期に Supabase へ書き込み
  - 画面側で `refresh*FromRemote()` を呼び出して最新化

## 注意事項

- 既存データ移行は別途必要です（ローカル→Supabase）。
- RLS を有効にする場合は適切なポリシーを設定してください。匿名キー利用のため公開範囲に注意。
- 本実装はクライアントから REST を直接呼びます。サーバー経由にする場合は Route Handler を追加してください。

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
   - 認証後の API 呼び出しはアクセストークンを `Authorization: Bearer <token>` に自動付与（`supabase-rest.ts`）
