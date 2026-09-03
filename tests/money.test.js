// money.js のテスト
assertEqual(parseDecimalToFixed('12.5', 4), 125000n, 'parse 12.5 scale4');
assertEqual(parseDecimalToFixed('0', 4), 0n, 'parse 0 scale4 (0は空欄ではない)');
assertEqual(parseDecimalToFixed('abc', 4), null, 'parse invalid');
assertEqual(parseDecimalToFixed('1.23456', 4), null, 'parse too many decimals -> null (要拒否)');

assertEqual(fixedToDecimalString(125000n, 4), '12.5000', 'fixedToDecimalString basic');
assertEqual(fixedToDecimalString(0n, 2), '0.00', 'fixedToDecimalString zero');
assertEqual(fixedToDecimalString(-500n, 2), '-5.00', 'fixedToDecimalString negative');

// ROUND(2.5, 0) => 3 (四捨五入、0から遠い方向)
assertEqual(roundHalfUp(25n, 1, 0), 3n, 'roundHalfUp 2.5 -> 3');
assertEqual(roundHalfUp(15n, 1, 0), 2n, 'roundHalfUp 1.5 -> 2');
assertEqual(roundHalfUp(-25n, 1, 0), -3n, 'roundHalfUp -2.5 -> -3');
assertEqual(roundHalfUp(1234n, 2, 0), 12n, 'roundHalfUp 12.34 -> 12');

// 数量3 x 単価333.333333(4桁までなので333.3333) JPY(小数0)
{
  const r = calcLineAmount('3', '333.3333', 0);
  assertTrue(r.ok, 'calcLineAmount ok (JPY)');
  // 3 * 333.3333 = 999.9999 -> ROUND(.,0) = 1000
  assertEqual(r.amountStr, '1000', 'calcLineAmount JPY rounding');
}

// USD: qty 3, price 0.125 -> 0.375 -> round to 2 decimals = 0.38 (切り上げ, 半分は切り上げ)
{
  const r = calcLineAmount('3', '0.125', 2);
  assertTrue(r.ok, 'calcLineAmount ok (USD)');
  assertEqual(r.amountStr, '0.38', 'calcLineAmount USD half-up rounding');
}

// 数量が0以下はエラー
{
  const r = calcLineAmount('0', '10', 2);
  assertTrue(!r.ok && r.error === 'quantity_not_positive', 'calcLineAmount rejects qty<=0');
}

// 単価が負数はエラー
{
  const r = calcLineAmount('1', '-5', 2);
  assertTrue(!r.ok && r.error === 'unit_price_negative', 'calcLineAmount rejects negative price');
}

// 送料込み価格に運賃を二重加算しない: freightIncluded の場合は charges に運賃を含めない
{
  const lineAmounts = [
    calcLineAmount('2', '100', 2).amount, // 200.00
    calcLineAmount('1', '50', 2).amount, // 50.00
  ];
  const totalsNoDouble = calcTotals(lineAmounts, [], 2); // 運賃は商品価格に含まれている想定 -> chargesに入れない
  assertEqual(totalsNoDouble.totalStr, '250.00', 'calcTotals: no double counting when freight included in price');

  const totalsWithFreight = calcTotals(
    lineAmounts,
    [parseDecimalToFixed('20', 2)],
    2
  );
  assertEqual(totalsWithFreight.totalStr, '270.00', 'calcTotals: separate freight added once');
}

summary();
