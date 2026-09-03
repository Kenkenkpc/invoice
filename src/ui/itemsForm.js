import { el } from './dom.js';
import { emptyField, setValue, setUnknown, setNotApplicable, FieldStatus, hasValue } from '../domain/types.js';
import { createItem } from '../domain/state.js';
import { renderField } from './fieldControl.js';
import { calcLineAmount, defaultDecimalsForCurrency } from '../domain/money.js';
import { glossaryEntry } from '../rules/glossary.js';

const VAGUE_TERMS = ['雑貨', 'ギフト', '部品', '雑貨品', 'グッズ'];

function isVague(name) {
  if (!name) return false;
  return VAGUE_TERMS.some((t) => name.includes(t));
}

/** 名称・素材・用途から下書きの英語説明を組み立てる（AI不使用の決定的な合成。翻訳はしない）。 */
function composeDescriptionDraft(item) {
  const parts = [];
  if (hasValue(item.material)) parts.push(item.material.value);
  if (hasValue(item.name)) parts.push(item.name.value);
  let text = parts.join(' ').trim();
  if (hasValue(item.purpose)) text += ` for ${item.purpose.value}`;
  return text.trim();
}

function renderItemCard(item, index, state, ctx) {
  const decimals = hasValue(state.shipping.currencyDecimals)
    ? Number(state.shipping.currencyDecimals.value)
    : defaultDecimalsForCurrency(state.shipping.currency?.value);

  const card = el('div', { class: 'item-card', 'data-field-path': `items[${index}]` });
  card.appendChild(
    el('div', { class: 'item-card-header' }, [
      el('span', { class: 'item-card-title', text: `商品 ${index + 1}` }),
      el('div', { class: 'item-card-actions' }, [
        el('button', { type: 'button', class: 'link-btn', onclick: () => ctx.onDuplicate(index) }, '複製'),
        el('button', { type: 'button', class: 'link-btn danger', onclick: () => ctx.onDelete(index) }, '削除'),
      ]),
    ])
  );

  const onFieldChange = (path, field, updated) => ctx.onChange(updated);

  card.appendChild(renderField({ id: 'name', path: `items[${index}].name`, label: '何という商品ですか？', type: 'text' }, state, onFieldChange));

  if (isVague(item.name?.value) && !hasValue(item.material) && !hasValue(item.purpose)) {
    card.appendChild(
      el('p', { class: 'field-warning', text: '「雑貨」「ギフト」「部品」だけでは説明が曖昧です。素材・用途も教えてください。' })
    );
  }

  card.appendChild(renderField({ id: 'material', path: `items[${index}].material`, label: '主に何の素材でできていますか？', type: 'text', allowUnknown: true }, state, onFieldChange));
  card.appendChild(renderField({ id: 'purpose', path: `items[${index}].purpose`, label: '何に使う商品ですか？', type: 'text', allowUnknown: true }, state, onFieldChange));

  const descField = { id: 'descriptionEn', path: `items[${index}].descriptionEn`, label: '英語の商品説明', why: '税関がこの説明で商品を判断します。具体的に書くほど確認がスムーズです。', type: 'textarea' };
  card.appendChild(renderField(descField, state, onFieldChange));
  if (!hasValue(item.descriptionEn)) {
    const draft = composeDescriptionDraft(item);
    if (draft) {
      card.appendChild(
        el('div', { class: 'suggestion-box' }, [
          el('p', { text: '下書き案（入力済みの情報から合成。翻訳はしていません。内容を確認して編集してください）：' }),
          el('p', { class: 'suggestion-text', text: draft }),
          el(
            'button',
            {
              type: 'button',
              class: 'secondary-btn',
              onclick: () => {
                const updated = { ...state };
                updated.items = updated.items.slice();
                updated.items[index] = { ...item, descriptionEn: setValue(item.descriptionEn, draft, 'suggested', '入力済みの名称・素材・用途から合成') };
                ctx.onChange(updated);
              },
            },
            'この案を使う（提案・要確認）'
          ),
        ])
      );
    }
    card.appendChild(el('p', { class: 'field-note', text: 'AIによる翻訳・説明生成は現在この環境では未設定です。手入力または上の下書き案を編集して進められます。' }));
  }

  const qtyRow = el('div', { class: 'address-grid' });
  qtyRow.appendChild(renderField({ id: 'quantity', path: `items[${index}].quantity`, label: '何個送りますか？', type: 'number' }, state, onFieldChange));
  qtyRow.appendChild(renderField({ id: 'unit', path: `items[${index}].unit`, label: '数える単位は何ですか？', example: '例：pcs、set、kg', type: 'text' }, state, onFieldChange));
  qtyRow.appendChild(
    renderField({ id: 'unitPrice', path: `items[${index}].unitPrice`, label: '1個あたりの価格はいくらですか？', type: 'money', allowUnknown: true }, state, onFieldChange)
  );
  card.appendChild(qtyRow);

  if (state.purpose?.purpose?.value === 'sample' && item.unitPrice?.status === FieldStatus.UNKNOWN) {
    card.appendChild(
      el('p', { class: 'field-warning', text: '無償サンプルでも、書類上の申告価額は「請求しないこと」とは別問題です。価格が不明な場合は0円にせず、確認待ちのままにしています。' })
    );
  }

  card.appendChild(
    renderField(
      { id: 'originCountry', path: `items[${index}].originCountry`, label: 'どの国で作られましたか？', why: '「発送する国」ではなく「製造された国」です。', glossaryKey: 'origin_country', type: 'text' },
      state,
      onFieldChange
    )
  );

  const idRow = el('div', { class: 'address-grid' });
  idRow.appendChild(renderField({ id: 'sku', path: `items[${index}].sku`, label: 'SKU・商品番号', type: 'text', allowNotApplicable: true }, state, onFieldChange));
  idRow.appendChild(
    renderField(
      { id: 'hsCode', path: `items[${index}].hsCode`, label: 'HSコード', glossaryKey: 'hs_code', type: 'text', allowUnknown: true },
      state,
      onFieldChange
    )
  );
  idRow.appendChild(renderField({ id: 'modelSerial', path: `items[${index}].modelSerial`, label: '型番・シリアル番号', type: 'text', allowNotApplicable: true }, state, onFieldChange));
  card.appendChild(idRow);

  if (!hasValue(item.hsCode) || item.hsCode.status !== FieldStatus.CONFIRMED) {
    card.appendChild(
      el('p', { class: 'field-note', text: 'HS分類の自動提案機能は現在利用できません（実装には公式HS品目表データとの照合が必要です）。通関業者・税関相談窓口に確認し、確定したらここに入力してください。' })
    );
  }

  const weightRow = el('div', { class: 'address-grid' });
  weightRow.appendChild(renderField({ id: 'netWeightKg', path: `items[${index}].netWeightKg`, label: 'この商品1個の正味重量（任意）', type: 'number', allowNotApplicable: true }, state, onFieldChange));
  weightRow.appendChild(renderField({ id: 'grossWeightKg', path: `items[${index}].grossWeightKg`, label: 'この商品1個の総重量（任意）', type: 'number', allowNotApplicable: true }, state, onFieldChange));
  card.appendChild(weightRow);

  if (hasValue(item.quantity) && hasValue(item.unitPrice)) {
    const r = calcLineAmount(item.quantity.value, item.unitPrice.value, decimals);
    card.appendChild(
      el('p', { class: 'item-amount', text: r.ok ? `明細金額: ${r.amountStr} ${state.shipping.currency?.value || ''}` : '金額を計算できません（数量・単価を確認してください）' })
    );
  }

  return card;
}

export function renderItemsScreen(state, onChange) {
  const container = el('div', { class: 'items-screen' });
  const list = el('div', { class: 'item-list' });

  const ctx = {
    onChange,
    onDuplicate: (index) => {
      const updated = { ...state };
      updated.items = updated.items.slice();
      const src = updated.items[index];
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      updated.items.splice(index + 1, 0, copy);
      onChange(updated);
    },
    onDelete: (index) => {
      const updated = { ...state };
      updated.items = updated.items.slice();
      updated.items.splice(index, 1);
      onChange(updated);
    },
  };

  (state.items || []).forEach((item, idx) => list.appendChild(renderItemCard(item, idx, state, ctx)));
  container.appendChild(list);

  container.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'primary-btn',
        onclick: () => {
          const updated = { ...state };
          updated.items = updated.items.slice();
          updated.items.push(createItem('item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)));
          onChange(updated);
        },
      },
      '＋ 商品を追加'
    )
  );

  if (!state.items || state.items.length === 0) {
    container.appendChild(el('p', { class: 'field-note', text: '「＋ 商品を追加」から、送る商品を1つずつ登録してください。' }));
  }

  return container;
}
