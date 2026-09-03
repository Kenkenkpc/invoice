// totals.js のテスト
function setField(field, value, status) {
  return { ...field, value, status: status || 'filled', source: 'user' };
}

{
  const state = createInitialState();
  state.shipping.currency = setField(state.shipping.currency, 'USD');
  state.shipping.currencyDecimals = setField(state.shipping.currencyDecimals, 2);
  state.shipping.freightIncludedInPrice = setField(state.shipping.freightIncludedInPrice, true);
  state.charges.freight = setField(state.charges.freight, '20');

  const item1 = createItem('i1');
  item1.quantity = setField(item1.quantity, '2');
  item1.unitPrice = setField(item1.unitPrice, '100');
  const item2 = createItem('i2');
  item2.quantity = setField(item2.quantity, '1');
  item2.unitPrice = setField(item2.unitPrice, '50');
  state.items.push(item1, item2);

  const totals = computeTotals(state);
  assertEqual(totals.subtotalStr, '250.00', '小計: 2*100+1*50=250');
  // 送料込み(freightIncludedInPrice=true)なので charges.freight は加算しない
  assertEqual(totals.totalStr, '250.00', '送料込みのため二重加算されない');
}

{
  const state = createInitialState();
  state.shipping.currency = setField(state.shipping.currency, 'USD');
  state.shipping.currencyDecimals = setField(state.shipping.currencyDecimals, 2);
  state.shipping.freightIncludedInPrice = setField(state.shipping.freightIncludedInPrice, false);
  state.charges.freight = setField(state.charges.freight, '20');

  const item1 = createItem('i1');
  item1.quantity = setField(item1.quantity, '2');
  item1.unitPrice = setField(item1.unitPrice, '100');
  state.items.push(item1);

  const totals = computeTotals(state);
  assertEqual(totals.subtotalStr, '200.00', '小計: 2*100=200');
  assertEqual(totals.totalStr, '220.00', '送料別途の場合は加算される');
}

// 数量の単位が異なる商品同士は数量を合算しない（明細ごとの金額のみ合計する）
{
  const state = createInitialState();
  state.shipping.currency = setField(state.shipping.currency, 'JPY');
  state.shipping.currencyDecimals = setField(state.shipping.currencyDecimals, 0);

  const item1 = createItem('i1');
  item1.unit = setField(item1.unit, 'pcs');
  item1.quantity = setField(item1.quantity, '3');
  item1.unitPrice = setField(item1.unitPrice, '1000');
  const item2 = createItem('i2');
  item2.unit = setField(item2.unit, 'kg');
  item2.quantity = setField(item2.quantity, '2');
  item2.unitPrice = setField(item2.unitPrice, '500');
  state.items.push(item1, item2);

  const totals = computeTotals(state);
  // 3*1000 + 2*500 = 4000 （単位が違っても数量3+2=5のような誤った合算をしない）
  assertEqual(totals.subtotalStr, '4000', 'JPYは小数0桁、単位混在でも明細ごとの金額のみ合計');
  assertEqual(state.items.length, 2, '商品件数は2件のまま（数量を合算していない）');
}

summary();
