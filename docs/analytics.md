# GA4 計測イベント（離脱分析用）

本アプリでの主要フロー（未ログイン含む）の離脱ポイント可視化のため、以下の GA4 カスタムイベントを送信します。PII は送信しません。

## 共通

- event: `page_view`（既存）
- user_id 連携: Supabase ログイン時に `user_id` を `gtag('config')` で設定

## ホーム（一覧）

- `open_add_dialog`: 追加ボタンクリック（ダイアログ表示）
- `guest_limit_shown`: ゲスト上限バナー表示
- `guest_limit_login_click`: ゲスト上限からログイン導線クリック
- `open_video_detail`: 動画カードから詳細へ遷移（params: `video_id`）

## 動画追加ダイアログ

- `add_dialog_input_url_first`: 最初に URL 入力が行われた
- `add_dialog_title_autofill_start` / `add_dialog_title_autofill_success`
- `add_dialog_duration_autofill_start` / `add_dialog_duration_autofill_success`
- `add_dialog_click_get_duration`: 手動「長さを取得」クリック
- `add_dialog_submit_click`: 保存クリック
  - params: `ttc_ms`（オープン→保存クリック所要時間）, `has_url`, `has_title`, `has_duration`, `auto_title_used`, `auto_duration_used`
- `add_dialog_close`: キャンセル/クローズ
  - params: `ttc_ms`, `has_url`, `has_title`, `has_duration`, `auto_title_used`, `auto_duration_used`
- `add_video`: 登録成功（親コンポーネントで送信）
  - params: `provider`, `video_id`
- `add_video_failed`: 登録失敗
  - params: `reason`（先頭120文字）, `has_url`, `has_title`, `has_duration`

## 動画詳細ページ

- `open_source_video`: 元動画を外部リンクでオープン（params: `video_id`）
- `track_first_interact`: 初回インタラクション（所要時間）
  - params: `video_id`, `tti_ms`（ページ訪問→初回操作）
- `track_level_change`: ブロックの習熟度変更
  - params: `video_id`, `index`, `to_level`（0-3）
- `video_edit_open`:  編集ダイアログを開いた（params: `video_id`）
- `video_edit_save`: 編集保存
  - params: `video_id`, `has_title`, `has_instrument`, `has_note`, `has_duration`, `has_blocksize`, `has_category`
- `delete_video_click`: 削除開始（params: `video_id`）
- `delete_video`: 削除成功（params: `video_id`）

## 分析の観点（例）

- 追加フローのファネル: `open_add_dialog` → `add_dialog_input_url_first` → `add_dialog_submit_click` → `add_video`
- 途中離脱: `add_dialog_close` の `has_url`/`has_duration`/`auto_*_used` を切り口に原因特定
- 詳細ページの活性度: `track_first_interact` までの `tti_ms`、`track_level_change` の分布

## 注意事項

- PII（メール・氏名・生URLなど個人特定情報）は送信しない
- 同意モード（Consent Mode）やクッキー同意は別途運用

