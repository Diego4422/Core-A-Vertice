from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from os import environ
from pathlib import Path
import time
from urllib.parse import urlsplit


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        prefix, _, asset = path.lstrip('/').partition('/')
        baseline = prefix.startswith('base-')
        scenario = prefix.removeprefix('base-')
        alternative = environ.get('VERTICE_BASE_DIR')
        if baseline and not alternative:
            self.send_error(404, 'Falta VERTICE_BASE_DIR')
            return
        scenarios = {
            'normal', 'http404', 'http500', 'json-roto', 'esquema', 'lento',
            'modulo-lento', 'carga-lenta', 'sin-modulo', 'sin-importacion',
        }
        if scenario in scenarios:
            if (asset, scenario) in {('js/main.js', 'sin-modulo'), ('js/data.js', 'sin-importacion')}:
                self.send_error(404)
                return
            if asset == 'js/main.js' and scenario in ('modulo-lento', 'carga-lenta'):
                time.sleep(0.85)
            if asset == 'data/productos.json':
                if scenario in ('http404', 'http500'):
                    self.send_error(int(scenario[4:]))
                    return
                if scenario in ('json-roto', 'esquema'):
                    payload = b'{"roto":' if scenario == 'json-roto' else b'[]'
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return
                if scenario in ('lento', 'carga-lenta'):
                    time.sleep(1.2)
            self.path = '/' + asset

        if baseline and alternative and (asset or 'index.html') in ('index.html', 'css/styles.css', 'js/main.js'):
            self.directory = alternative
        super().do_GET()


root = Path(__file__).resolve().parents[2] / 'V3-Catalog'
ThreadingHTTPServer(('127.0.0.1', 8769), partial(Handler, directory=str(root))).serve_forever()
