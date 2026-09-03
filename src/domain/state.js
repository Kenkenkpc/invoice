import { emptyField, EntityType, ExportPurpose, DocStatus } from './types.js';

/** @returns {import('./types.js').FieldMeta<any>} */
function f(initial = null) {
  return emptyField(initial);
}

export function createParty() {
  return {
    entityType: f(), // 'company' | 'individual'
    nameJa: f(), // 日本語の正式名称（原文のまま残す）
    nameEn: f(), // 英語表記（提案 or ユーザー確定）
    postalCode: f(),
    prefecture: f(),
    city: f(),
    addressLine: f(), // 番地・建物名・部屋番号
    country: f(), // ISO国名（ラベル+コード）
    contactName: f(),
    phone: f(),
    email: f(),
    taxRegistrationNumber: f(),
  };
}

export function createItem(id) {
  return {
    id,
    name: f(), // 商品名（日本語可）
    material: f(),
    purpose: f(), // 用途
    descriptionEn: f(), // 英語の商品説明（生成 or 手入力）
    quantity: f(),
    unit: f(),
    unitPrice: f(),
    originCountry: f(), // 製造された国
    sku: f(),
    hsCode: f(),
    hsCodeCandidates: [], // [{code, rationale, confirmed:boolean}]
    modelSerial: f(),
    netWeightKg: f(),
    grossWeightKg: f(),
  };
}

export function createInitialState() {
  const now = new Date().toISOString();
  return {
    meta: {
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
      currentScreenId: 'purpose',
      completedScreenIds: [],
    },
    invoice: {
      docType: f(), // 'commercial' | 'proforma'（提案 or 確定）
      docTypeReasons: [], // 候補とその理由の履歴
      docTypeSpecifiedByOther: f(), // 相手/配送会社の指定があったか
      invoiceNumber: f(),
      invoiceDate: f(),
      poNumber: f(),
      validUntil: f(), // Proforma有効期限
      remarks: f(),
      signatoryName: f(),
      signatoryTitle: f(),
      documentStatus: DocStatus.DRAFT,
    },
    purpose: {
      purpose: f(), // ExportPurpose
      willShip: f(), // boolean
      destinationCountry: f(),
      carrierDecided: f(), // boolean or 'unknown'
      carrierName: f(),
    },
    exporter: createParty(),
    buyer: createParty(),
    shipTo: createParty(),
    shipToSameAsBuyer: f(), // true/false/'unknown'
    importer: createParty(),
    importerSameAsBuyer: f(), // true/false/'unknown'
    shipping: {
      incotermCode: f(), // 例: 'FCA'
      incotermPlace: f(), // 指定地
      currency: f(),
      currencyDecimals: f(2),
      paymentTerms: f(),
      freightIncludedInPrice: f(), // boolean
      dutyTaxAgreement: f(), // 自由記述（合意内容のメモ）
      shippingMethod: f(), // Air/Sea/Courier
    },
    items: [],
    charges: {
      freight: f(), // 商品価格に含まれない追加運賃
      insurance: f(),
      other: f(),
    },
    packing: {
      numberOfPackages: f(),
      packageType: f(),
      netWeightKg: f(),
      grossWeightKg: f(),
      weightUnit: f('kg'),
      shipDate: f(),
      carrier: f(),
      trackingNumber: f(),
    },
    declarations: {
      commercialText: f(),
      proformaText: f('Proforma invoice for quotation purposes.'),
    },
    // unresolvedQuestions は保存せず、必要になるたびに rules/validation.js から算出する
    verificationStatus: {
      lastComputedAt: null,
      isDraft: true,
      blockingCount: 0,
    },
    exportHistory: [], // Google Sheets 出力の履歴（重複作成防止・再試行用）
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
