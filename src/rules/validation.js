import { FieldStatus, FieldSource, hasValue, needsResolution } from '../domain/types.js';
import { parseDecimalToFixed, calcLineAmount, defaultDecimalsForCurrency } from '../domain/money.js';

/**
 * 入力チェックは3種類に分ける。
 * - format: 形式・計算エラー（数値でない価格、負の数量、日付形式の誤りなど）
 * - missing: 必要情報の不足（宛先・商品説明・通貨など）
 * - external: 外部確認が必要な事項（書類種類、分類、取引条件など）
 */
const CATEGORY = Object.freeze({ FORMAT: 'format', MISSING: 'missing', EXTERNAL: 'external' });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// ひらがな・カタカナ・漢字（CJK統合漢字）を含むかどうか。英語の帳票にそのまま印字される
// 国名などに日本語が残っていないかを検知するために使う。
const JAPANESE_CHAR_RE = /[぀-ヿ㐀-鿿]/;

function containsJapanese(value) {
  return typeof value === 'string' && JAPANESE_CHAR_RE.test(value);
}

function issue(list, category, id, screenId, fieldPath, message, opts = {}) {
  list.push({
    id,
    category,
    screenId,
    fieldPath,
    message,
    guidance: opts.guidance || '',
    blocksFinal: opts.blocksFinal !== false, // 既定では最終版発行をブロックする
  });
}

function checkPartyRequired(list, party, label, screenId, pathPrefix) {
  const nameField = party.entityType?.value === 'individual' ? party.nameJa : party.nameJa;
  if (!hasValue(party.entityType)) {
    issue(list, CATEGORY.MISSING, `${pathPrefix}.entityType`, screenId, `${pathPrefix}.entityType`, `${label}：法人か個人かが未入力です。`);
  }
  if (!hasValue(nameField)) {
    issue(list, CATEGORY.MISSING, `${pathPrefix}.name`, screenId, `${pathPrefix}.nameJa`, `${label}：名称が未入力です。`);
  }
  if (party.nameEn && hasValue(party.nameEn) && party.nameEn.source === FieldSource.SUGGESTED && party.nameEn.status !== FieldStatus.CONFIRMED) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      `${pathPrefix}.nameEn.unconfirmed`,
      screenId,
      `${pathPrefix}.nameEn`,
      `${label}：英語表記案がまだ確認されていません。`,
      { guidance: '正式な英語表記を、本人・登記情報・名刺などで確認してください。' }
    );
  }
  for (const [key, jaLabel] of [
    ['postalCode', '郵便番号'],
    ['prefecture', '都道府県'],
    ['city', '市区町村'],
    ['addressLine', '番地・建物名'],
    ['country', '国'],
  ]) {
    if (!hasValue(party[key])) {
      issue(
        list,
        CATEGORY.MISSING,
        `${pathPrefix}.${key}`,
        screenId,
        `${pathPrefix}.${key}`,
        `${label}：${jaLabel}が未入力です。`
      );
    }
  }
  if (hasValue(party.country) && containsJapanese(party.country.value)) {
    issue(
      list,
      CATEGORY.FORMAT,
      `${pathPrefix}.country.language`,
      screenId,
      `${pathPrefix}.country`,
      `${label}：国名が日本語のままです。英語の帳票にそのまま印字されるため、英語（例：Japan, USA）で入力し直してください。`
    );
  }
}

/**
 * 入力全体を検査し、3分類の問題点と未解決事項一覧、DRAFT/FINAL判定を返す。
 * @param {any} state createInitialState() が返す状態オブジェクト
 */
export function computeChecks(state) {
  /** @type {Array<any>} */
  const list = [];

  // --- 目的・書類種類 ---
  if (!hasValue(state.invoice.docType) || state.invoice.docType.status !== FieldStatus.CONFIRMED) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      'invoice.docType',
      'purpose',
      'invoice.docType',
      '作成する書類の種類（Commercial / Proforma）が確定していません。',
      { guidance: '提出先・配送会社に必要な書類の種類を確認してください。' }
    );
  }

  if (hasValue(state.invoice.invoiceDate) && !DATE_RE.test(state.invoice.invoiceDate.value)) {
    issue(list, CATEGORY.FORMAT, 'invoice.invoiceDate.format', 'invoiceMeta', 'invoice.invoiceDate', '発行日の形式が正しくありません（YYYY-MM-DD）。');
  }
  if (!hasValue(state.invoice.invoiceNumber)) {
    issue(list, CATEGORY.MISSING, 'invoice.invoiceNumber', 'invoiceMeta', 'invoice.invoiceNumber', '請求書番号が未入力です。');
  }
  if (!hasValue(state.invoice.invoiceDate)) {
    issue(list, CATEGORY.MISSING, 'invoice.invoiceDate', 'invoiceMeta', 'invoice.invoiceDate', '発行日が未入力です。');
  }
  if (state.invoice.docType?.value === 'proforma' && hasValue(state.invoice.validUntil) && !DATE_RE.test(state.invoice.validUntil.value)) {
    issue(list, CATEGORY.FORMAT, 'invoice.validUntil.format', 'invoiceMeta', 'invoice.validUntil', '見積有効期限の形式が正しくありません（YYYY-MM-DD）。');
  }
  if (hasValue(state.purpose.destinationCountry) && containsJapanese(state.purpose.destinationCountry.value)) {
    issue(
      list,
      CATEGORY.FORMAT,
      'purpose.destinationCountry.language',
      'purposeDetails',
      'purpose.destinationCountry',
      '送り先の国名が日本語のままです。英語の帳票にそのまま印字されるため、英語（例：USA, France, Thailand）で入力し直してください。'
    );
  }

  // --- 送り主 ---
  checkPartyRequired(list, state.exporter, '送り主', 'exporter', 'exporter');
  if (!hasValue(state.exporter.email) && !hasValue(state.exporter.phone)) {
    issue(list, CATEGORY.MISSING, 'exporter.contact', 'exporter', 'exporter.email', '送り主：連絡先（電話またはメール）が未入力です。');
  }

  // --- 買主 ---
  checkPartyRequired(list, state.buyer, '買主', 'buyer', 'buyer');

  // --- 配送先 ---
  if (state.shipToSameAsBuyer.status === FieldStatus.UNKNOWN) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      'shipTo.unknown',
      'shipTo',
      'shipToSameAsBuyer',
      '配送先が買主と同じか不明なままです。',
      { guidance: '買主に配送先住所を確認してください。' }
    );
  } else if (!hasValue(state.shipToSameAsBuyer)) {
    issue(
      list,
      CATEGORY.MISSING,
      'shipTo.same',
      'shipTo',
      'shipToSameAsBuyer',
      '配送先が買主と同じかどうかが未回答です。'
    );
  } else if (state.shipToSameAsBuyer.value === false) {
    checkPartyRequired(list, state.shipTo, '配送先', 'shipTo', 'shipTo');
  }

  // --- 輸入者 ---
  if (state.importerSameAsBuyer.status === FieldStatus.UNKNOWN) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      'importer.unknown',
      'importer',
      'importerSameAsBuyer',
      '輸入者が買主と同じか不明なままです（自動的に買主と同一にはしていません）。',
      { guidance: '買主に「通関の輸入者は誰になるか」を確認してください。' }
    );
  } else if (!hasValue(state.importerSameAsBuyer)) {
    issue(
      list,
      CATEGORY.MISSING,
      'importer.same',
      'importer',
      'importerSameAsBuyer',
      '輸入者が買主と同じかどうかが未回答です。'
    );
  } else if (state.importerSameAsBuyer.value === false) {
    checkPartyRequired(list, state.importer, '輸入者', 'importer', 'importer');
  }

  // --- 商品 ---
  if (!state.items || state.items.length === 0) {
    issue(list, CATEGORY.MISSING, 'items.empty', 'items', 'items', '商品が1件も登録されていません。');
  }
  const currency = state.shipping.currency?.value;
  const decimals = hasValue(state.shipping.currencyDecimals)
    ? state.shipping.currencyDecimals.value
    : defaultDecimalsForCurrency(currency);

  (state.items || []).forEach((item, idx) => {
    const no = idx + 1;
    const path = `items[${idx}]`;
    if (!hasValue(item.descriptionEn) && !hasValue(item.name)) {
      issue(list, CATEGORY.MISSING, `${path}.description`, 'items', `${path}.descriptionEn`, `商品${no}：商品説明が未入力です。`);
    }
    if (!hasValue(item.originCountry)) {
      issue(list, CATEGORY.MISSING, `${path}.origin`, 'items', `${path}.originCountry`, `商品${no}：原産国が未入力です。`);
    }
    if (!hasValue(item.unit)) {
      issue(list, CATEGORY.MISSING, `${path}.unit`, 'items', `${path}.unit`, `商品${no}：数量の単位が未入力です。`);
    }
    if (!hasValue(item.quantity)) {
      issue(list, CATEGORY.MISSING, `${path}.quantity`, 'items', `${path}.quantity`, `商品${no}：数量が未入力です。`);
    } else if (parseDecimalToFixed(item.quantity.value, 4) === null || Number(item.quantity.value) <= 0) {
      issue(list, CATEGORY.FORMAT, `${path}.quantity.format`, 'items', `${path}.quantity`, `商品${no}：数量が数値として正しくありません（0より大きい数値）。`);
    }
    if (item.unitPrice?.status === FieldStatus.UNKNOWN) {
      issue(
        list,
        CATEGORY.EXTERNAL,
        `${path}.price.unknown`,
        'items',
        `${path}.unitPrice`,
        `商品${no}：単価が未確定です（確認待ち）。`,
        { guidance: '無償サンプルでも申告価額はゼロと同じではありません。取引先や配送会社に確認してください。' }
      );
    } else if (!hasValue(item.unitPrice)) {
      issue(list, CATEGORY.MISSING, `${path}.price`, 'items', `${path}.unitPrice`, `商品${no}：単価が未入力です。`);
    } else if (parseDecimalToFixed(item.unitPrice.value, 4) === null || Number(item.unitPrice.value) < 0) {
      issue(list, CATEGORY.FORMAT, `${path}.price.format`, 'items', `${path}.unitPrice`, `商品${no}：単価が数値として正しくありません（0以上、小数4桁以内）。`);
    }
    if (hasValue(item.quantity) && hasValue(item.unitPrice)) {
      const r = calcLineAmount(item.quantity.value, item.unitPrice.value, decimals);
      if (!r.ok) {
        issue(list, CATEGORY.FORMAT, `${path}.amount.format`, 'items', `${path}`, `商品${no}：金額が計算できません（数量・単価を確認してください）。`);
      }
    }
    if (!hasValue(item.hsCode)) {
      issue(
        list,
        CATEGORY.EXTERNAL,
        `${path}.hsCode`,
        'items',
        `${path}.hsCode`,
        `商品${no}：HSコードが未確認です。`,
        { guidance: '通関業者・配送会社にHSコードの確認を依頼してください。' }
      );
    }
  });

  // --- 通貨・支払い・配送条件 ---
  if (!hasValue(state.shipping.currency)) {
    issue(list, CATEGORY.MISSING, 'shipping.currency', 'terms', 'shipping.currency', '通貨が未入力です。');
  } else {
    const expected = defaultDecimalsForCurrency(state.shipping.currency.value);
    if (hasValue(state.shipping.currencyDecimals) && state.shipping.currencyDecimals.value !== expected) {
      issue(
        list,
        CATEGORY.FORMAT,
        'shipping.currencyDecimals.mismatch',
        'terms',
        'shipping.currencyDecimals',
        `通貨（${state.shipping.currency.value}）と小数桁の設定が一致していません。`,
        { blocksFinal: false }
      );
    }
  }
  if (!hasValue(state.shipping.paymentTerms)) {
    issue(list, CATEGORY.MISSING, 'shipping.paymentTerms', 'terms', 'shipping.paymentTerms', '支払い条件が未入力です。');
  }
  if (!hasValue(state.shipping.freightIncludedInPrice)) {
    issue(list, CATEGORY.MISSING, 'shipping.freightIncludedInPrice', 'terms', 'shipping.freightIncludedInPrice', '配送費が商品価格に含まれているかが未回答です。');
  }
  if (!hasValue(state.shipping.incotermCode) || state.shipping.incotermCode.status === FieldStatus.UNKNOWN) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      'shipping.incoterm',
      'terms',
      'shipping.incotermCode',
      '貿易条件（Incoterms）が確定していません。',
      { guidance: '送料・関税の負担について、相手と合意した内容を確認してください。' }
    );
  }
  for (const [key, label] of [
    ['freight', '運賃'],
    ['insurance', '保険料'],
    ['other', 'その他費用'],
  ]) {
    const field = state.charges[key];
    if (hasValue(field) && Number(field.value) < 0) {
      issue(list, CATEGORY.FORMAT, `charges.${key}.negative`, 'terms', `charges.${key}`, `${label}が負の値になっています。`);
    }
  }

  // --- 梱包・発送 ---
  if (!hasValue(state.packing.numberOfPackages)) {
    issue(list, CATEGORY.MISSING, 'packing.numberOfPackages', 'packing', 'packing.numberOfPackages', '箱数が未入力です。');
  } else if (Number(state.packing.numberOfPackages.value) <= 0) {
    issue(list, CATEGORY.FORMAT, 'packing.numberOfPackages.format', 'packing', 'packing.numberOfPackages', '箱数は1以上の数値で入力してください。');
  }
  if (!hasValue(state.packing.netWeightKg)) {
    issue(list, CATEGORY.MISSING, 'packing.netWeightKg', 'packing', 'packing.netWeightKg', '正味重量が未入力です。');
  }
  if (!hasValue(state.packing.grossWeightKg)) {
    issue(list, CATEGORY.MISSING, 'packing.grossWeightKg', 'packing', 'packing.grossWeightKg', '総重量が未入力です。');
  }
  if (hasValue(state.packing.netWeightKg) && hasValue(state.packing.grossWeightKg)) {
    if (Number(state.packing.grossWeightKg.value) < Number(state.packing.netWeightKg.value)) {
      issue(list, CATEGORY.FORMAT, 'packing.weight.inconsistent', 'packing', 'packing.grossWeightKg', '総重量が正味重量より小さくなっています。');
    }
  }
  if (state.invoice.docType?.value === 'commercial' && !hasValue(state.packing.trackingNumber)) {
    issue(
      list,
      CATEGORY.EXTERNAL,
      'packing.trackingNumber',
      'packing',
      'packing.trackingNumber',
      '配送会社・追跡番号が未確定です。',
      { guidance: '発送手配後に配送会社から確認してください。', blocksFinal: false }
    );
  }

  const blocking = list.filter((i) => i.blocksFinal);
  return {
    all: list,
    formatErrors: list.filter((i) => i.category === CATEGORY.FORMAT),
    missingRequired: list.filter((i) => i.category === CATEGORY.MISSING),
    externalChecks: list.filter((i) => i.category === CATEGORY.EXTERNAL),
    blocking,
    isDraftForced: blocking.length > 0,
  };
}

export { CATEGORY as ValidationCategory };
