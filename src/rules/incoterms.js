// Incoterms（貿易条件）の一覧。
// 出典: International Chamber of Commerce "Incoterms® 2020"（2020年発効の11規則）。
// ここでは用語の一般的な意味のみを説明する。個別取引での適用可否・指定地の妥当性は
// 相手・フォワーダーへの確認が必要（このアプリは法的判定を行わない）。
export const INCOTERMS_SOURCE = 'ICC Incoterms® 2020（一般的な定義。個別適用は要確認）';

export const INCOTERMS_2020 = Object.freeze([
  { code: 'EXW', name: 'Ex Works', ja: '工場渡し', note: '買主が工場等の指定場所で商品を引き取り、以降の費用・危険をすべて負担する。' },
  { code: 'FCA', name: 'Free Carrier', ja: '運送人渡し', note: '売主が指定した場所で運送人に商品を引き渡した時点で危険が移転する。' },
  { code: 'CPT', name: 'Carriage Paid To', ja: '輸送費込み', note: '売主が指定仕向地までの運賃を負担するが、危険は引渡し時点で移転する。' },
  { code: 'CIP', name: 'Carriage and Insurance Paid To', ja: '輸送費保険料込み', note: 'CPTに加え、売主が保険を付保する。' },
  { code: 'DAP', name: 'Delivered at Place', ja: '仕向地持込渡し', note: '指定仕向地まで売主が費用・危険を負担する（荷卸し前）。' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', ja: '荷卸込持込渡し', note: '指定仕向地で荷卸しまで売主が行う。' },
  { code: 'DDP', name: 'Delivered Duty Paid', ja: '関税込み持込渡し', note: '輸入通関・関税も含め売主がすべて負担する。' },
  { code: 'FAS', name: 'Free Alongside Ship', ja: '船側渡し', note: '指定船積港で本船の船側に置いた時点で危険が移転する（海上輸送のみ）。' },
  { code: 'FOB', name: 'Free on Board', ja: '本船渡し', note: '指定船積港で本船に積み込んだ時点で危険が移転する（海上輸送のみ）。' },
  { code: 'CFR', name: 'Cost and Freight', ja: '運賃込み', note: '売主が仕向港までの運賃を負担するが、危険は船積み時点で移転する（海上輸送のみ）。' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', ja: '運賃保険料込み', note: 'CFRに加え、売主が保険を付保する（海上輸送のみ）。' },
]);

export function findIncoterm(code) {
  if (!code) return null;
  return INCOTERMS_2020.find((t) => t.code === String(code).toUpperCase()) || null;
}
