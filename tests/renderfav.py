"""Render favicon.svg to a transparent 512px PNG via CDP."""
import base64, json, os, subprocess, time, urllib.request

import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.dirname(os.path.abspath(__file__))
PORT = 9336

proc = subprocess.Popen([
    EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
    "--force-device-scale-factor=1", "--window-size=600,600",
    "--user-data-dir=" + os.path.join(OUT, "cdpprof4"),
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

    cmd("Page.enable")
    cmd("Emulation.setDefaultBackgroundColorOverride", color={"r": 0, "g": 0, "b": 0, "a": 0})
    cmd("Page.navigate", url="http://localhost:8010/assets/img/favicon.svg")
    time.sleep(3)
    # svg fills the viewport when opened directly; capture a 512 clip
    shot = cmd("Page.captureScreenshot", format="png",
               clip={"x": 44, "y": 44, "width": 512, "height": 512, "scale": 1})
    with open(os.path.join(OUT, "favicon-512.png"), "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    print("saved favicon-512.png")
    ws.close()
finally:
    proc.terminate()
