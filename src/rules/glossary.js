// 初心者向けの用語解説。「詳しく見る」に折りたたんで表示する。
// 一般的な定義の説明であり、個別の取引・国・配送会社ごとの要件については
// 出典付きの requirementNotes（rules/requirementNotes.js）や、相手・配送会社への確認に委ねる。
export const GLOSSARY = Object.freeze({
  commercial_invoice: {
    term: 'Commercial Invoice（インボイス／商業送り状）',
    explanation:
      '実際に代金が発生する取引で使う請求書兼納品書のような書類です。輸出入の通関手続きで、税関が関税や税金を計算するために使います。',
  },
  proforma_invoice: {
    term: 'Proforma Invoice（プロフォーマ・インボイス）',
    explanation:
      'まだ正式な取引になる前の「見積用の仮の請求書」です。価格や条件を相手に確認してもらうため、または通関上の申告価額を示すために使われます。金額が0円という意味ではありません。',
  },
  consignee: {
    term: 'Consignee（コンサイニー）',
    explanation: '荷物の届け先として指定される人・会社です。買主と同じ場合も、倉庫など別の場所になる場合もあります。',
  },
  importer: {
    term: 'Importer（輸入者）',
    explanation:
      '輸入国side で通関手続きを行う責任者です。買主・配送先と同じ場合もありますが、輸入代行会社など別の会社になることもあります。わからない場合は、相手（買主）に「通関は誰が行いますか」と確認してください。',
  },
  hs_code: {
    term: 'HSコード（Harmonized System Code）',
    explanation:
      '世界共通の商品分類番号です（世界税関機構が管理）。関税率や輸入規制の判定に使われます。商品によって桁数や細分が国ごとに異なるため、正確なコードは商品の仕様を確認したうえで税関や通関業者に確認するのが確実です。',
  },
  origin_country: {
    term: '原産国（Country of Origin）',
    explanation:
      '商品が実際に製造・生産された国です。「発送する国（今回は日本）」ではなく、「作られた国」を指します。日本製ではなく他国製の商品を日本から発送する場合、原産国は日本以外になることがあります。',
  },
  incoterms: {
    term: 'Incoterms（インコタームズ）',
    explanation:
      '輸送費・保険・危険負担を売主と買主のどちらが、どこまで負担するかを示す国際ルールです（ICC制定）。「送料をどちらが払うか」だけでなく、危険がどこで移転するかも定義します。合意していない場合は無理に決めず、相手と確認してください。',
  },
  net_weight: {
    term: '正味重量（Net Weight）',
    explanation: '梱包材（箱・緩衝材など）を除いた、商品そのものだけの重さです。',
  },
  gross_weight: {
    term: '総重量（Gross Weight）',
    explanation: '梱包材を含めた、実際に発送する荷物全体の重さです。正味重量より必ず大きいか同じになります。',
  },
  sku: {
    term: 'SKU（商品管理番号）',
    explanation: '自社で商品を管理するための番号です。無い場合は空欄のままで構いません。',
  },
});

export function glossaryEntry(key) {
  return GLOSSARY[key] || null;
}
