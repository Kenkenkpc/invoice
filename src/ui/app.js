import { el, clear } from './dom.js';
import { createInitialState } from '../domain/state.js';
import { loadDraft, saveDraftDebounced, saveDraftNow, clearDraft } from '../store/autosave.js';
import { SCREENS, getScreen, getVisibleScreens, getNextScreenId, getPrevScreenId, getVisibleFields } from '../rules/screens.js';
import { renderField } from './fieldControl.js';
import { renderPartyForm } from './partyForm.js';
import { renderSameAsBuyerBranch } from './branchForm.js';
import { renderItemsScreen } from './itemsForm.js';
import { renderDocTypeScreen } from './docTypeScreen.js';
import { renderReviewScreen } from './reviewScreen.js';
import { buildPrintView } from '../print/printView.js';
import { exportToGoogleSheets, verifyExportedSpreadsheet, buildFileName } from '../google/sheetsExport.js';
import { isGoogleConfigured } from '../google/sheetsAuth.js';
import { computeChecks } from '../rules/validation.js';

let STATE = loadDraft() || createInitialState();
let exportInProgress = false;
let lastExportResult = null;
let pendingFocusPath = null;

const root = document.getElementById('app');

function setState(updated) {
  updated.meta.updatedAt = new Date().toISOString();
  STATE = updated;
  saveDraftDebounced(STATE, () => {
    const badge = document.getElementById('autosave-badge');
    if (badge) badge.textContent = '保存しました ' + new Date().toLocaleTimeString('ja-JP');
  });
  render();
}

/**
 * 指定した画面へ移動する。fieldPath を渡すと、描画後にその入力欄までスクロールして
 * 一時的にハイライトする（未入力・未確認の項目からの「この質問へ戻る」用）。
 */
function go(screenId, fieldPath) {
  const updated = { ...STATE, meta: { ...STATE.meta, currentScreenId: screenId } };
  if (!updated.meta.completedScreenIds.includes(STATE.meta.currentScreenId)) {
    updated.meta.completedScreenIds = [...updated.meta.completedScreenIds, STATE.meta.currentScreenId];
  }
  pendingFocusPath = fieldPath || null;
  setState(updated);
}

function focusPendingField() {
  if (!pendingFocusPath) return;
  const path = pendingFocusPath;
  pendingFocusPath = null;
  const target = /** @type {HTMLElement|null} */ (document.querySelector('[data-field-path="' + path + '"]'));
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const highlightHost = target.closest('.field') || target.closest('.item-card') || target;
  highlightHost.classList.add('field-highlight');
  if (typeof target.focus === 'function') {
    try {
      target.focus({ preventScroll: true });
    } catch (e) {
      target.focus();
    }
  }
  setTimeout(() => highlightHost.classList.remove('field-highlight'), 2400);
}

function renderProgress(container) {
  const visible = getVisibleScreens(STATE);
  const bar = el('div', { class: 'progress-bar' });
  visible.forEach((s) => {
    const done = STATE.meta.completedScreenIds.includes(s.id);
    const current = s.id === STATE.meta.currentScreenId;
    bar.appendChild(
      el('button', {
        type: 'button',
        class: 'progress-dot' + (done ? ' done' : '') + (current ? ' current' : ''),
        title: s.title,
        onclick: () => go(s.id),
      })
    );
  });
  container.appendChild(bar);
}

function renderTopBar(container) {
  const bar = el('div', { class: 'topbar' });
  bar.appendChild(el('div', { class: 'brand', text: '海外発送インボイス作成' }));
  bar.appendChild(el('span', { id: 'autosave-badge', class: 'autosave-badge', text: '自動保存: 有効' }));
  bar.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onclick: () => {
          if (confirm('この端末に保存されている下書きをすべて削除します。よろしいですか？')) {
            clearDraft();
            STATE = createInitialState();
            render();
          }
        },
      },
      '下書きを削除'
    )
  );
  container.appendChild(bar);
}

function renderGenericScreen(screen, container) {
  container.appendChild(el('h2', { class: 'screen-title', text: screen.title }));
  if (screen.subtitle) container.appendChild(el('p', { class: 'screen-subtitle', text: screen.subtitle }));

  const fields = getVisibleFields(screen, STATE);
  for (const fieldDef of fields) {
    container.appendChild(
      renderField(fieldDef, STATE, (path, field, updated) => setState(updated))
    );
  }
}

function renderCustomScreen(screen, container) {
  container.appendChild(el('h2', { class: 'screen-title', text: screen.title }));
  if (screen.subtitle) container.appendChild(el('p', { class: 'screen-subtitle', text: screen.subtitle }));

  const onChange = (updated) => setState(updated);

  switch (screen.custom) {
    case 'docType':
      container.appendChild(renderDocTypeScreen(STATE, onChange));
      break;
    case 'party':
      container.appendChild(renderPartyForm(screen.partyPath, STATE, (p, f, updated) => onChange(updated)));
      break;
    case 'shipTo':
      container.appendChild(
        renderSameAsBuyerBranch(
          {
            sameKey: 'shipToSameAsBuyer',
            partyPath: 'shipTo',
            question: '商品を届ける住所は、購入した方の住所と同じですか？',
            differentLabel: '配送先の住所',
            unknownNotice: '配送先が未確認のままです。買主に確認してから発送してください。',
          },
          STATE,
          onChange
        )
      );
      break;
    case 'importer':
      container.appendChild(
        renderSameAsBuyerBranch(
          {
            sameKey: 'importerSameAsBuyer',
            partyPath: 'importer',
            question: '輸入者は買主と同じですか？',
            explanation: '輸入者は、輸入国で通関手続きを行う責任者です。買主・配送先と同じとは限りません。',
            differentLabel: '輸入者の情報',
            unknownNotice: '輸入者が未確認のままです。自動的に買主と同一にはしていません。買主に確認してください。',
          },
          STATE,
          onChange
        )
      );
      break;
    case 'items':
      container.appendChild(renderItemsScreen(STATE, onChange));
      break;
    case 'review':
      container.appendChild(
        renderReviewScreen(STATE, {
          onJump: (id, fieldPath) => go(id, fieldPath),
          onOpenPrint: () => openPrintModal(),
          onExportSheets: (isDraft) => handleExport(isDraft),
          onChangeDocumentStatus: (status) => {
            const updated = { ...STATE, invoice: { ...STATE.invoice, documentStatus: status } };
            setState(updated);
          },
        })
      );
      break;
  }
}

function renderNav(container, screen) {
  const nav = el('div', { class: 'nav-row' });
  const prevId = getPrevScreenId(screen.id, STATE);
  const nextId = getNextScreenId(screen.id, STATE);
  if (prevId) nav.appendChild(el('button', { type: 'button', class: 'secondary-btn', onclick: () => go(prevId) }, '← 前へ戻る'));
  if (nextId) nav.appendChild(el('button', { type: 'button', class: 'primary-btn', onclick: () => go(nextId) }, '次へ →'));
  container.appendChild(nav);
}

function openPrintModal() {
  const overlay = el('div', { class: 'modal-overlay' });
  const box = el('div', { class: 'modal-box print-modal' });
  const bar = el('div', { class: 'modal-bar' }, [
    el('button', { type: 'button', class: 'secondary-btn', onclick: () => window.print() }, '印刷 / PDF保存'),
    el('button', { type: 'button', class: 'link-btn', onclick: () => overlay.remove() }, '閉じる'),
  ]);
  box.appendChild(bar);
  box.appendChild(buildPrintView(STATE));
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

async function handleExport(isDraft) {
  if (exportInProgress) return;
  if (!isGoogleConfigured()) {
    alert('Google連携が未設定です。docs/google-setup.md の手順でOAuthクライアントIDを設定してください。設定が完了するまでは、印刷プレビューと下書き保存をご利用ください。');
    return;
  }
  exportInProgress = true;
  const overlay = el('div', { class: 'modal-overlay' });
  const box = el('div', { class: 'modal-box progress-modal' });
  const statusText = el('p', { text: '準備しています…' });
  box.appendChild(el('h3', { text: 'Googleスプレッドシートを作成しています' }));
  box.appendChild(statusText);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  try {
    const result = await exportToGoogleSheets(STATE, {
      isDraft,
      onProgress: (label) => {
        statusText.textContent = label;
      },
    });
    statusText.textContent = '作成結果を確認しています…';
    let verify = null;
    try {
      verify = await verifyExportedSpreadsheet(result.spreadsheetId, STATE);
    } catch (e) {
      // 検証に失敗しても作成自体は成功しているため、結果は表示する
    }
    lastExportResult = { ...result, verify, isDraft, createdAt: new Date().toISOString() };
    clear(box);
    box.appendChild(el('h3', { text: '作成しました' }));
    box.appendChild(el('p', { text: result.fileName }));
    if (verify) {
      box.appendChild(
        el('ul', { class: 'verify-list' }, [
          el('li', { text: (verify.isDifferentFile ? '✔' : '✘') + ' 元のテンプレートとは別のファイルです' }),
          el('li', { text: (verify.docTypeMatches ? '✔' : '✘') + ' 書類種類が正しく反映されています' }),
          el('li', { text: (verify.buyerReflected ? '✔' : '✘') + ' 取引先情報が反映されています' }),
          el('li', { text: (verify.totalReflected ? '✔' : '✘') + ' 総額が計算されています' }),
        ])
      );
    }
    box.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'primary-btn',
          onclick: () => window.open(result.url, '_blank', 'noopener'),
        },
        '作成したインボイスを開く'
      )
    );
    box.appendChild(el('button', { type: 'button', class: 'link-btn', onclick: () => overlay.remove() }, '閉じる'));
  } catch (e) {
    clear(box);
    box.appendChild(el('h3', { text: '作成に失敗しました' }));
    box.appendChild(el('p', { class: 'field-warning', text: e.message || String(e) }));
    box.appendChild(el('p', { text: '入力内容は失われていません。もう一度お試しください。' }));
    box.appendChild(
      el(
        'button',
        { type: 'button', class: 'primary-btn', onclick: () => { overlay.remove(); handleExport(isDraft); } },
        '再試行する'
      )
    );
    box.appendChild(el('button', { type: 'button', class: 'link-btn', onclick: () => overlay.remove() }, '閉じる'));
  } finally {
    exportInProgress = false;
  }
}

export function render() {
  clear(root);
  renderTopBar(root);
  renderProgress(root);

  const screen = getScreen(STATE.meta.currentScreenId) || SCREENS[0];
  const card = el('div', { class: 'screen-card' });
  if (screen.custom) {
    renderCustomScreen(screen, card);
  } else {
    renderGenericScreen(screen, card);
  }
  root.appendChild(card);
  renderNav(root, screen);

  if (pendingFocusPath) {
    requestAnimationFrame(() => requestAnimationFrame(focusPendingField));
  }
}

render();
