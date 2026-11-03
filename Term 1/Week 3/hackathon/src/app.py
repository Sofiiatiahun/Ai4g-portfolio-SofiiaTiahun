import os
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from config import GEMINI_API_KEY, DEFAULT_MODEL
from gemini_client import call_gemini_api
from samples import SAMPLE_LABS

INDEX_PATH = os.path.join(os.path.dirname(__file__), "templates", "index.html")
PORT = 8080

class LabBridgeHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            if not os.path.isfile(INDEX_PATH):
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Template not found")
                return
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        elif parsed.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
        elif parsed.path == "/api/samples":
            self._send_json(200, SAMPLE_LABS)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/analyze":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(body)
            text = payload.get("text", "")
            model = payload.get("model", DEFAULT_MODEL)
            api_key = payload.get("api_key", GEMINI_API_KEY)

            result_text, meta = call_gemini_api(text, api_key=api_key, model_name=model)
            if meta.get("status") in ("validation_error", "configuration_error"):
                self._send_json(400, {"error": result_text})
            else:
                self._send_json(200, {"result": result_text, "meta": meta})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

def main():
    HTTPServer.allow_reuse_address = True
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, LabBridgeHandler)
    print(f"LabBridge Student running at http://localhost:{PORT} (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == "__main__":
    main()
