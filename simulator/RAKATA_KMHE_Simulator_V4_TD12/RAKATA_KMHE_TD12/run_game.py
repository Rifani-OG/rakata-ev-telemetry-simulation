"""Portable launcher; put beside RAKATA_TD10_Trainer.html. Python 3, no packages."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import threading
import webbrowser
import sys

root = Path(__file__).resolve().parent
page = root / 'RAKATA_TD10_Trainer.html'
if not page.is_file():
    print('RAKATA_TD10_Trainer.html tidak ditemukan. Ekstrak seluruh ZIP dahulu.')
    sys.exit(1)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
try:
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(root)))
except OSError as error:
    print('Port tidak tersedia:', error)
    print('Tutup launcher lama, atau jalankan: python run_game.py 8766')
    sys.exit(1)
url = 'http://localhost:%d/RAKATA_TD10_Trainer.html' % port
print('RAKATA TD10 Driver Game V3\nBuka di Chrome / Edge: '+url)
print('Biarkan terminal terbuka. Ctrl+C untuk menutup server lokal.')
threading.Timer(1, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
