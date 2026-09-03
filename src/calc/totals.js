import { hasValue } from '../domain/types.js';
import { calcLineAmount, calcTotals, defaultDecimalsForCurrency, parseDecimalToFixed } from '../domain/money.js';

/**
 * 現在の入力から、明細金額・小計・総額を計算する。
 * 送料込み価格の場合は charges.freight を合計に加えない（呼び出し側 = このロジックが担保する）。
 * 数量の単位が異なる商品同士は合算しない（明細ごとの金額のみを合計する。数量自体は合算しない）。
 */
export function computeTotals(state) {
  const currency = state.shipping.currency?.value || '';
  const decimals = hasValue(state.shipping.currencyDecimals)
    ? Number(state.shipping.currencyDecimals.value)
    : defaultDecimalsForCurrency(currency);

  const lineResults = (state.items || []).map((item) => {
    if (!hasValue(item.quantity) || !hasValue(item.unitPrice)) {
      return { item, ok: false, amount: 0n, amountStr: null };
    }
    const r = calcLineAmount(item.quantity.value, item.unitPrice.value, decimals);
    if (!r.ok) return { item, ok: false, amount: 0n, amountStr: null, error: r.error };
    return { item, ok: true, amount: r.amount, amountStr: r.amountStr };
  });

  const validLineAmounts = lineResults.filter((l) => l.ok).map((l) => l.amount);

  const freightIncluded = state.shipping.freightIncludedInPrice?.value === true;
  const chargeFields = [];
  // 商品価格に運賃が含まれている場合、charges.freight は「別途請求する追加運賃」ではないため
  // 合計に加えない（二重加算防止）。含まれていない場合のみ加算する。
  if (!freightIncluded && hasValue(state.charges.freight)) {
    const v = parseDecimalToFixed(state.charges.freight.value, decimals);
    if (v !== null) chargeFields.push(v);
  }
  if (hasValue(state.charges.insurance)) {
    const v = parseDecimalToFixed(state.charges.insurance.value, decimals);
    if (v !== null) chargeFields.push(v);
  }
  if (hasValue(state.charges.other)) {
    const v = parseDecimalToFixed(state.charges.other.value, decimals);
    if (v !== null) chargeFields.push(v);
  }

  const totals = calcTotals(validLineAmounts, chargeFields, decimals);

  return {
    currency,
    decimals,
    lineResults,
    freightIncludedInPrice: freightIncluded,
    subtotalStr: totals.subtotalStr,
    chargesSumStr: totals.chargesSumStr,
    totalStr: totals.totalStr,
    itemCount: (state.items || []).length,
    validItemCount: validLineAmounts.length,
  };
}
