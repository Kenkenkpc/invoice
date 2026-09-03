import { el } from './dom.js';
import { getByPath, setByPath } from '../domain/path.js';
import { FieldStatus, FieldSource, emptyField, setValue, setUnknown, setNotApplicable } from '../domain/types.js';
import { glossaryEntry } from '../rules/glossary.js';
import { INCOTERMS_2020, INCOTERMS_SOURCE } from '../rules/incoterms.js';

function getField(state, path) {
  const f = getByPath(state, path);
  return f || emptyField();
}

function statusLabel(status) {
  switch (status) {
    case FieldStatus.UNFILLED:
      return { text: '未入力', cls: 'status-unfilled' };
    case FieldStatus.UNKNOWN:
      return { text: 'わからない（確認待ち）', cls: 'status-unknown' };
    case FieldStatus.NOT_APPLICABLE:
      return { text: '該当しない', cls: 'status-na' };
    case FieldStatus.FILLED:
      return { text: '入力済み', cls: 'status-filled' };
    case FieldStatus.CONFIRMED:
      return { text: '確認済み', cls: 'status-confirmed' };
    default:
      return { text: '', cls: '' };
  }
}

function optionsForField(fieldDef) {
  if (fieldDef.optionsFrom === 'incoterms') {
    return INCOTERMS_2020.map((t) => ({ value: t.code, label: `${t.code} - ${t.ja}（${t.name}）` }));
  }
  return fieldDef.options || [];
}

/**
 * 1つの質問（フィールド）を丸ごとDOMとして描画する。
 * @param {any} fieldDef rules/screens.js の FieldDef
 * @param {any} state
 * @param {(path:string, field:any, updatedState:any)=>void} onChange 値が変わったら state を更新して呼ばれる
 */
export function renderField(fieldDef, state, onChange) {
  const field = getField(state, fieldDef.path);
  const wrap = el('div', { class: 'field' });
  const inputId = 'f-' + fieldDef.path.replace(/[^a-zA-Z0-9]/g, '-');

  wrap.appendChild(el('label', { class: 'field-label', for: fieldDef.type === 'choice' ? null : inputId, text: fieldDef.label }));
  if (fieldDef.why) wrap.appendChild(el('p', { class: 'field-why', text: fieldDef.why }));
  if (fieldDef.example) wrap.appendChild(el('p', { class: 'field-example', text: fieldDef.example }));

  if (fieldDef.glossaryKey) {
    const g = glossaryEntry(fieldDef.glossaryKey);
    if (g) {
      const details = el('details', { class: 'glossary' }, [
        el('summary', { text: '詳しく見る：' + g.term }),
        el('p', { text: g.explanation }),
      ]);
      wrap.appendChild(details);
    }
  }

  const applyUpdate = (newField) => {
    const updated = { ...state };
    setByPath(updated, fieldDef.path, newField);
    onChange(fieldDef.path, newField, updated);
  };

  const controlBox = el('div', { class: 'field-control' });

  const commit = (rawValue) => {
    let value = rawValue;
    if (fieldDef.boolean) value = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;
    applyUpdate(setValue(field, value, FieldSource.USER));
  };

  switch (fieldDef.type) {
    case 'choice': {
      const group = el('div', { class: 'choice-group', role: 'radiogroup', 'aria-label': fieldDef.label });
      for (const opt of optionsForField(fieldDef)) {
        const isActive =
          field.status === FieldStatus.FILLED &&
          (fieldDef.boolean ? String(field.value) === opt.value : field.value === opt.value);
        group.appendChild(
          el(
            'button',
            {
              type: 'button',
              class: 'choice-btn' + (isActive ? ' active' : ''),
              'aria-pressed': isActive ? 'true' : 'false',
              onclick: () => commit(opt.value),
            },
            opt.label
          )
        );
      }
      controlBox.appendChild(group);
      break;
    }
    case 'select': {
      const select = el('select', {
        class: 'select-input',
        id: inputId,
        'data-field-path': fieldDef.path,
        onchange: (e) => commit(e.target.value),
      });
      select.appendChild(el('option', { value: '' }, '選択してください'));
      for (const opt of optionsForField(fieldDef)) {
        select.appendChild(
          el('option', { value: opt.value, selected: field.value === opt.value || null }, opt.label)
        );
      }
      controlBox.appendChild(select);
      if (fieldDef.optionsFrom === 'incoterms') {
        controlBox.appendChild(el('p', { class: 'field-source-note', text: '出典：' + INCOTERMS_SOURCE }));
      }
      break;
    }
    case 'textarea': {
      const ta = /** @type {HTMLTextAreaElement} */ (el('textarea', {
        class: 'text-input',
        rows: '3',
        id: inputId,
        'data-field-path': fieldDef.path,
        onchange: (e) => commit(e.target.value),
      }));
      ta.value = field.value || '';
      controlBox.appendChild(ta);
      break;
    }
    case 'money': {
      const input = /** @type {HTMLInputElement} */ (el('input', {
        class: 'text-input',
        type: 'text',
        inputmode: 'decimal',
        placeholder: '例：1500',
        id: inputId,
        'data-field-path': fieldDef.path,
        onchange: (e) => commit(e.target.value.trim()),
      }));
      input.value = field.value ?? '';
      controlBox.appendChild(input);
      break;
    }
    case 'number': {
      const input = /** @type {HTMLInputElement} */ (el('input', {
        class: 'text-input',
        type: 'text',
        inputmode: 'decimal',
        id: inputId,
        'data-field-path': fieldDef.path,
        onchange: (e) => commit(e.target.value.trim()),
      }));
      input.value = field.value ?? '';
      controlBox.appendChild(input);
      break;
    }
    case 'text':
    default: {
      const input = /** @type {HTMLInputElement} */ (el('input', {
        class: 'text-input',
        type: 'text',
        id: inputId,
        'data-field-path': fieldDef.path,
        onchange: (e) => commit(e.target.value),
      }));
      input.value = field.value ?? '';
      controlBox.appendChild(input);
      break;
    }
  }

  wrap.appendChild(controlBox);

  const metaRow = el('div', { class: 'field-meta' });
  const st = statusLabel(field.status);
  if (field.status !== FieldStatus.UNFILLED) {
    metaRow.appendChild(el('span', { class: 'status-pill ' + st.cls, text: st.text }));
    if (field.source === FieldSource.SUGGESTED) {
      metaRow.appendChild(el('span', { class: 'status-pill status-suggested', text: '提案（未確認）' }));
    }
  }

  const btnRow = el('div', { class: 'field-actions' });
  if (fieldDef.allowUnknown) {
    btnRow.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'link-btn' + (field.status === FieldStatus.UNKNOWN ? ' active' : ''),
          onclick: () => applyUpdate(setUnknown(field)),
        },
        'わからない／まだ決まっていない'
      )
    );
  }
  if (fieldDef.allowNotApplicable) {
    btnRow.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'link-btn' + (field.status === FieldStatus.NOT_APPLICABLE ? ' active' : ''),
          onclick: () => applyUpdate(setNotApplicable(field)),
        },
        '該当しない'
      )
    );
  }
  if (fieldDef.confirmGuidance) {
    wrap.appendChild(el('p', { class: 'field-confirm-guidance', text: '確認先の案内：' + fieldDef.confirmGuidance }));
  }

  wrap.appendChild(metaRow);
  if (btnRow.children.length) wrap.appendChild(btnRow);

  return wrap;
}
