import { el } from './dom.js';
import { setValue, confirmField, FieldSource, FieldStatus } from '../domain/types.js';
import { suggestDocType } from '../rules/docType.js';

export function renderDocTypeScreen(state, onChange) {
  const container = el('div');
  const specified = state.invoice.docTypeSpecifiedByOther?.value;

  if (specified === 'commercial' || specified === 'proforma') {
    container.appendChild(
      el('p', { class: 'field-why', text: `相手・配送会社から「${specified === 'commercial' ? 'Commercial Invoice' : 'Proforma Invoice'}」の指定があると回答されています。指定がある場合は、それに従うのが最も確実です。` })
    );
  } else {
    const s = suggestDocType(state.purpose);
    if (s.candidates.length > 0) {
      container.appendChild(el('p', { class: 'field-why', text: s.guidance }));
      for (const c of s.candidates) {
        container.appendChild(
          el('p', { class: 'field-note', text: `候補: ${c.docType === 'commercial' ? 'Commercial Invoice' : 'Proforma Invoice'}（${c.confidence === 'likely' ? '可能性が高い' : '可能性あり'}）— ${c.reason}` })
        );
      }
    } else {
      container.appendChild(el('p', { class: 'field-why', text: s.guidance }));
    }
  }

  const current = state.invoice.docType;
  const group = el('div', { class: 'choice-group', 'data-field-path': 'invoice.docType' });
  for (const opt of [
    { value: 'commercial', label: 'Commercial Invoice（実際の取引・請求）' },
    { value: 'proforma', label: 'Proforma Invoice（見積り・仮の書類）' },
  ]) {
    const active = current.status === FieldStatus.CONFIRMED && current.value === opt.value;
    group.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'choice-btn' + (active ? ' active' : ''),
          onclick: () => {
            const updated = { ...state };
            const basis = specified === opt.value ? '相手・配送会社からの指定に従って確定' : 'ユーザーが選択して確定';
            updated.invoice = { ...state.invoice, docType: confirmField(setValue(current, opt.value, FieldSource.USER), basis) };
            onChange(updated);
          },
        },
        opt.label
      )
    );
  }
  container.appendChild(group);

  if (current.status === FieldStatus.CONFIRMED) {
    container.appendChild(el('p', { class: 'status-pill status-confirmed', text: '確認済み: ' + (current.value === 'commercial' ? 'Commercial Invoice' : 'Proforma Invoice') }));
  } else {
    container.appendChild(el('p', { class: 'field-warning', text: 'まだ確定していません。下書きの作成・保存は今のまま進められます。' }));
  }

  return container;
}
