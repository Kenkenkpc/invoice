// Google Identity Services (GIS) を使ったブラウザ完結のOAuth。
// クライアントシークレットは使わない（公開クライアントのトークン方式）。
// アクセストークンはメモリ変数にのみ保持し、localStorageや自前サーバーには一切送らない。
import { GOOGLE_CLIENT_ID } from './config.js';

const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';

let accessToken = null;
let tokenExpiresAt = 0;
let tokenClient = null;

/** GIS (window.google) はこのアプリの型定義に無いグローバルのため、ここでのみ any 扱いにする。 */
function gis() {
  return /** @type {any} */ (window).google;
}

/**
 * @param {string} message
 * @param {string} code
 */
function errorWithCode(message, code) {
  const err = /** @type {Error & {code:string}} */ (new Error(message));
  err.code = code;
  return err;
}

export function isGoogleConfigured() {
  return !!GOOGLE_CLIENT_ID;
}

/** @returns {Promise<void>} */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (gis() && gis().accounts && gis().accounts.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script_error')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.dataset.gis = 'true';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script_error'));
    document.head.appendChild(s);
  });
}

/**
 * @param {{forcePrompt?:boolean}} [opts]
 * @returns {Promise<string>} アクセストークン
 */
export async function ensureAccessToken(opts = {}) {
  const forcePrompt = opts.forcePrompt || false;
  if (!isGoogleConfigured()) {
    throw errorWithCode('Google連携が未設定です。', 'NOT_CONFIGURED');
  }
  if (!forcePrompt && accessToken && Date.now() < tokenExpiresAt - 30000) {
    return accessToken;
  }
  try {
    await loadGisScript();
  } catch (e) {
    throw errorWithCode('Googleへの接続に失敗しました（ネットワークを確認してください）。', 'SCRIPT_LOAD_FAILED');
  }
  return new Promise((resolve, reject) => {
    tokenClient = gis().accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          reject(errorWithCode('Googleの認証が完了しませんでした: ' + resp.error, 'AUTH_FAILED'));
          return;
        }
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3600 * 1000);
        resolve(accessToken);
      },
      error_callback: () => {
        reject(errorWithCode('Googleの認証がキャンセルされたか失敗しました。', 'AUTH_FAILED'));
      },
    });
    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

export function clearAccessToken() {
  if (accessToken && gis() && gis().accounts && gis().accounts.oauth2) {
    try {
      gis().accounts.oauth2.revoke(accessToken, () => {});
    } catch (e) {
      // 失敗しても致命的ではない
    }
  }
  accessToken = null;
  tokenExpiresAt = 0;
}
