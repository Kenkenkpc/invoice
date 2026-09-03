// A4印刷・PDF用のページ割りロジック。
// テンプレート（Invoice_1〜3固定・1ページ10商品）はGoogle Sheets出力の下敷きとして使うが、
// アプリ内プレビュー・印刷ではこの30商品/3ページという上限をアプリ全体の制限にはしない。
// 1商品の説明が長い場合でもページ途中で行を分断しないよう、行数見積りで束ねる。

export const BASE_ITEMS_PER_PAGE = 10;
// 1商品あたりの説明はおおよそ何文字で1行相当とみなすか（テンプレートGuideの「110文字目安」を参考値とする）
const CHARS_PER_LINE = 55;
// 1ページに収められる「行」の目安（商品説明の折り返し込み）。通常10商品×1行=10行を基準に余裕を持たせる。
const LINE_BUDGET_PER_PAGE = 18;

function estimateLines(item) {
  const desc = (item?.descriptionEn?.value || item?.name?.value || '').toString();
  return Math.max(1, Math.ceil(desc.length / CHARS_PER_LINE));
}

/**
 * 商品配列からページ構成を計算する。
 * - 空ページを作らない（商品0件でも最低1ページ）
 * - 1ページの商品数は基本10件だが、説明が長い場合はそれより少なくなることがある
 * - 1商品の行を分断しない（丸ごと次ページへ送る）
 * @param {Array<any>} items
 * @returns {Array<{pageNumber:number, totalPages:number, items:Array<any>, startIndex:number}>}
 */
export function paginateItems(items) {
  const list = items || [];
  if (list.length === 0) {
    return [{ pageNumber: 1, totalPages: 1, items: [], startIndex: 0 }];
  }

  const pages = [];
  let current = [];
  let currentLines = 0;
  let startIndex = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const lines = estimateLines(item);
    const wouldExceedLineBudget = currentLines + lines > LINE_BUDGET_PER_PAGE && current.length > 0;
    const wouldExceedCountCap = current.length >= BASE_ITEMS_PER_PAGE;
    if (wouldExceedLineBudget || wouldExceedCountCap) {
      pages.push({ items: current, startIndex });
      current = [];
      currentLines = 0;
      startIndex = i;
    }
    current.push(item);
    currentLines += lines;
  }
  if (current.length > 0 || pages.length === 0) {
    pages.push({ items: current, startIndex });
  }

  const totalPages = pages.length;
  return pages.map((p, idx) => ({
    pageNumber: idx + 1,
    totalPages,
    items: p.items,
    startIndex: p.startIndex,
  }));
}
