export type Locale = "ja" | "en";

export const defaultLocale: Locale = "ja";

type Dict = Record<string, string>;

const ja: Dict = {
  // Common
  "common.back": "← 戻る",
  "common.add": "＋ 追加",
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.saving": "保存中...",
  "common.edit": "編集",
  "common.delete": "削除",

  // Auth
  "auth.processing": "認証処理中…",
  "auth.login_google": "Googleでログイン",
  "auth.toast_signed_in": "ログインしました",
  "auth.toast_signed_out": "ログアウトしました",
  "auth.guest": "ゲストモード",
  "auth.contact": "お問い合わせ",
  "auth.menu": "メニュー",
  "auth.logout": "ログアウト",

  // Home
  "home.subtitle": "YouTube のタブ譜動画で練習進捗を記録",
  "home.list_title": "練習曲一覧",
  "home.guest_limit": "ゲストモードでは3件まで登録できます。これ以上登録する場合はアカウント登録してください。",
  "home.register_login": "アカウント登録 / ログイン",
  "home.empty.1": "YouTube の演奏動画を登録すると、コピー練習の進捗をかんたんに記録できます。",
  "home.empty.2": "アカウントなしでも ゲストモードでそのまま利用OK（3件まで）。",
  "home.empty.3": "ログインすると、保存データがずっと残り、他の端末とも同期できます。",
  "home.empty_auth.1": "まだ動画がありません。最初の動画を登録して練習を始めましょう。",
  "category.none": "カテゴリーなし",
  "video.add": "動画を追加",
  "error.add_failed": "登録に失敗しました",
  "field.title_optional": "タイトル（任意）",
  "placeholder.sample_title": "例: Sample Guitar Tab",
  "auto_title.loading": "タイトルを自動取得中…",
  "field.instrument_optional": "楽器（任意）",
  "field.category_optional": "カテゴリー（任意）",
  "placeholder.category": "例: 練習中 / 本命 / ジャンル名",
  "field.duration_optional": "動画長（秒・任意）",
  "button.fetch": "自動取得",
  "button.fetching": "取得中...",
  "error.fetch_duration": "動画長の自動取得に失敗しました",

  // Video detail
  "error.video_not_found": "動画が見つかりませんでした。",
  "video.open": "動画を開く",
  "video.coverage": "完了率",
  "video.proficiency": "習熟度",
  "confirm.delete_video": "この動画を削除しますか？",
  "error.delete_failed": "削除に失敗しました",
  "video.timeline_title": "練習タイムライン",
  "error.no_track": "トラック情報がありません。",
  "level.high": "高",
  "level.mid": "中",
  "level.low": "低",
  "aria.toggle_top": "上段トグル",
  "aria.toggle_mid": "中段トグル",
  "aria.toggle_bottom": "下段トグル",
  "video.legend": "上=高レベル、下=低レベル。各段を個別にタップでON/OFF。上段は下段がONのときのみONにでき、下段をOFFにすると上段もOFFになります。",

  // Edit dialog
  "video.edit_title": "動画情報を編集",
  "field.title": "タイトル",
  "field.instrument": "楽器",
  "field.category": "カテゴリー",
  "field.note": "メモ",
  "field.duration": "動画長（秒）",
  "field.blocksize": "ブロック間隔（秒）",
  "hint.blocksize_change": "変更時は既存の進捗を「最大値」で変換します。",
};

const en: Dict = {
  // Common
  "common.back": "← Back",
  "common.add": "+ Add",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.edit": "Edit",
  "common.delete": "Delete",

  // Auth
  "auth.processing": "Processing sign-in…",
  "auth.login_google": "Sign in with Google",
  "auth.toast_signed_in": "Signed in",
  "auth.toast_signed_out": "Signed out",
  "auth.guest": "Guest Mode",
  "auth.contact": "Contact",
  "auth.menu": "Menu",
  "auth.logout": "Log out",

  // Home
  "home.subtitle": "Track practice with YouTube tab videos",
  "home.list_title": "Practice List",
  "home.guest_limit": "Guest mode allows up to 3 items. Sign up to add more.",
  "home.register_login": "Sign up / Log in",
  "home.empty.1": "Register YouTube performance videos to easily track your copy practice progress.",
  "home.empty.2": "No account needed — use Guest Mode as is (up to 3 items).",
  "home.empty.3": "Sign in to keep your data and sync across devices.",
  "home.empty_auth.1": "No videos yet. Add your first one to start practicing.",
  "category.none": "No Category",
  "video.add": "Add Video",
  "error.add_failed": "Failed to add",
  "field.title_optional": "Title (optional)",
  "placeholder.sample_title": "e.g. Sample Guitar Tab",
  "auto_title.loading": "Fetching title…",
  "field.instrument_optional": "Instrument (optional)",
  "field.category_optional": "Category (optional)",
  "placeholder.category": "e.g. Practicing / Favorite / Genre",
  "field.duration_optional": "Duration (sec, optional)",
  "button.fetch": "Fetch",
  "button.fetching": "Fetching...",
  "error.fetch_duration": "Failed to fetch duration",

  // Video detail
  "error.video_not_found": "Video not found.",
  "video.open": "Open Video",
  "video.coverage": "Coverage",
  "video.proficiency": "Proficiency",
  "confirm.delete_video": "Delete this video?",
  "error.delete_failed": "Failed to delete",
  "video.timeline_title": "Practice Timeline",
  "error.no_track": "No track information.",
  "level.high": "High",
  "level.mid": "Mid",
  "level.low": "Low",
  "aria.toggle_top": "Toggle top row",
  "aria.toggle_mid": "Toggle middle row",
  "aria.toggle_bottom": "Toggle bottom row",
  "video.legend": "Top=High, Bottom=Low. Tap each row to toggle. Top can be ON only if lower is ON; turning OFF lower also turns OFF upper.",

  // Edit dialog
  "video.edit_title": "Edit Video Info",
  "field.title": "Title",
  "field.instrument": "Instrument",
  "field.category": "Category",
  "field.note": "Note",
  "field.duration": "Duration (sec)",
  "field.blocksize": "Block size (sec)",
  "hint.blocksize_change": "Existing progress is converted using the max value.",
};

const dict: Record<Locale, Dict> = { ja, en };

export function translate(locale: Locale, key: string): string {
  const d = dict[locale] || dict[defaultLocale];
  return d[key] ?? dict[defaultLocale][key] ?? key;
}
