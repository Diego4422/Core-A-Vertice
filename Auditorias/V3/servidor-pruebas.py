from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from pathlib import Path
from functools import partial
import time

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path=urlsplit(self.path).path
        prefix,_,remaining=path.lstrip('/').partition('/')
        if prefix in ('http404','http500','json-roto','esquema','lento'):
            if remaining=='data/productos.json':
                if prefix in ('http404','http500'):
                    self.send_error(int(prefix[4:]))
                    return
                if prefix in ('json-roto','esquema'):
                    payload=b'{"roto":' if prefix=='json-roto' else b'[]'
                    self.send_response(200)
                    self.send_header('Content-Type','application/json')
                    self.send_header('Content-Length',str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return
                time.sleep(1.2)
            self.path='/'+remaining
        super().do_GET()

root = Path(__file__).resolve().parents[2] / 'V3-Catalog'
ThreadingHTTPServer(('127.0.0.1', 8769), partial(Handler, directory=str(root))).serve_forever()
