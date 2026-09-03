// 質問の定義・分岐・画面テーマを1箇所に集約する。
// UIコード（src/ui/*）はここを読んで描画するだけにし、文言・分岐ロジックを画面側に散らさない。
import { ExportPurpose } from '../domain/types.js';

/** 帳票・確認画面に表示するための、目的コードの英語ラベル。 */
export const PURPOSE_EN_LABEL = Object.freeze({
  [ExportPurpose.SALE]: 'Sale of goods',
  [ExportPurpose.QUOTE]: 'Quotation',
  [ExportPurpose.SAMPLE]: 'Sample',
  [ExportPurpose.REPAIR_RETURN]: 'Repair / Return',
  [ExportPurpose.GIFT]: 'Gift',
  [ExportPurpose.OTHER]: 'Other',
  [ExportPurpose.UNKNOWN]: '',
});

/** 確認画面に表示するための、目的コードの日本語ラベル。 */
export const PURPOSE_JA_LABEL = Object.freeze({
  [ExportPurpose.SALE]: '販売した商品を送る',
  [ExportPurpose.QUOTE]: '購入前の見積書を作りたい',
  [ExportPurpose.SAMPLE]: '無料サンプルを送る',
  [ExportPurpose.REPAIR_RETURN]: '修理・返品のために送る',
  [ExportPurpose.GIFT]: '贈り物を送る',
  [ExportPurpose.OTHER]: 'その他',
  [ExportPurpose.UNKNOWN]: 'わからない',
});

export function purposeEnLabel(code) {
  return (code && PURPOSE_EN_LABEL[code]) || '';
}
export function purposeJaLabel(code) {
  return (code && PURPOSE_JA_LABEL[code]) || String(code || '');
}

/**
 * @typedef {Object} FieldDef
 * @property {string} id
 * @property {string} path 状態オブジェクトへのドットパス
 * @property {string} label 普段の言葉で書いた質問
 * @property {string} [why] なぜ必要かの短い説明
 * @property {string} [example] 入力例
 * @property {'choice'|'text'|'textarea'|'number'|'boolean3'|'money'|'select'} type
 * @property {Array<{value:string, label:string}>} [options]
 * @property {boolean} [allowUnknown] "わからない"を許可
 * @property {boolean} [allowNotApplicable] "該当しない"を許可
 * @property {string} [glossaryKey] 詳しく見る、に表示する用語解説キー
 * @property {string} [confirmGuidance] 誰に何を確認すればよいか
 * @property {(state:any)=>boolean} [visibleIf]
 */

export const SCREENS = [
  {
    id: 'purpose',
    title: '今回は、どんな目的で商品を海外へ送りますか？',
    subtitle: '目的によって、作る書類の種類（Commercial Invoice / Proforma Invoice）の候補が変わります。',
    fields: [
      {
        id: 'purpose',
        path: 'purpose.purpose',
        label: 'どんな目的で商品を海外へ送りますか？',
        type: 'choice',
        options: [
          { value: ExportPurpose.SALE, label: '販売した商品を送る' },
          { value: ExportPurpose.QUOTE, label: '購入前の見積書を作りたい' },
          { value: ExportPurpose.SAMPLE, label: '無料サンプルを送る' },
          { value: ExportPurpose.REPAIR_RETURN, label: '修理・返品のために送る' },
          { value: ExportPurpose.GIFT, label: '贈り物を送る' },
          { value: ExportPurpose.OTHER, label: 'その他' },
        ],
        allowUnknown: true,
      },
    ],
  },
  {
    id: 'purposeDetails',
    title: 'もう少し教えてください',
    subtitle: '書類の候補を絞り込むための追加の質問です。わからない項目は飛ばせます。',
    fields: [
      {
        id: 'willShip',
        path: 'purpose.willShip',
        label: '実際に商品を発送する予定はありますか？',
        why: 'まだ発送しない場合は、見積り用のProforma Invoiceが使われることが多いためです。',
        type: 'choice',
        boolean: true,
        options: [
          { value: 'true', label: 'はい、発送する予定です' },
          { value: 'false', label: 'いいえ、まだ発送しません' },
        ],
        allowUnknown: true,
      },
      {
        id: 'docTypeSpecifiedByOther',
        path: 'invoice.docTypeSpecifiedByOther',
        label: '相手や配送会社から、書類の種類を指定されていますか？',
        why: '指定がある場合は、それに従うのが最も確実です。',
        type: 'choice',
        options: [
          { value: 'commercial', label: 'Commercial Invoiceを指定された' },
          { value: 'proforma', label: 'Proforma Invoiceを指定された' },
          { value: 'none', label: '指定はない' },
        ],
        allowUnknown: true,
      },
      {
        id: 'destinationCountry',
        path: 'purpose.destinationCountry',
        label: 'どの国へ送りますか？',
        type: 'text',
        example: '例：アメリカ、フランス、タイ',
        allowUnknown: true,
      },
      {
        id: 'carrierDecided',
        path: 'purpose.carrierName',
        label: '配送会社は決まっていますか？',
        example: '例：DHL、FedEx、日本郵便（EMS）',
        type: 'text',
        allowUnknown: true,
        allowNotApplicable: true,
      },
    ],
  },
  {
    id: 'docType',
    title: 'どちらの書類を作りますか？',
    subtitle: 'ここまでの回答から候補を示します。最終的にどちらにするかは、あなた自身が選んで確定してください。',
    custom: 'docType',
    fields: [],
  },
  {
    id: 'exporter',
    title: '商品を送る会社、またはあなたの情報を教えてください',
    subtitle: 'この情報は「送り主（Exporter / Seller）」として帳票に印字されます。',
    custom: 'party',
    partyPath: 'exporter',
    fields: [],
  },
  {
    id: 'buyer',
    title: '誰が商品を購入しましたか？',
    subtitle: '買主（Buyer）の情報です。届け先が別にある場合は次の画面で聞きます。',
    custom: 'party',
    partyPath: 'buyer',
    fields: [],
  },
  {
    id: 'shipTo',
    title: '商品を届ける住所は、購入した方の住所と同じですか？',
    subtitle: '配送先（Ship To / Consignee）が買主と異なる場合だけ、追加で住所を入力します。',
    custom: 'shipTo',
    fields: [],
  },
  {
    id: 'importer',
    title: '輸入の手続きをするのは誰ですか？',
    subtitle:
      '輸入者（Importer）は、輸入国で通関手続きを行う責任者です。買主・配送先と同じとは限りません。わからない場合は「わからない」を選んでください（自動的に買主と同じにはしません）。',
    custom: 'importer',
    fields: [],
  },
  {
    id: 'items',
    title: '何を送りますか？',
    subtitle: '商品を1つずつカードで追加してください。複製や削除もできます。',
    custom: 'items',
    fields: [],
  },
  {
    id: 'terms',
    title: '支払いと配送の約束について教えてください',
    subtitle: '専門用語がわからなくても大丈夫です。実際に決めた・約束した内容を教えてください。',
    fields: [
      {
        id: 'currency',
        path: 'shipping.currency',
        label: '金額はどの通貨ですか？',
        type: 'select',
        options: [
          { value: 'JPY', label: '日本円（JPY）' },
          { value: 'USD', label: '米ドル（USD）' },
          { value: 'EUR', label: 'ユーロ（EUR）' },
          { value: 'GBP', label: '英ポンド（GBP）' },
          { value: 'OTHER', label: 'その他' },
        ],
      },
      {
        id: 'paymentTerms',
        path: 'shipping.paymentTerms',
        label: '相手はいつ、どのように支払いますか？',
        example: '例：発送前に全額振込、PayPalで先払い、L/C（信用状）',
        type: 'text',
        allowUnknown: true,
      },
      {
        id: 'freightIncludedInPrice',
        path: 'shipping.freightIncludedInPrice',
        label: '配送費は商品価格に含まれていますか？',
        why: '含まれている場合、後の質問で入力する追加運賃は合計に加算しません（二重請求を防ぐためです）。',
        type: 'choice',
        boolean: true,
        options: [
          { value: 'true', label: 'はい、含まれています' },
          { value: 'false', label: 'いいえ、別途請求します' },
        ],
        allowUnknown: true,
      },
      {
        id: 'freight',
        path: 'charges.freight',
        label: '商品代とは別に請求する配送費はありますか？',
        type: 'money',
        allowNotApplicable: true,
        visibleIf: (s) => s.shipping.freightIncludedInPrice?.value !== true,
      },
      {
        id: 'insurance',
        path: 'charges.insurance',
        label: '保険料はありますか？',
        type: 'money',
        allowNotApplicable: true,
      },
      {
        id: 'other',
        path: 'charges.other',
        label: 'その他の費用はありますか？',
        type: 'money',
        allowNotApplicable: true,
      },
      {
        id: 'incoterm',
        path: 'shipping.incotermCode',
        label: '送料や輸入時の税金の負担について、相手と何か約束していますか？',
        why: 'この約束はIncoterms（インコタームズ）という国際ルールの記号で表すことが多いです。合意がなければ「わからない」で構いません。',
        type: 'select',
        glossaryKey: 'incoterms',
        allowUnknown: true,
        optionsFrom: 'incoterms',
      },
      {
        id: 'incotermPlace',
        path: 'shipping.incotermPlace',
        label: 'その条件の「指定地」はどこですか？',
        example: '例：Tokyo, Japan',
        type: 'text',
        allowUnknown: true,
        visibleIf: (s) => !!s.shipping.incotermCode?.value,
      },
    ],
  },
  {
    id: 'packing',
    title: '梱包と発送予定について教えてください',
    subtitle: '',
    fields: [
      {
        id: 'numberOfPackages',
        path: 'packing.numberOfPackages',
        label: '全部で何箱送りますか？',
        why: '同じ箱に複数の商品が入っていても、箱数は商品ごとに足し算しません。',
        type: 'number',
      },
      {
        id: 'netWeightKg',
        path: 'packing.netWeightKg',
        label: '中身だけの重さは何kgですか？',
        glossaryKey: 'net_weight',
        type: 'number',
        allowUnknown: true,
      },
      {
        id: 'grossWeightKg',
        path: 'packing.grossWeightKg',
        label: '箱や緩衝材を含めた重さは何kgですか？',
        glossaryKey: 'gross_weight',
        type: 'number',
        allowUnknown: true,
      },
      {
        id: 'shipDate',
        path: 'packing.shipDate',
        label: 'いつ発送しますか？',
        type: 'text',
        example: 'YYYY-MM-DD',
        allowUnknown: true,
      },
      {
        id: 'carrier',
        path: 'packing.carrier',
        label: '配送会社は決まっていますか？',
        type: 'text',
        allowUnknown: true,
      },
      {
        id: 'trackingNumber',
        path: 'packing.trackingNumber',
        label: '追跡番号は決まっていますか？',
        why: 'Proformaを作る段階では、まだ決まっていなくて構いません。',
        type: 'text',
        allowUnknown: true,
        allowNotApplicable: true,
      },
    ],
  },
  {
    id: 'invoiceMeta',
    title: '書類の基本情報を入力してください',
    subtitle: '',
    fields: [
      {
        id: 'invoiceNumber',
        path: 'invoice.invoiceNumber',
        label: '請求書番号を決めてください',
        example: '例：INV-2026-001',
        type: 'text',
      },
      {
        id: 'invoiceDate',
        path: 'invoice.invoiceDate',
        label: '発行日はいつですか？',
        type: 'text',
        example: 'YYYY-MM-DD',
      },
      {
        id: 'poNumber',
        path: 'invoice.poNumber',
        label: '注文番号（PO番号）はありますか？',
        type: 'text',
        allowNotApplicable: true,
      },
      {
        id: 'validUntil',
        path: 'invoice.validUntil',
        label: 'この見積りはいつまで有効ですか？',
        type: 'text',
        example: 'YYYY-MM-DD',
        allowUnknown: true,
        visibleIf: (s) => s.invoice.docType?.value === 'proforma',
      },
    ],
  },
  {
    id: 'review',
    title: '最終確認',
    subtitle: '内容を確認してから書類を出力してください。',
    custom: 'review',
    fields: [],
  },
];

export function getScreen(id) {
  return SCREENS.find((s) => s.id === id) || null;
}

export function getVisibleScreens(state) {
  return SCREENS.filter((s) => (s.visibleIf ? s.visibleIf(state) : true));
}

export function getNextScreenId(currentId, state) {
  const visible = getVisibleScreens(state);
  const idx = visible.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx === visible.length - 1) return null;
  return visible[idx + 1].id;
}

export function getPrevScreenId(currentId, state) {
  const visible = getVisibleScreens(state);
  const idx = visible.findIndex((s) => s.id === currentId);
  if (idx <= 0) return null;
  return visible[idx - 1].id;
}

export function getVisibleFields(screen, state) {
  return (screen.fields || []).filter((f) => (f.visibleIf ? f.visibleIf(state) : true));
}
