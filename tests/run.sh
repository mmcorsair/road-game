#!/bin/sh
# Runs tests.html in headless Chrome and prints the results, then checks index.html (the real, minified
# player bundle) loads without JavaScript errors. Exits non-zero if anything fails.
# Usage: tests/run.sh        (or just open tests.html in a browser)
# Env: CHROME — path to Chrome (default: the macOS app); CHROME_FLAGS — extra flags, e.g. --no-sandbox on CI.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
# shellcheck disable=SC2086  # CHROME_FLAGS is intentionally split into separate flags
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=120000 $CHROME_FLAGS \
  --dump-dom "file://$PWD/tests.html" 2>/dev/null | python3 -c '
import sys, re, html
dom = sys.stdin.read()
summary = re.search(r"data-summary=\"([^\"]*)\"", dom)
if not summary:
    sys.exit("Tests did not finish (check the browser console in tests.html).")
for m in re.finditer(r"<li class=\"fail\">(.*?)</li>", dom, re.S):
    print("  " + html.unescape(" ".join(re.sub(r"<[^>]+>", " ", m.group(1)).split())))
print(html.unescape(summary.group(1)))
sys.exit(0 if "data-result=\"pass\"" in dom else 1)
'

# Smoke test: the real page — with the minified player bundle — must load and run without JavaScript errors.
SMOKE_PAGE="${SMOKE_PAGE:-index.html}"
# shellcheck disable=SC2086
errors=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=3000 $CHROME_FLAGS \
  --enable-logging=stderr --v=0 --dump-dom "file://$PWD/$SMOKE_PAGE" 2>&1 >/dev/null | grep "CONSOLE" | grep -i "error\|uncaught" || true)
if [ -n "$errors" ]; then
  echo "❌ $SMOKE_PAGE has JavaScript errors:"
  echo "$errors"
  exit 1
fi
echo "✅ $SMOKE_PAGE loads and runs without errors"
