"""Minimal server to serve the static index.html on Toolforge."""
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(os.environ.get("PORT", 8000))
httpd = HTTPServer(("0.0.0.0", port), SimpleHTTPRequestHandler)
print(f"Serving on port {port}")
httpd.serve_forever()
