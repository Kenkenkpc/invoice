// ドメインの共通概念: 「値」と「その値の状態」を分離して保持する。
// これにより 0 や false を「未入力」と誤認しない。

/** @typedef {'unfilled'|'unknown'|'not_applicable'|'filled'|'confirmed'} FieldStatusType */
/** @typedef {'user'|'suggested'} FieldSourceType */

export const FieldStatus = Object.freeze({
  UNFILLED: 'unfilled', // まだ何も答えていない
  UNKNOWN: 'unknown', // 「わからない」を選んだ
  NOT_APPLICABLE: 'not_applicable', // 「該当しない」を選んだ
  FILLED: 'filled', // ユーザーが値を入力した
  CONFIRMED: 'confirmed', // 最終確認などで確認済みとした
});

export const FieldSource = Object.freeze({
  USER: 'user', // ユーザー自身が入力した値
  SUGGESTED: 'suggested', // アプリが提案しただけの値（未確定）
});

/**
 * @template T
 * @typedef {Object} FieldMeta
 * @property {T|null} value
 * @property {FieldStatusType} status
 * @property {FieldSourceType} source
 * @property {string|null} confirmedAt ISO日時。確認済みの場合のみ
 * @property {string} note 自由記述の補足
 * @property {string} basis 提案の根拠や確認の根拠
 */

/** @returns {FieldMeta<any>} */
export function emptyField(initial = null) {
  return {
    value: initial,
    status: FieldStatus.UNFILLED,
    source: FieldSource.USER,
    confirmedAt: null,
    note: '',
    basis: '',
  };
}

/**
 * @param {any} field
 * @param {any} value
 * @param {FieldSourceType} [source]
 * @param {string} [basis]
 */
export function setValue(field, value, source = FieldSource.USER, basis = '') {
  return { ...field, value, status: FieldStatus.FILLED, source, basis: basis || field.basis };
}

export function setUnknown(field, note = '') {
  return { ...field, value: null, status: FieldStatus.UNKNOWN, source: FieldSource.USER, note };
}

export function setNotApplicable(field, note = '') {
  return { ...field, value: null, status: FieldStatus.NOT_APPLICABLE, source: FieldSource.USER, note };
}

export function confirmField(field, basis = '') {
  return {
    ...field,
    status: FieldStatus.CONFIRMED,
    confirmedAt: new Date().toISOString(),
    basis: basis || field.basis,
  };
}

/** 値が実際に入っているか（0 や false も「値あり」として扱う）。 */
export function hasValue(field) {
  if (!field) return false;
  return (
    (field.status === FieldStatus.FILLED || field.status === FieldStatus.CONFIRMED) &&
    field.value !== null &&
    field.value !== undefined &&
    field.value !== ''
  );
}

/** 提出前に人間の確認が必要な状態か（未入力・不明・提案されただけの値）。 */
export function needsResolution(field) {
  if (!field) return true;
  if (field.status === FieldStatus.UNFILLED || field.status === FieldStatus.UNKNOWN) return true;
  if (hasValue(field) && field.source === FieldSource.SUGGESTED && field.status !== FieldStatus.CONFIRMED) {
    return true;
  }
  return false;
}

export const EntityType = Object.freeze({
  COMPANY: 'company',
  INDIVIDUAL: 'individual',
});

export const ExportPurpose = Object.freeze({
  SALE: 'sale',
  QUOTE: 'quote',
  SAMPLE: 'sample',
  REPAIR_RETURN: 'repair_return',
  GIFT: 'gift',
  OTHER: 'other',
  UNKNOWN: 'unknown',
});

export const DocType = Object.freeze({
  COMMERCIAL: 'commercial',
  PROFORMA: 'proforma',
});

export const DocStatus = Object.freeze({
  DRAFT: 'DRAFT',
  FINAL: 'FINAL',
});
