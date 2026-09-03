import { el } from './dom.js';
import { setValue, setUnknown, FieldSource, FieldStatus } from '../domain/types.js';
import { renderPartyForm } from './partyForm.js';

/**
 * 「買主と同じ／違う／まだ分からない」の分岐＋必要な場合のみ住所フォームを表示する。
 * @param {{sameKey:string, partyPath:string, question:string, explanation?:string, differentLabel:string, unknownNotice?:string}} opts
 */
export function renderSameAsBuyerBranch(opts, state, onChange) {
  const container = el('div');
  if (opts.explanation) container.appendChild(el('p', { class: 'field-why', text: opts.explanation }));

  const sameField = state[opts.sameKey];
  const group = el('div', { class: 'choice-group' });
  const choices = [
    { value: 'true', label: '同じ' },
    { value: 'false', label: '違う' },
    { value: 'unknown', label: 'まだ分からない' },
  ];
  for (const c of choices) {
    const isActive =
      (c.value === 'unknown' && sameField.status === FieldStatus.UNKNOWN) ||
      (c.value !== 'unknown' && sameField.status === FieldStatus.FILLED && String(sameField.value) === c.value);
    group.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'choice-btn' + (isActive ? ' active' : ''),
          onclick: () => {
            const updated = { ...state };
            if (c.value === 'unknown') {
              updated[opts.sameKey] = setUnknown(sameField);
            } else {
              updated[opts.sameKey] = setValue(sameField, c.value === 'true', FieldSource.USER);
            }
            onChange(updated);
          },
        },
        c.label
      )
    );
  }
  container.appendChild(el('label', { class: 'field-label', text: opts.question }));
  container.appendChild(group);

  if (sameField.status === FieldStatus.UNKNOWN) {
    container.appendChild(
      el('p', { class: 'field-warning', text: opts.unknownNotice || 'わからないままでは自動的に確定しません。相手に確認してください。' })
    );
  }

  if (sameField.status === FieldStatus.FILLED && sameField.value === false) {
    container.appendChild(el('h3', { class: 'subgroup-heading', text: opts.differentLabel }));
    container.appendChild(renderPartyForm(opts.partyPath, state, (path, field, updated) => onChange(updated)));
  }

  return container;
}
