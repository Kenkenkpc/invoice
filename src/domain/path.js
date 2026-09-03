// ドットパス（例: "exporter.postalCode", "items[0].unitPrice"）でstateを読み書きする。
const TOKEN_RE = /([^.[\]]+)|\[(\d+)\]/g;

function tokens(path) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(path))) {
    out.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  }
  return out;
}

export function getByPath(obj, path) {
  let cur = obj;
  for (const t of tokens(path)) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[t];
  }
  return cur;
}

export function setByPath(obj, path, value) {
  const ts = tokens(path);
  let cur = obj;
  for (let i = 0; i < ts.length - 1; i++) {
    const t = ts[i];
    if (cur[t] === undefined || cur[t] === null) {
      cur[t] = typeof ts[i + 1] === 'number' ? [] : {};
    }
    cur = cur[t];
  }
  cur[ts[ts.length - 1]] = value;
  return obj;
}
