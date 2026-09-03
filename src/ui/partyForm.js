import { el } from './dom.js';
import { getByPath } from '../domain/path.js';
import { renderField } from './fieldControl.js';

/**
 * 送り主・買主・配送先・輸入者で共通の住所入力フォーム。
 * @param {string} partyPath 例: 'exporter'
 * @param {any} state
 * @param {(path:string, field:any, updatedState:any)=>void} onChange
 * @param {{ optionalTaxId?: boolean }} [opts]
 */
export function renderPartyForm(partyPath, state, onChange, opts = {}) {
  const container = el('div', { class: 'party-form' });

  const entityTypeField = {
    id: 'entityType',
    path: `${partyPath}.entityType`,
    label: '法人ですか、個人ですか？',
    type: 'choice',
    options: [
      { value: 'company', label: '法人（会社）' },
      { value: 'individual', label: '個人' },
    ],
  };
  container.appendChild(renderField(entityTypeField, state, onChange));

  const entityType = getByPath(state, `${partyPath}.entityType`)?.value;
  const nameLabel = entityType === 'individual' ? 'お名前を教えてください' : '会社名を教えてください';

  container.appendChild(
    renderField(
      { id: 'nameJa', path: `${partyPath}.nameJa`, label: nameLabel, example: '普段使っている表記のままで構いません', type: 'text' },
      state,
      onChange
    )
  );

  container.appendChild(
    renderField(
      {
        id: 'nameEn',
        path: `${partyPath}.nameEn`,
        label: '英語表記はどう書きますか？',
        why: '正式な英語名は推測で決めません。名刺・登記情報・本人確認などで正しい表記を確認してから入力してください。',
        example: '例：Sample Trading Co., Ltd.',
        type: 'text',
        allowUnknown: true,
      },
      state,
      onChange
    )
  );

  const addressHeading = el('h4', { class: 'subgroup-heading', text: '住所（郵便番号・部屋番号も忘れずに）' });
  container.appendChild(addressHeading);
  container.appendChild(
    el('p', {
      class: 'field-warning',
      text: '住所はすべて英語（ローマ字）で入力してください。ここに入力した内容が、英語の帳票にそのまま印字されます。',
    })
  );

  const addressGrid = el('div', { class: 'address-grid' });
  addressGrid.appendChild(
    renderField({ id: 'postalCode', path: `${partyPath}.postalCode`, label: '郵便番号', type: 'text', example: '例：150-0001' }, state, onChange)
  );
  addressGrid.appendChild(
    renderField(
      { id: 'prefecture', path: `${partyPath}.prefecture`, label: '都道府県（または州）', type: 'text', example: '英語で入力（例：Tokyo）' },
      state,
      onChange
    )
  );
  addressGrid.appendChild(
    renderField({ id: 'city', path: `${partyPath}.city`, label: '市区町村', type: 'text', example: '英語で入力（例：Shibuya-ku）' }, state, onChange)
  );
  addressGrid.appendChild(
    renderField(
      {
        id: 'addressLine',
        path: `${partyPath}.addressLine`,
        label: '番地・建物名・部屋番号',
        type: 'text',
        example: '英語で入力してください。部屋番号やビル名も省略しないでください（例：1-2-3 Sample Bldg 4F）',
      },
      state,
      onChange
    )
  );
  addressGrid.appendChild(
    renderField(
      {
        id: 'country',
        path: `${partyPath}.country`,
        label: '国',
        why: '英語の帳票にそのまま印字されるため、必ず英語で入力してください。',
        example: '例：Japan, USA, France　※「日本」のような日本語は不可',
        type: 'text',
      },
      state,
      onChange
    )
  );
  container.appendChild(addressGrid);

  const contactHeading = el('h4', { class: 'subgroup-heading', text: '連絡先' });
  container.appendChild(contactHeading);
  const contactGrid = el('div', { class: 'address-grid' });
  contactGrid.appendChild(renderField({ id: 'contactName', path: `${partyPath}.contactName`, label: '担当者名', type: 'text', allowNotApplicable: true }, state, onChange));
  contactGrid.appendChild(renderField({ id: 'phone', path: `${partyPath}.phone`, label: '電話番号', type: 'text', allowNotApplicable: true }, state, onChange));
  contactGrid.appendChild(renderField({ id: 'email', path: `${partyPath}.email`, label: 'メールアドレス', type: 'text', allowNotApplicable: true }, state, onChange));
  container.appendChild(contactGrid);

  container.appendChild(
    renderField(
      {
        id: 'taxRegistrationNumber',
        path: `${partyPath}.taxRegistrationNumber`,
        label: '登録番号・税務番号はありますか？',
        why: '必要な場合のみで構いません。わからなければ「わからない」を選んでください。',
        type: 'text',
        allowUnknown: true,
        allowNotApplicable: true,
      },
      state,
      onChange
    )
  );

  return container;
}
