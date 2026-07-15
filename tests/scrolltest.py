"""Scroll the live site in headless Edge via CDP and capture frames around the hero pin boundary."""
import base64, json, os, subprocess, sys, time, urllib.request

import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.dirname(os.path.abspath(__file__))
PORT = 9333
URL = sys.argv[1] if len(sys.argv) > 1 else "https://killerwhale90.github.io/kamin-anapa/"

proc = subprocess.Popen([
    EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
    "--force-device-scale-factor=1", "--window-size=1400,900",
    "--user-data-dir=" + os.path.join(OUT, "cdpprof"),
    "about:blank",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    ws_url = None
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
                tabs = json.load(r)
            pages = [t for t in tabs if t.get("type") == "page"]
            if pages:
                ws_url = pages[0]["webSocketDebuggerUrl"]
                break
        except Exception:
            pass
        time.sleep(0.3)
    if not ws_url:
        print("FAIL: no debug target"); sys.exit(1)

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
        r = cmd("Runtime.evaluate", expression=expr, returnByValue=True)
        return r.get("result", {}).get("value")

    cmd("Page.enable")
    cmd("Runtime.enable")
    cmd("Page.navigate", url=URL)
    time.sleep(8)  # load + fonts + video poster

    total = js("document.documentElement.scrollHeight")
    print("scrollHeight:", total)

    # wheel-scroll smoothly through the hero pin (~ first 3.2 viewports)
    # capture a frame every ~250ms alongside scroll position
    frames = []
    steps = 46
    for i in range(steps):
        cmd("Input.dispatchMouseEvent", type="mouseWheel", x=700, y=450,
            deltaX=0, deltaY=120)
        time.sleep(0.12)
        if i % 3 == 2:
            y = js("Math.round(window.scrollY)")
            fade = js("(function(){var f=document.querySelector('.hero__fadeout');return f?getComputedStyle(f).opacity:'-'})()")
            vid = js("(function(){var v=document.querySelector('.hero__video');if(!v)return '-';var s=getComputedStyle(v);return s.transform.slice(0,60)+' | opacity '+s.opacity})()")
            shot = cmd("Page.captureScreenshot", format="jpeg", quality=60)
            fn = os.path.join(OUT, f"f{i:02d}_y{y}.jpg")
            with open(fn, "wb") as fh:
                fh.write(base64.b64decode(shot["data"]))
            frames.append((i, y, fade))
            print(f"step {i:02d} scrollY={y} fadeout-opacity={fade} video={vid}")

    print("frames captured:", len(frames))
    ws.close()
finally:
    proc.terminate()
