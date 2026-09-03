#!/usr/bin/env python3
"""Node.js が無い開発環境向けの簡易テストランナー。
ES module の export 文を取り除いた上で複数の .js ファイルを連結し、
macOS 標準の JavaScriptCore (osascript -l JavaScript) で実行する。
"""
import re
import subprocess
import sys
import tempfile
import os

EXPORT_RE = re.compile(r"^export\s+(function|const|class|let)\s", re.MULTILINE)
EXPORT_BARE_RE = re.compile(r"^export\s*\{[^}]*\}\s*;?\s*$", re.MULTILINE)


def strip_exports(src: str) -> str:
    src = EXPORT_RE.sub(r"\1 ", src)
    src = EXPORT_BARE_RE.sub("", src)
    src = re.sub(r"^import .*$", "", src, flags=re.MULTILINE)
    return src


def run(source_files, test_file):
    combined = []
    for f in source_files:
        with open(f, encoding="utf-8") as fh:
            combined.append(f"// ==== {os.path.basename(f)} ====\n" + strip_exports(fh.read()))
    with open(test_file, encoding="utf-8") as fh:
        combined.append(f"// ==== {os.path.basename(test_file)} ====\n" + strip_exports(fh.read()))
    script = "\n\n".join(combined)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
        tmp.write(script)
        tmp_path = tmp.name
    try:
        result = subprocess.run(
            ["osascript", "-l", "JavaScript", tmp_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        print(result.stdout, end="")
        if result.returncode != 0 or result.stderr.strip():
            print(result.stderr, file=sys.stderr, end="")
        return result.returncode
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: jscore_run.py <source.js> [<source2.js> ...] <test.js>")
        sys.exit(2)
    *sources, test = sys.argv[1:]
    rc = run(sources, test)
    sys.exit(0 if rc == 0 else 1)
