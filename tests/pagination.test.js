function makeItems(n, descLen = 10) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({ descriptionEn: { value: 'x'.repeat(descLen) } });
  }
  return arr;
}

// 0件でも空ページを作らず1ページ
{
  const pages = paginateItems([]);
  assertEqual(pages.length, 1, '0件 -> 1ページ');
  assertEqual(pages[0].items.length, 0, '0件ページの商品数は0');
}

// 1件
{
  const pages = paginateItems(makeItems(1));
  assertEqual(pages.length, 1, '1件 -> 1ページ');
  assertEqual(pages[0].items.length, 1, '1件ページの商品数');
}

// 10件 -> ちょうど1ページ
{
  const pages = paginateItems(makeItems(10));
  assertEqual(pages.length, 1, '10件 -> 1ページ');
  assertEqual(pages[0].items.length, 10, '10件が1ページに収まる');
}

// 11件 -> 2ページ
{
  const pages = paginateItems(makeItems(11));
  assertEqual(pages.length, 2, '11件 -> 2ページ');
  assertEqual(pages[0].items.length, 10, '1ページ目10件');
  assertEqual(pages[1].items.length, 1, '2ページ目1件');
}

// 30件 -> 3ページ
{
  const pages = paginateItems(makeItems(30));
  assertEqual(pages.length, 3, '30件 -> 3ページ');
  assertEqual(pages[0].items.length + pages[1].items.length + pages[2].items.length, 30, '30件の合計が一致');
}

// 31件 -> 4ページ（テンプレートの30商品上限をアプリの制限にしない）
{
  const pages = paginateItems(makeItems(31));
  assertEqual(pages.length, 4, '31件 -> 4ページ（上限を超えても分割できる）');
  const total = pages.reduce((s, p) => s + p.items.length, 0);
  assertEqual(total, 31, '31件の合計が一致');
}

// 長い説明文があるとページあたりの商品数が減る（行を分断しない）
{
  const items = makeItems(10, 200); // 200文字の説明 x 10件
  const pages = paginateItems(items);
  assertTrue(pages.length > 1, '長文説明があると10件が複数ページに分かれる');
  for (const p of pages) {
    assertTrue(p.items.length <= 10, '1ページの商品数は10件を超えない');
  }
}

// 全ページの合計が常に一致する（商品が増減しても）
{
  for (const n of [1, 9, 10, 11, 19, 20, 21, 29, 30, 31, 45]) {
    const items = makeItems(n);
    const pages = paginateItems(items);
    const total = pages.reduce((s, p) => s + p.items.length, 0);
    assertEqual(total, n, `n=${n}件の合計が一致`);
    assertTrue(pages.every((p) => p.items.length > 0) || n === 0, `n=${n}件で空ページが無い`);
  }
}

summary();
