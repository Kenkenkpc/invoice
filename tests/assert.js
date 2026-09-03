// 超軽量アサーションヘルパー（Node無し環境のテスト用）
let __pass = 0;
let __fail = 0;
function __stringify(v) {
  return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() + 'n' : val));
}
function assertEqual(actual, expected, label) {
  const a = __stringify(actual);
  const e = __stringify(expected);
  if (a === e) {
    __pass++;
  } else {
    __fail++;
    console.log(`FAIL: ${label} — expected ${e}, got ${a}`);
  }
}
function assertTrue(cond, label) {
  if (cond) {
    __pass++;
  } else {
    __fail++;
    console.log(`FAIL: ${label}`);
  }
}
function summary() {
  console.log(`\n${__pass} passed, ${__fail} failed`);
  if (__fail > 0) {
    throw new Error(`${__fail} test(s) failed`);
  }
}
