// 金額計算：浮動小数点誤差を避けるため、内部では常に BigInt の固定小数点で計算する。
// テンプレート(Header!B7 = currency_decimals, Items!K = ROUND(E*G, Header!B7)) と
// 同じ丸め方（四捨五入 = ROUND）を再現する。

/** 数量・単価の内部演算スケール（小数4桁まで対応: テンプレートの "単価は小数4桁以内" 要件） */
export const INPUT_SCALE = 4;

/** 通貨ごとの既定小数桁数（Header!B7 の初期値相当）。ユーザーは変更できる。 */
export const CURRENCY_DEFAULT_DECIMALS = Object.freeze({
  JPY: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  KRW: 0,
  CNY: 2,
  AUD: 2,
  CAD: 2,
  HKD: 2,
  SGD: 2,
  TWD: 0,
});

export function defaultDecimalsForCurrency(code) {
  if (!code) return 2;
  const key = String(code).toUpperCase();
  return Object.prototype.hasOwnProperty.call(CURRENCY_DEFAULT_DECIMALS, key)
    ? CURRENCY_DEFAULT_DECIMALS[key]
    : 2;
}

/**
 * 十進文字列 or 数値を BigInt 固定小数点（指定スケール）に変換する。
 * 不正な形式は null を返す（例外にせず、呼び出し側で「形式エラー」として扱えるようにする）。
 * @param {string|number} input
 * @param {number} scale
 * @returns {bigint|null}
 */
export function parseDecimalToFixed(input, scale) {
  if (input === null || input === undefined || input === '') return null;
  const str = typeof input === 'number' ? String(input) : String(input).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(str);
  if (!match) return null;
  const [, sign, intPart, fracPartRaw = ''] = match;
  if (fracPartRaw.length > scale) {
    // 指定スケールを超える小数は「切り捨てず不正」として扱う（呼び出し側で丸め要否を判断）
    return null;
  }
  const fracPart = fracPartRaw.padEnd(scale, '0');
  const magnitude = BigInt(intPart + fracPart);
  return sign === '-' ? -magnitude : magnitude;
}

/** BigInt 固定小数点を十進文字列に変換する。 */
export function fixedToDecimalString(value, scale) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const str = abs.toString().padStart(scale + 1, '0');
  const intPart = str.slice(0, str.length - scale) || '0';
  const fracPart = scale > 0 ? '.' + str.slice(str.length - scale) : '';
  return (negative ? '-' : '') + intPart + fracPart;
}

/**
 * 四捨五入（Excel/Sheets の ROUND と同じ: 0から遠い方向への四捨五入）で
 * fromScale の固定小数点値を toScale に変換する。
 */
export function roundHalfUp(value, fromScale, toScale) {
  if (toScale >= fromScale) {
    return value * 10n ** BigInt(toScale - fromScale);
  }
  const divisor = 10n ** BigInt(fromScale - toScale);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const quotient = abs / divisor;
  const remainder = abs % divisor;
  const roundedUp = remainder * 2n >= divisor ? quotient + 1n : quotient;
  return negative ? -roundedUp : roundedUp;
}

/**
 * 数量 × 単価 → 明細金額（通貨の小数桁で四捨五入）。
 * テンプレートの Items!K = ROUND(E*G, Header!B7) と同じ計算。
 * @param {string|number} quantityStr
 * @param {string|number} unitPriceStr
 * @param {number} currencyDecimals
 * @returns {{ok:boolean, amount:bigint|null, amountStr:string|null, error:string|null}}
 */
export function calcLineAmount(quantityStr, unitPriceStr, currencyDecimals) {
  const qty = parseDecimalToFixed(quantityStr, INPUT_SCALE);
  const price = parseDecimalToFixed(unitPriceStr, INPUT_SCALE);
  if (qty === null) return { ok: false, amount: null, amountStr: null, error: 'quantity_invalid' };
  if (price === null) return { ok: false, amount: null, amountStr: null, error: 'unit_price_invalid' };
  if (qty <= 0n) return { ok: false, amount: null, amountStr: null, error: 'quantity_not_positive' };
  if (price < 0n) return { ok: false, amount: null, amountStr: null, error: 'unit_price_negative' };
  const rawScale = INPUT_SCALE * 2;
  const raw = qty * price; // scale = INPUT_SCALE*2
  const amount = roundHalfUp(raw, rawScale, currencyDecimals);
  return { ok: true, amount, amountStr: fixedToDecimalString(amount, currencyDecimals), error: null };
}

/**
 * 明細金額群 + 追加費用（運賃・保険・その他）を合計する。
 * 追加費用は「商品価格に含まれていない」金額のみを渡すこと（二重加算防止は呼び出し側の責務）。
 * @param {bigint[]} lineAmounts 各明細金額（すでに currencyDecimals で丸め済み）
 * @param {bigint[]} charges 追加費用（同じく currencyDecimals 表現）
 * @param {number} currencyDecimals
 */
export function calcTotals(lineAmounts, charges, currencyDecimals) {
  const subtotal = lineAmounts.reduce((a, b) => a + b, 0n);
  const chargesSum = charges.reduce((a, b) => a + b, 0n);
  // テンプレート: total = ROUND(subtotal + SUM(charges), decimals)。既に同一スケールなので丸めは恒等だが
  // 将来的に異なるスケールの値が混ざっても安全なように明示的に丸める。
  const total = roundHalfUp(subtotal + chargesSum, currencyDecimals, currencyDecimals);
  return {
    subtotal,
    chargesSum,
    total,
    subtotalStr: fixedToDecimalString(subtotal, currencyDecimals),
    chargesSumStr: fixedToDecimalString(chargesSum, currencyDecimals),
    totalStr: fixedToDecimalString(total, currencyDecimals),
  };
}

/** 表示用フォーマット（桁区切りなし、常に小数桁を揃える）。 */
export function formatMoney(amountStr, currencyDecimals) {
  if (amountStr === null || amountStr === undefined) return '';
  const value = parseDecimalToFixed(amountStr, currencyDecimals);
  if (value === null) return amountStr;
  return fixedToDecimalString(value, currencyDecimals);
}
