"""Fast-flick through the hero pin and sample fadeout opacity vs scroll position.
Bug reproduced if scrollY is past pin end while fadeout is still translucent."""
import json, os, subprocess, sys, time, urllib.request

import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.dirname(os.path.abspath(__file__))
PORT = 9334
URL = sys.argv[1] if len(sys.argv) > 1 else "https://killerwhale90.github.io/kamin-anapa/"

proc = subprocess.Popen([
    EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
    "--force-device-scale-factor=1", "--window-size=1400,900",
    "--user-data-dir=" + os.path.join(OUT, "cdpprof2"),
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

    cmd("Page.enable")
    cmd("Runtime.enable")
    cmd("Page.navigate", url=URL)
    time.sleep(8)

    # violent flick: big wheel deltas in quick succession
    for _ in range(10):
        cmd("Input.dispatchMouseEvent", type="mouseWheel", x=700, y=450, deltaX=0, deltaY=600)
        time.sleep(0.03)

    # sample during the coast/catch-up phase
    worst = None
    for _ in range(40):
        v = js("JSON.stringify([Math.round(window.scrollY), (function(){var f=document.querySelector('.hero__fadeout');return f?+getComputedStyle(f).opacity:-1})()])")
        y, fade = json.loads(v)
        flag = "  <-- FLASH (past pin, video translucent)" if y > 1650 and fade < 0.93 else ""
        print(f"scrollY={y:5d} fadeout={fade:.3f}{flag}")
        if flag and (worst is None or fade < worst[1]):
            worst = (y, fade)
        time.sleep(0.07)

    print("RESULT:", ("REPRODUCED worst fade=%.3f at y=%d" % (worst[1], worst[0])) if worst else "no flash detected")
    ws.close()
finally:
    proc.terminate()
