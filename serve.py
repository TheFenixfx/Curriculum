import http.server
import socketserver
import os

os.chdir(r"E:\Curriculum\Curriculum\_site")
PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("0.0.0.0", PORT), Handler)
print(f"Serving at http://localhost:{PORT}/", flush=True)
httpd.serve_forever()
