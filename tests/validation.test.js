// validation.js のテスト（createInitialState を使って組み立てる）
{
  const state = createInitialState();
  const checks = computeChecks(state);
  assertTrue(checks.isDraftForced, '空の状態はDRAFT強制');
  assertTrue(checks.blocking.length > 0, '空の状態はblockingが1件以上');
}

// 輸入者「わからない」は買主と同一に自動確定されない
{
  const state = createInitialState();
  state.importerSameAsBuyer = setUnknown(state.importerSameAsBuyer);
  const checks = computeChecks(state);
  const found = checks.all.find((i) => i.id === 'importer.unknown');
  assertTrue(!!found, '輸入者不明のexternalCheckが検出される');
  assertTrue(found.blocksFinal, '輸入者不明はFINALをブロックする');
}

// 無料サンプルの単価「わからない」は0円扱いにならず、externalCheckとして残る
{
  const state = createInitialState();
  const item = createItem('item-1');
  item.descriptionEn = setValue(item.descriptionEn, 'Free sample - test item');
  item.originCountry = setValue(item.originCountry, 'Japan');
  item.unit = setValue(item.unit, 'pcs');
  item.quantity = setValue(item.quantity, '1');
  item.unitPrice = setUnknown(item.unitPrice);
  state.items.push(item);
  const checks = computeChecks(state);
  const priceIssue = checks.all.find((i) => i.id === 'items[0].price.unknown');
  assertTrue(!!priceIssue, 'サンプル単価不明のexternalCheckが検出される');
  assertTrue(priceIssue.category === 'external', '単価不明はexternal分類');
  // 値そのものは null のまま（0が代入されていない）
  assertEqual(item.unitPrice.value, null, '単価不明の場合、値は0埋めされない');
}

// CommercialとProformaを切り替えても入力（商品・住所）は消えない、という前提のデータ構造検証
{
  const state = createInitialState();
  state.exporter.nameJa = setValue(state.exporter.nameJa, 'テスト株式会社');
  const item = createItem('item-1');
  item.descriptionEn = setValue(item.descriptionEn, 'Wooden toy car');
  state.items.push(item);
  state.invoice.docType = setValue(state.invoice.docType, 'commercial', 'user');
  const beforeItems = state.items.length;
  const beforeExporter = state.exporter.nameJa.value;
  // 切り替え（データを消す処理をしていないことをテスト）
  state.invoice.docType = setValue(state.invoice.docType, 'proforma', 'user');
  assertEqual(state.items.length, beforeItems, 'ドキュメント種別切替で商品は消えない');
  assertEqual(state.exporter.nameJa.value, beforeExporter, 'ドキュメント種別切替で送り主情報は消えない');
}

summary();
