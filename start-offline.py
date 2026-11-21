"""Serve the extracted game on the same local origin on every launch (Python 3)."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent
ADDRESS = ("127.0.0.1", 8018)
URL = "http://127.0.0.1:8018/"

class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map,
                          **{".mjs": "text/javascript", ".wasm": "application/wasm",
                             ".webmanifest": "application/manifest+json"})

if __name__ == "__main__":
    handler = partial(GameHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(ADDRESS, handler)
    except OSError as error:
        raise SystemExit(f"无法启动本机服务，请检查 8018 端口。 {error}")
    print(f"水果大口吃  {URL}  ·  按 Ctrl+C 退出", flush=True)
    threading.Timer(.35, webbrowser.open, args=(URL,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
