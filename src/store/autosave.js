// 下書きの自動保存・再開。
// 保存先はブラウザのlocalStorageのみ（このデバイス・このブラウザ内に限定される）。
// サーバーには送信しない。削除は clearDraft() で即座にこのデバイスから消える。
const STORAGE_KEY = 'invoice-app:draft:v1';
const DEBOUNCE_MS = 400;

let saveTimer = null;

export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    // 壊れたデータで復元不能な場合は「読み込めない」ことだけを示し、上書きはしない
    console.warn('下書きの読み込みに失敗しました。データは保持されています。');
    return null;
  }
}

export function saveDraftNow(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    // 個人情報の内容自体はログに残さない
    console.warn('下書きの保存に失敗しました（ストレージ容量など）。');
    return false;
  }
}

export function saveDraftDebounced(state, onSaved) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = saveDraftNow(state);
    if (onSaved) onSaved(ok);
  }, DEBOUNCE_MS);
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasDraft() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
