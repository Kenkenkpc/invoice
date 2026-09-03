// 参照テンプレート（Google スプレッドシート: export-invoice-template）と
// アプリ内部データモデルの対応表。
//
// 出典: プロジェクトの Google ドライブに保存された実ファイルを
// 2026-09-03 に取得し、Header/Items シートの実セルと数式を確認して作成した
// （assets/export-invoice-template.reference.xlsx に同一内容を保存）。
// セル番地はこのファイル1箇所にだけ書き、UI側のコードやプロンプト文言には出さない。

/** Header シートは A列=field_key, B列=value の縦持ち（key/value）構造。 */
export const HEADER_ROW = Object.freeze({
  invoice_type: 3, // COMMERCIAL / PROFORMA
  invoice_number: 4,
  invoice_date: 5,
  currency: 6,
  currency_decimals: 7,
  payment_terms: 8,
  incoterms: 9,
  purpose_of_export: 10,
  po_number: 11,
  valid_until: 12,
  shipping_date: 13,
  shipping_method: 14,
  carrier_tracking: 15,
  export_country: 16,
  destination_country: 17,
  exporter_company: 18,
  exporter_address: 19,
  exporter_contact: 20,
  exporter_tax_id: 21,
  buyer_company: 22,
  buyer_address: 23,
  buyer_contact: 24,
  buyer_tax_id: 25,
  ship_to_company: 26,
  ship_to_address: 27,
  ship_to_contact: 28,
  importer_company: 29,
  importer_address: 30,
  importer_tax_id: 31,
  number_of_packages: 32,
  package_type: 33,
  net_weight: 34,
  gross_weight: 35,
  weight_unit: 36,
  freight_charge: 37,
  insurance_charge: 38,
  other_charge: 39,
  remarks: 40,
  signatory_name: 41,
  signatory_title: 42,
  commercial_declaration: 43,
  proforma_declaration: 44,
  document_status: 45,
  // 47以降は自動計算セル（アプリからは書き込まない。読み取り検証にのみ使用）
  item_count: 48,
  pages: 49,
  subtotal: 50,
  total: 51,
  item_errors: 52,
  basic_check: 53,
});

export const HEADER_VALUE_COLUMN = 'B';

/** Items シートは 3〜32 行 = 商品1〜30、列は下記の通り。 */
export const ITEMS_FIRST_ROW = 3;
export const ITEMS_MAX_ROWS_IN_TEMPLATE = 30; // 既存3シート(Invoice_1〜3)がそのまま使える上限
export const ITEMS_LAST_ROW = ITEMS_FIRST_ROW + ITEMS_MAX_ROWS_IN_TEMPLATE - 1; // 32

export const ITEMS_COLUMN = Object.freeze({
  sku: 'A',
  description: 'B',
  hs_code: 'C',
  origin_country: 'D',
  quantity: 'E',
  unit: 'F',
  unit_price: 'G',
  net_weight: 'H',
  gross_weight: 'I',
  weight_unit: 'J',
  line_total: 'K', // 数式: =IF(OR(B=,E=,G=),"",ROUND(E*G,Header!$B$7))  ※アプリからは書かない
  memo: 'L',
  check: 'M', // 数式（アプリからは書かない）
  position: 'N', // 数式（アプリからは書かない）
});

/** 1ページ（Invoice_1〜3の各シート）に表示できる商品行数。 */
export const ITEMS_PER_PRINT_PAGE = 10;

/** テンプレートに最初から存在する印刷用シート数。31商品目以降はシートを複製して拡張する。 */
export const BUILT_IN_INVOICE_SHEETS = ['Invoice_1', 'Invoice_2', 'Invoice_3'];

export const SHEET_NAMES = Object.freeze({
  guide: 'Guide',
  header: 'Header',
  items: 'Items',
});

/**
 * Header の各キーに対応する行番号を返す。
 * @param {keyof typeof HEADER_ROW} key
 */
export function headerCell(key) {
  const row = HEADER_ROW[key];
  if (!row) throw new Error(`unknown header key: ${key}`);
  return `${HEADER_VALUE_COLUMN}${row}`;
}

/**
 * Items の行・列からセル番地を返す（1商品目 = index 0）。
 * @param {number} itemIndex 0始まり
 * @param {keyof typeof ITEMS_COLUMN} columnKey
 */
export function itemCell(itemIndex, columnKey) {
  const col = ITEMS_COLUMN[columnKey];
  if (!col) throw new Error(`unknown items column: ${columnKey}`);
  return `${col}${ITEMS_FIRST_ROW + itemIndex}`;
}
