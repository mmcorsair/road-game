#!/bin/sh
# Runs tests.html in headless Chrome and prints the results. Exits non-zero if any test fails.
# Usage: tests/run.sh        (or just open tests.html in a browser)
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=120000 \
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
