"""Verify: reload always lands at top (hash stripped); fresh navigation with hash still anchors."""
import json, os, subprocess, sys, time, urllib.request

import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.dirname(os.path.abspath(__file__))
PORT = 9335
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8010/"

proc = subprocess.Popen([
    EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
    "--force-device-scale-factor=1", "--window-size=1400,900",
    "--user-data-dir=" + os.path.join(OUT, "cdpprof3"),
    "about:blank",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    ws_url = None
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
                pages = [t for t in json.load(r) if t.get("type") == "page"]
            if pages:
                ws_url = pages[0]["webSocketDebuggerUrl"]
                break
        except Exception:
            pass
        time.sleep(0.3)
    ws = websocket.create_connection(ws_url, timeout=30)
    mid = [0]

    def cmd(method, **params):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                return msg.get("result", {})

    def js(expr):
        return cmd("Runtime.evaluate", expression=expr, returnByValue=True).get("result", {}).get("value")

    cmd("Page.enable"); cmd("Runtime.enable")

    # 1. plain load, scroll down, reload -> expect top
    cmd("Page.navigate", url=BASE); time.sleep(6)
    js("window.scrollTo(0, 3000)"); time.sleep(1)
    print("before reload scrollY:", js("Math.round(window.scrollY)"))
    cmd("Page.reload"); time.sleep(7)
    print("after reload scrollY:", js("Math.round(window.scrollY)"), "(expect ~0)")

    # 2. fresh navigation WITH hash -> expect anchored (non-zero)
    cmd("Page.navigate", url=BASE + "#contact"); time.sleep(6)
    y = js("Math.round(window.scrollY)")
    print("fresh nav to #contact scrollY:", y, "(expect > 1000)")

    # 3. reload that hash page -> expect top and hash gone
    cmd("Page.reload"); time.sleep(7)
    print("after reload scrollY:", js("Math.round(window.scrollY)"), "hash:", repr(js("location.hash")), "(expect ~0 and '')")
    ws.close()
finally:
    proc.terminate()
